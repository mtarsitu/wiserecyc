/**
 * Script pentru recalcularea stocurilor din achizitii, vanzari si dezmembrari
 *
 * Rulare: npx tsx scripts/fix-inventory.ts
 *
 * Ce face:
 * 1. Sterge toate inregistrarile din inventory
 * 2. Recalculeaza stocurile din acquisition_items (adauga)
 * 3. Scade cantitatile din sale_items
 * 4. Proceseaza dezmembrarile (scade material sursa, adauga materiale rezultate)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    })
  }
}

loadEnv()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const companyId = '87ef7498-2f8c-4750-8c98-e9c96f30263e'

interface InventoryKey {
  material_id: string
  location_type: string
  contract_id: string | null
}

function getKey(inv: InventoryKey): string {
  return `${inv.material_id}|${inv.location_type}|${inv.contract_id || 'null'}`
}

async function main() {
  console.log('=== Recalculare Stocuri ===\n')

  // Map to track inventory: key -> quantity
  const inventoryMap = new Map<string, {
    material_id: string
    location_type: string
    contract_id: string | null
    quantity: number
  }>()

  // Step 1: Get all acquisitions with their items
  console.log('1. Citire achizitii...')
  const { data: acquisitions, error: acqError } = await supabase
    .from('acquisitions')
    .select(`
      id,
      location_type,
      contract_id,
      items:acquisition_items(
        material_id,
        final_quantity
      )
    `)
    .eq('company_id', companyId)

  if (acqError) {
    console.error('Eroare citire achizitii:', acqError)
    return
  }

  console.log(`   Gasit ${acquisitions?.length || 0} achizitii`)

  // Process acquisitions - ADD to inventory
  let totalAcqItems = 0
  for (const acq of acquisitions || []) {
    const locationType = acq.location_type || 'curte'
    const contractId = locationType === 'contract' ? acq.contract_id : null

    for (const item of (acq.items as { material_id: string; final_quantity: number }[]) || []) {
      const key = getKey({
        material_id: item.material_id,
        location_type: locationType,
        contract_id: contractId
      })

      const existing = inventoryMap.get(key)
      if (existing) {
        existing.quantity += item.final_quantity
      } else {
        inventoryMap.set(key, {
          material_id: item.material_id,
          location_type: locationType,
          contract_id: contractId,
          quantity: item.final_quantity
        })
      }
      totalAcqItems++
    }
  }
  console.log(`   Procesat ${totalAcqItems} linii achizitii`)

  // Step 2: Get all sales with their items
  console.log('\n2. Citire vanzari...')
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`
      id,
      items:sale_items(
        material_id,
        final_quantity
      )
    `)
    .eq('company_id', companyId)

  if (salesError) {
    console.error('Eroare citire vanzari:', salesError)
    return
  }

  console.log(`   Gasit ${sales?.length || 0} vanzari`)

  // Process sales - SUBTRACT from inventory (always from 'curte')
  let totalSaleItems = 0
  for (const sale of sales || []) {
    for (const item of (sale.items as { material_id: string; final_quantity: number }[]) || []) {
      const key = getKey({
        material_id: item.material_id,
        location_type: 'curte',
        contract_id: null
      })

      const existing = inventoryMap.get(key)
      if (existing) {
        existing.quantity -= item.final_quantity
      } else {
        // If no acquisition for this material, create negative inventory
        inventoryMap.set(key, {
          material_id: item.material_id,
          location_type: 'curte',
          contract_id: null,
          quantity: -item.final_quantity
        })
      }
      totalSaleItems++
    }
  }
  console.log(`   Procesat ${totalSaleItems} linii vanzari`)

  // Step 3: Get all dismantlings with their outputs
  console.log('\n3. Citire dezmembrari...')
  const { data: dismantlings, error: dismError } = await supabase
    .from('dismantlings')
    .select(`
      id,
      location_type,
      contract_id,
      source_material_id,
      source_quantity,
      outputs:dismantling_outputs(
        material_id,
        quantity
      )
    `)
    .eq('company_id', companyId)

  if (dismError) {
    console.error('Eroare citire dezmembrari:', dismError)
    return
  }

  console.log(`   Gasit ${dismantlings?.length || 0} dezmembrari`)

  // Process dismantlings - SUBTRACT source material, ADD output materials
  let totalDismSourceItems = 0
  let totalDismOutputItems = 0
  for (const dism of dismantlings || []) {
    const locationType = dism.location_type || 'curte'
    const contractId = locationType === 'contract' ? dism.contract_id : null

    // SUBTRACT source material
    const sourceKey = getKey({
      material_id: dism.source_material_id,
      location_type: locationType,
      contract_id: contractId
    })

    const existingSource = inventoryMap.get(sourceKey)
    if (existingSource) {
      existingSource.quantity -= dism.source_quantity
    } else {
      inventoryMap.set(sourceKey, {
        material_id: dism.source_material_id,
        location_type: locationType,
        contract_id: contractId,
        quantity: -dism.source_quantity
      })
    }
    totalDismSourceItems++

    // ADD output materials
    for (const output of (dism.outputs as { material_id: string; quantity: number }[]) || []) {
      const outputKey = getKey({
        material_id: output.material_id,
        location_type: locationType,
        contract_id: contractId
      })

      const existingOutput = inventoryMap.get(outputKey)
      if (existingOutput) {
        existingOutput.quantity += output.quantity
      } else {
        inventoryMap.set(outputKey, {
          material_id: output.material_id,
          location_type: locationType,
          contract_id: contractId,
          quantity: output.quantity
        })
      }
      totalDismOutputItems++
    }
  }
  console.log(`   Procesat ${totalDismSourceItems} materiale sursa, ${totalDismOutputItems} materiale rezultate`)

  // Step 4: Clear existing inventory
  console.log('\n4. Stergere inventar existent...')
  const { error: deleteError } = await supabase
    .from('inventory')
    .delete()
    .eq('company_id', companyId)

  if (deleteError) {
    console.error('Eroare stergere inventar:', deleteError)
    return
  }
  console.log('   Inventar sters')

  // Step 5: Insert new inventory records
  console.log('\n5. Inserare inventar nou...')
  const inventoryRecords = Array.from(inventoryMap.values())
    .filter(inv => Math.abs(inv.quantity) > 0.001) // Ignore very small quantities
    .map(inv => ({
      company_id: companyId,
      material_id: inv.material_id,
      location_type: inv.location_type,
      contract_id: inv.contract_id,
      quantity: Math.round(inv.quantity * 100) / 100 // Round to 2 decimals
    }))

  if (inventoryRecords.length > 0) {
    // Insert in batches
    const batchSize = 100
    for (let i = 0; i < inventoryRecords.length; i += batchSize) {
      const batch = inventoryRecords.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('inventory')
        .insert(batch)

      if (insertError) {
        console.error(`Eroare inserare batch ${i}:`, insertError)
      }
    }
  }

  console.log(`   Inserat ${inventoryRecords.length} inregistrari inventar`)

  // Step 6: Summary
  console.log('\n=== Sumar ===')

  // Get material names for display
  const materialIds = [...new Set(inventoryRecords.map(r => r.material_id))]
  const { data: materials } = await supabase
    .from('materials')
    .select('id, name')
    .in('id', materialIds)

  const materialNames = new Map(materials?.map(m => [m.id, m.name]) || [])

  // Show top materials by quantity
  const sortedByQty = [...inventoryRecords]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20)

  console.log('\nTop 20 materiale in stoc:')
  for (const inv of sortedByQty) {
    const name = materialNames.get(inv.material_id) || 'Unknown'
    const location = inv.location_type === 'contract' ? `Contract ${inv.contract_id?.slice(0, 8)}` : inv.location_type
    console.log(`  ${name}: ${inv.quantity.toFixed(2)} kg (${location})`)
  }

  // Show negative inventory (problems)
  const negative = inventoryRecords.filter(r => r.quantity < 0)
  if (negative.length > 0) {
    console.log('\n⚠️  Stoc negativ (erori de date):')
    for (const inv of negative) {
      const name = materialNames.get(inv.material_id) || 'Unknown'
      console.log(`  ${name}: ${inv.quantity.toFixed(2)} kg`)
    }
  }

  console.log('\n✅ Inventar recalculat!')
}

main().catch(console.error)
