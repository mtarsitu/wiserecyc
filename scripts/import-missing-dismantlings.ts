/**
 * Script pentru importul dezmembrarilor lipsă din CSV (VASLUI 30.01.2026)
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

async function main() {
  console.log('=== Import Dezmembrări Lipsă (VASLUI 30.01.2026) ===\n')

  // 1. Find the contract for VASLUI
  console.log('1. Căutare contract VASLUI...')
  const { data: contracts, error: contractError } = await supabase
    .from('contracts')
    .select('id, contract_number')
    .eq('company_id', companyId)
    .ilike('contract_number', '%VASLUI%')

  if (contractError) {
    console.error('Eroare căutare contract:', contractError)
    return
  }

  if (!contracts || contracts.length === 0) {
    console.error('Nu am găsit contractul VASLUI!')

    // List all contracts to help debug
    const { data: allContracts } = await supabase
      .from('contracts')
      .select('id, contract_number')
      .eq('company_id', companyId)

    console.log('\nContracte existente:')
    for (const c of allContracts || []) {
      console.log(`  - ${c.contract_number}`)
    }
    return
  }

  const vasluiContract = contracts[0]
  console.log(`   Găsit: ${vasluiContract.contract_number} (${vasluiContract.id})`)

  // 2. Find materials (materials table doesn't have company_id)
  console.log('\n2. Căutare materiale...')
  const { data: materials } = await supabase
    .from('materials')
    .select('id, name')

  const materialMap = new Map<string, string>()
  for (const m of materials || []) {
    materialMap.set(m.name.toUpperCase(), m.id)
  }

  // Map CSV names to DB material names
  const materialNameMapping: Record<string, string> = {
    'FIER': 'FIER',
    'CUPRU': 'CUPRU',
    'ALAMA': 'ALAMA',
    'ALUMINIU': 'ALUMINIU',
    'CABLURI CUPRU': 'CABLURI CUPRU'  // Use exact DB name
  }

  const sourceMaterialId = materialMap.get('FIER')
  if (!sourceMaterialId) {
    console.error('Nu am găsit materialul FIER!')
    return
  }
  console.log(`   FIER: ${sourceMaterialId}`)

  // Outputs for VASLUI dismantling
  const outputs = [
    { csvName: 'CUPRU', quantity: 730 },
    { csvName: 'ALAMA', quantity: 60 },
    { csvName: 'ALUMINIU', quantity: 500 },
    { csvName: 'CABLURI CUPRU', quantity: 300 }
  ]

  // Find material IDs for outputs
  const outputsWithIds: { material_id: string; quantity: number; name: string }[] = []
  for (const out of outputs) {
    const dbName = materialNameMapping[out.csvName] || out.csvName
    let materialId = materialMap.get(dbName.toUpperCase())

    // Try alternative names
    if (!materialId) {
      for (const [name, id] of materialMap) {
        if (name.includes(dbName.toUpperCase()) || dbName.toUpperCase().includes(name)) {
          materialId = id
          break
        }
      }
    }

    if (!materialId) {
      console.error(`Nu am găsit materialul ${out.csvName} (${dbName})`)
      console.log('Materiale disponibile:', Array.from(materialMap.keys()))
      return
    }

    outputsWithIds.push({
      material_id: materialId,
      quantity: out.quantity,
      name: out.csvName
    })
  }

  console.log('   Materiale rezultate găsite:')
  for (const out of outputsWithIds) {
    console.log(`     - ${out.name}: ${out.quantity} kg`)
  }

  // 3. Calculate total output quantity (= source quantity for imports)
  const totalOutput = outputsWithIds.reduce((sum, o) => sum + o.quantity, 0)
  console.log(`\n3. Cantitate totală: ${totalOutput} kg`)

  // 4. Create the dismantling
  console.log('\n4. Creare dezmembrare...')

  const { data: dismantling, error: dismError } = await supabase
    .from('dismantlings')
    .insert({
      company_id: companyId,
      date: '2026-01-30',
      location_type: 'contract',
      contract_id: vasluiContract.id,
      source_material_id: sourceMaterialId,
      source_quantity: totalOutput,  // source = output for imports
      notes: 'Import din CSV - VASLUI'
    })
    .select()
    .single()

  if (dismError) {
    console.error('Eroare creare dezmembrare:', dismError)
    return
  }

  console.log(`   Creat: ${dismantling.id}`)

  // 5. Create outputs
  console.log('\n5. Creare materiale rezultate...')

  for (const out of outputsWithIds) {
    const { error: outputError } = await supabase
      .from('dismantling_outputs')
      .insert({
        dismantling_id: dismantling.id,
        material_id: out.material_id,
        quantity: out.quantity
      })

    if (outputError) {
      console.error(`Eroare creare output ${out.name}:`, outputError)
    } else {
      console.log(`   ${out.name}: ${out.quantity} kg`)
    }
  }

  console.log('\n✅ Dezmembrare importată cu succes!')
  console.log('\n⚠️  Rulează scripts/fix-inventory.ts pentru a recalcula stocurile.')
}

main().catch(console.error)
