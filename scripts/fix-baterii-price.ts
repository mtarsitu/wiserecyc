/**
 * Fix BATERII AUTO sale price from 28.5 to 2.85 RON/kg
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(
  env.VITE_SUPABASE_URL || '',
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''
)

const companyId = '87ef7498-2f8c-4750-8c98-e9c96f30263e'

async function fix() {
  console.log('Cautare vanzari BATERII AUTO cu pret gresit (28.5 RON/kg)...\n')

  // Find the BATERII AUTO sale with wrong price (around 28.5 RON/kg)
  const { data: wrongSales } = await supabase
    .from('sale_items')
    .select('id, sale_id, quantity, price_per_kg_ron, line_total, material:materials(name), sale:sales(id, company_id, date, total_amount)')
    .gte('price_per_kg_ron', 28)
    .lte('price_per_kg_ron', 29)

  const bateriiSales = wrongSales?.filter(s =>
    s.material?.name === 'BATERII AUTO' &&
    (s.sale as any)?.company_id === companyId
  )

  if (!bateriiSales || bateriiSales.length === 0) {
    console.log('Nu s-au gasit vanzari BATERII AUTO cu pret gresit')
    return
  }

  console.log(`Vanzari BATERII AUTO cu pret gresit gasit: ${bateriiSales.length}`)

  for (const item of bateriiSales) {
    const sale = item.sale as any
    console.log(`\nCorectare: ${sale?.date} - ${item.quantity}kg`)
    console.log(`  Pret vechi: ${item.price_per_kg_ron} RON/kg = ${item.line_total} RON`)

    const newPricePerKg = 2.85
    const newLineTotal = item.quantity * newPricePerKg

    // Update sale_item
    const { error: itemError } = await supabase
      .from('sale_items')
      .update({
        price_per_kg_ron: newPricePerKg,
        line_total: newLineTotal
      })
      .eq('id', item.id)

    if (itemError) {
      console.log('  Eroare update item:', itemError.message)
      continue
    }

    // Update sale total_amount
    const { error: saleError } = await supabase
      .from('sales')
      .update({ total_amount: newLineTotal })
      .eq('id', item.sale_id)

    if (saleError) {
      console.log('  Eroare update sale:', saleError.message)
      continue
    }

    // Update cash transaction if exists
    const { data: cashTx } = await supabase
      .from('cash_transactions')
      .select('id, amount')
      .eq('source_type', 'sale')
      .eq('source_id', item.sale_id)
      .single()

    if (cashTx) {
      await supabase
        .from('cash_transactions')
        .update({ amount: newLineTotal })
        .eq('id', cashTx.id)
      console.log('  Cash transaction actualizat')
    }

    console.log(`  Pret nou: ${newPricePerKg} RON/kg = ${newLineTotal} RON`)
    console.log('  ✓ Corectat!')
  }

  console.log('\nGata!')
}

fix()
