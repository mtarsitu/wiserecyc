import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key) env[key.trim()] = val.join('=').trim()
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const companyId = '87ef7498-2f8c-4750-8c98-e9c96f30263e'

// Mapping of contract names to supplier names
const contractSupplierMapping: Record<string, string> = {
  'CFR 26.02.2025': 'CFR CALATORI BUCURESTI',
  'CFR CONSTANTA 2025': 'CFR 2023 CT',  // Folosim furnizorul CFR existent pentru Constanta
  'Consiliul Judetean Ilfov': 'CONSILIUL JUDETEAN ILFOV',
  'MUNICIPIUL VASLUI': 'MUNICIPIUL VASLUI',
}

async function fixContracts() {
  console.log('=== Corectare contracte si achizitii ===\n')

  // 1. Get suppliers
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('company_id', companyId)

  const supplierMap = new Map<string, string>()
  suppliers?.forEach(s => supplierMap.set(s.name.toUpperCase(), s.id))

  console.log('Furnizori gasiti:', suppliers?.length)

  // 2. Get contracts
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, contract_number, supplier_id')
    .eq('company_id', companyId)

  console.log('Contracte gasit:', contracts?.length)
  console.log('')

  // 3. Link contracts to suppliers
  console.log('=== Legare contracte la furnizori ===')
  for (const contract of contracts || []) {
    const supplierName = contractSupplierMapping[contract.contract_number]
    if (!supplierName) {
      console.log('SKIP: Nu am mapping pentru contract:', contract.contract_number)
      continue
    }

    const supplierId = supplierMap.get(supplierName.toUpperCase())
    if (!supplierId) {
      console.log('SKIP: Furnizor negasit pentru:', supplierName)
      continue
    }

    if (contract.supplier_id === supplierId) {
      console.log('OK: Contract', contract.contract_number, 'deja legat de', supplierName)
      continue
    }

    const { error } = await supabase
      .from('contracts')
      .update({ supplier_id: supplierId })
      .eq('id', contract.id)

    if (error) {
      console.log('EROARE:', contract.contract_number, error.message)
    } else {
      console.log('ACTUALIZAT: Contract', contract.contract_number, '->', supplierName)
    }
  }

  // Refresh contracts with supplier info
  const { data: updatedContracts } = await supabase
    .from('contracts')
    .select('id, contract_number, supplier_id')
    .eq('company_id', companyId)

  const contractBySupplier = new Map<string, string>()
  updatedContracts?.forEach(c => {
    if (c.supplier_id) contractBySupplier.set(c.supplier_id, c.id)
  })

  // 4. Link acquisitions to contracts
  console.log('\n=== Legare achizitii la contracte ===')

  const { data: acquisitions } = await supabase
    .from('acquisitions')
    .select('id, receipt_number, supplier_id, contract_id, location_type')
    .eq('company_id', companyId)

  let updated = 0
  for (const acq of acquisitions || []) {
    if (acq.contract_id) continue // Already has contract
    if (!acq.supplier_id) continue // No supplier

    const contractId = contractBySupplier.get(acq.supplier_id)
    if (!contractId) continue // Supplier doesn't have a contract

    const { error } = await supabase
      .from('acquisitions')
      .update({
        contract_id: contractId,
        location_type: 'contract'
      })
      .eq('id', acq.id)

    if (error) {
      console.log('EROARE achizitie', acq.receipt_number, error.message)
    } else {
      updated++
    }
  }

  console.log('Achizitii actualizate:', updated)

  // 5. Summary
  console.log('\n=== SUMAR FINAL ===')

  const { data: finalContracts } = await supabase
    .from('contracts')
    .select('contract_number, supplier:suppliers(name)')
    .eq('company_id', companyId)

  console.log('\nContracte:')
  finalContracts?.forEach(c => {
    const supplier = c.supplier as { name: string } | null
    console.log(' -', c.contract_number, '|', supplier?.name || 'FARA FURNIZOR')
  })

  const { data: finalAcq } = await supabase
    .from('acquisitions')
    .select('id, contract_id')
    .eq('company_id', companyId)

  const withContract = finalAcq?.filter(a => a.contract_id !== null).length || 0
  const withoutContract = finalAcq?.filter(a => a.contract_id === null).length || 0

  console.log('\nAchizitii:')
  console.log(' - Cu contract:', withContract)
  console.log(' - Fara contract:', withoutContract)
}

fixContracts()
