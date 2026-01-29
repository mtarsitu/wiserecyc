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

async function checkAcquisitions() {
  const { data: acquisitions } = await supabase
    .from('acquisitions')
    .select('id, receipt_number, location_type, contract_id, supplier:suppliers(name)')
    .eq('company_id', companyId)

  const withContract = acquisitions?.filter(a => a.contract_id !== null) || []
  const withoutContract = acquisitions?.filter(a => a.contract_id === null) || []
  const contractLocation = acquisitions?.filter(a => a.location_type === 'contract') || []

  console.log('Total achizitii:', acquisitions?.length)
  console.log('Cu contract_id setat:', withContract.length)
  console.log('Fara contract_id:', withoutContract.length)
  console.log('Cu location_type=contract:', contractLocation.length)

  // Get contracts
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, contract_number, supplier:suppliers(name)')
    .eq('company_id', companyId)

  console.log('\nContracte existente:', contracts?.length)
  contracts?.forEach(c => {
    const supplier = c.supplier as { name: string } | null
    console.log(' -', c.contract_number, '|', supplier?.name || 'N/A')
  })

  // Check if any acquisitions have supplier name matching contract
  console.log('\n=== Verificare potriviri furnizori cu contracte ===')
  const contractSuppliers = new Set(contracts?.map(c => {
    const supplier = c.supplier as { name: string } | null
    return supplier?.name?.toUpperCase()
  }).filter(Boolean))

  const acqWithContractSupplier = acquisitions?.filter(a => {
    const supplier = a.supplier as { name: string } | null
    return contractSuppliers.has(supplier?.name?.toUpperCase())
  }) || []

  console.log('Achizitii de la furnizori cu contract:', acqWithContractSupplier.length)
  console.log('Din care cu contract_id setat:', acqWithContractSupplier.filter(a => a.contract_id !== null).length)
  console.log('Din care FARA contract_id:', acqWithContractSupplier.filter(a => a.contract_id === null).length)

  // Show some examples
  const noContractId = acqWithContractSupplier.filter(a => a.contract_id === null)
  if (noContractId.length > 0) {
    console.log('\nExemple achizitii de la furnizori cu contract, dar fara contract_id:')
    noContractId.slice(0, 10).forEach(a => {
      const supplier = a.supplier as { name: string } | null
      console.log(' ', a.receipt_number?.padEnd(15) || 'N/A', '|', supplier?.name || 'N/A')
    })
  }
}

checkAcquisitions()
