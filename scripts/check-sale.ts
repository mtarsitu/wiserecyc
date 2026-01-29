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

async function checkSales() {
  // Get sales from 28.01.2026
  const { data: sales, error } = await supabase
    .from('sales')
    .select(`
      id,
      date,
      total_amount,
      status,
      notes,
      client:clients(name),
      items:sale_items(
        id,
        material_id,
        quantity,
        final_quantity,
        price_per_kg_ron,
        line_total,
        material:materials(name)
      )
    `)
    .eq('company_id', companyId)
    .gte('date', '2026-01-28')
    .lte('date', '2026-01-28')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('=== Vanzari din 28.01.2026 ===\n')
  console.log('Total gasite:', sales?.length || 0)

  for (let idx = 0; idx < (sales?.length || 0); idx++) {
    const sale = sales![idx]
    console.log('\n--- Vanzare', idx + 1, '---')
    console.log('ID:', sale.id)
    console.log('Data:', sale.date)
    console.log('Client:', (sale.client as any)?.name || 'N/A')
    console.log('Total:', sale.total_amount, 'RON')
    console.log('Status:', sale.status)
    console.log('Notes:', sale.notes || '-')
    console.log('Items:', sale.items?.length || 0)

    if (sale.items && sale.items.length > 0) {
      for (let i = 0; i < sale.items.length; i++) {
        const item = sale.items[i] as any
        console.log('  Item', i + 1 + ':', item.material?.name || 'N/A', '-', item.quantity, 'kg @', item.price_per_kg_ron, 'RON/kg =', item.line_total, 'RON')
      }
    } else {
      console.log('  ⚠️ FARA ITEMS!')
    }
  }

  // Also check if there are orphan sale_items
  console.log('\n\n=== Verificare sale_items orfane ===')
  const { data: allItems } = await supabase
    .from('sale_items')
    .select('id, sale_id')
    .order('created_at', { ascending: false })
    .limit(20)

  for (const item of allItems || []) {
    const { data: saleExists } = await supabase
      .from('sales')
      .select('id')
      .eq('id', item.sale_id)
      .single()

    if (!saleExists) {
      console.log('Orphan item:', item.id, 'sale_id:', item.sale_id)
    }
  }
}

checkSales()
