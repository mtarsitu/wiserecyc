import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Company ID for ECO METAL COLECT
const COMPANY_ID = '87ef7498-2f8c-4750-8c98-e9c96f30263e'

// Email configuration
const TEST_MODE = true // Set to false when ready for production
const RECIPIENTS = {
  to: TEST_MODE ? 'mario.tarsitu@gmail.com' : 'raduadriancatalin@yahoo.com',
  bcc: TEST_MODE ? undefined : 'mario.tarsitu@gmail.com',
}

// Material categories
const MATERIAL_CATEGORIES: Record<string, 'feros' | 'neferos' | 'deee' | 'altele'> = {
  'Fier': 'feros',
  'Otel inoxidabil': 'feros',
  'Alama': 'neferos',
  'Aluminiu': 'neferos',
  'Bronz': 'neferos',
  'Cablu aluminiu': 'neferos',
  'Cablu cupru': 'neferos',
  'Cositor': 'neferos',
  'Cupru': 'neferos',
  'Nichel': 'neferos',
  'Plumb': 'neferos',
  'Radiatoare aluminiu': 'neferos',
  'Radiatoare cupru': 'neferos',
  'Zinc': 'neferos',
  'Motoare electrice': 'neferos',
  'Transformatoare': 'neferos',
  'Electronice (DEEE)': 'deee',
  'Baterii auto': 'deee',
  'Hartie/Carton': 'altele',
  'Plastic': 'altele',
}

const CATEGORY_LABELS: Record<string, string> = {
  feros: 'Feroase',
  neferos: 'Neferoase',
  deee: 'DEEE',
  altele: 'Altele',
}

interface Material {
  id: string
  name: string
  category?: string
}

interface AcquisitionItem {
  material_id: string
  quantity: number
  final_quantity?: number
  price_per_kg?: number
  line_total: number
  material?: Material
}

interface Acquisition {
  id: string
  date: string
  supplier_id: string
  acquisition_type?: string
  items?: AcquisitionItem[]
  supplier?: { name: string }
}

interface SaleItem {
  material_id: string
  quantity: number
  price_per_kg_ron?: number
  line_total_ron: number
  material?: Material
}

interface Sale {
  id: string
  date: string
  client_id: string
  items?: SaleItem[]
  client?: { name: string }
}

interface Expense {
  id: string
  name: string
  date: string
  amount: number
  type: string
  category_id?: string
}

function getMaterialCategory(material: Material): 'feros' | 'neferos' | 'deee' | 'altele' {
  if (material.category && ['feros', 'neferos', 'deee', 'altele'].includes(material.category)) {
    return material.category as 'feros' | 'neferos' | 'deee' | 'altele'
  }
  return MATERIAL_CATEGORIES[material.name] || 'altele'
}

function formatCurrency(value: number): string {
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON'
}

function formatQuantity(value: number): string {
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg'
}

function getTodayDateString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

async function sendEmail(to: string, subject: string, html: string, bcc?: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const emailData: Record<string, unknown> = {
    from: 'WiseRecyc <onboarding@resend.dev>',
    to: [to],
    subject,
    html,
  }

  if (bcc) {
    emailData.bcc = [bcc]
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send email: ${error}`)
  }

  return await response.json()
}

function generateEmailHTML(
  date: string,
  acquisitions: Acquisition[],
  sales: Sale[],
  expenses: Expense[],
  materials: Material[],
  notifications: { message: string; count: number }[]
): string {
  const materialMap = new Map<string, Material>()
  materials.forEach(m => materialMap.set(m.id, m))

  // Calculate acquisition stats by category
  // Nu mai filtram pe data - datele vin deja filtrate din query
  // Includem TOATE achizitiile (normal, zero, director) pentru statistici
  const acqStats: Record<string, { quantity: number; amount: number; items: { material: string; quantity: number; amount: number }[] }> = {
    feros: { quantity: 0, amount: 0, items: [] },
    neferos: { quantity: 0, amount: 0, items: [] },
    deee: { quantity: 0, amount: 0, items: [] },
    altele: { quantity: 0, amount: 0, items: [] },
  }

  console.log(`Processing ${acquisitions.length} acquisitions for date ${date}`)

  acquisitions.forEach(acq => {
    // Include all acquisitions, not just 'normal' type
    console.log(`Acquisition ${acq.id}: type=${acq.acquisition_type}, items=${acq.items?.length || 0}`)

    acq.items?.forEach(item => {
      const material = materialMap.get(item.material_id) || item.material
      if (!material) {
        console.log(`  Item skipped - no material found for ${item.material_id}`)
        return
      }

      const category = getMaterialCategory(material)
      const qty = item.final_quantity || item.quantity || 0
      const amt = item.line_total || 0

      console.log(`  Item: ${material.name}, qty=${qty}, amt=${amt}, cat=${category}`)

      acqStats[category].quantity += qty
      acqStats[category].amount += amt

      // Track per-material
      const existing = acqStats[category].items.find(i => i.material === material.name)
      if (existing) {
        existing.quantity += qty
        existing.amount += amt
      } else {
        acqStats[category].items.push({ material: material.name, quantity: qty, amount: amt })
      }
    })
  })

  // Calculate sales stats by category (including zero-price tracking)
  const saleStats: Record<string, { quantity: number; amount: number; zeroQuantity: number; items: { material: string; quantity: number; amount: number; zeroQuantity: number }[] }> = {
    feros: { quantity: 0, amount: 0, zeroQuantity: 0, items: [] },
    neferos: { quantity: 0, amount: 0, zeroQuantity: 0, items: [] },
    deee: { quantity: 0, amount: 0, zeroQuantity: 0, items: [] },
    altele: { quantity: 0, amount: 0, zeroQuantity: 0, items: [] },
  }

  console.log(`Processing ${sales.length} sales for date ${date}`)

  sales.forEach(sale => {
    console.log(`Sale ${sale.id}: items=${sale.items?.length || 0}`)

    sale.items?.forEach(item => {
      const material = materialMap.get(item.material_id) || item.material
      if (!material) {
        console.log(`  Item skipped - no material found for ${item.material_id}`)
        return
      }

      const category = getMaterialCategory(material)
      const qty = item.quantity || 0
      const amt = item.line_total_ron || 0
      const pricePerKg = item.price_per_kg_ron || 0
      const isZeroPrice = pricePerKg === 0 || amt === 0

      console.log(`  Item: ${material.name}, qty=${qty}, amt=${amt}, cat=${category}, zeroPrice=${isZeroPrice}`)

      saleStats[category].quantity += qty
      saleStats[category].amount += amt
      if (isZeroPrice) {
        saleStats[category].zeroQuantity += qty
      }

      const existing = saleStats[category].items.find(i => i.material === material.name)
      if (existing) {
        existing.quantity += qty
        existing.amount += amt
        if (isZeroPrice) {
          existing.zeroQuantity += qty
        }
      } else {
        saleStats[category].items.push({
          material: material.name,
          quantity: qty,
          amount: amt,
          zeroQuantity: isZeroPrice ? qty : 0
        })
      }
    })
  })

  // Calculate expense stats (excluding TRANSFER CASE)
  const filteredExpenses = expenses.filter(e => !e.name?.toUpperCase().includes('TRANSFER CASE'))
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.type === 'payment' ? (e.amount || 0) : 0), 0)
  const totalCollections = filteredExpenses.reduce((sum, e) => sum + (e.type === 'collection' ? (e.amount || 0) : 0), 0)

  console.log(`Expenses: ${filteredExpenses.length} total, payments=${totalExpenses}, collections=${totalCollections}`)

  // Total acquisitions and sales
  const totalAcqQuantity = Object.values(acqStats).reduce((sum, s) => sum + s.quantity, 0)
  const totalAcqAmount = Object.values(acqStats).reduce((sum, s) => sum + s.amount, 0)
  const totalSaleQuantity = Object.values(saleStats).reduce((sum, s) => sum + s.quantity, 0)
  const totalSaleAmount = Object.values(saleStats).reduce((sum, s) => sum + s.amount, 0)
  const totalSaleZeroQuantity = Object.values(saleStats).reduce((sum, s) => sum + s.zeroQuantity, 0)

  // Calculate overall average prices
  const avgAcqPrice = totalAcqQuantity > 0 ? totalAcqAmount / totalAcqQuantity : 0
  const avgSalePrice = totalSaleQuantity > 0 ? totalSaleAmount / totalSaleQuantity : 0

  console.log(`Totals: acq=${totalAcqQuantity}kg/${totalAcqAmount}RON, sales=${totalSaleQuantity}kg/${totalSaleAmount}RON`)

  // Generate HTML
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #3b82f6; margin-top: 20px; }
    .summary-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .stat-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: bold; color: #111827; }
    .stat-sub { font-size: 14px; color: #6b7280; }
    .stat-avg { font-size: 12px; color: #9ca3af; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .category-feros { border-left: 4px solid #6b7280; }
    .category-neferos { border-left: 4px solid #f59e0b; }
    .category-deee { border-left: 4px solid #22c55e; }
    .category-altele { border-left: 4px solid #3b82f6; }
    .notification { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 15px; margin: 5px 0; }
    .notification-count { background: #f59e0b; color: white; border-radius: 12px; padding: 2px 8px; font-size: 12px; margin-left: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
  </style>
</head>
<body>
  <h1>📊 Raport Zilnic - ECO METAL COLECT</h1>
  <p><strong>Data:</strong> ${formatDate(date)}</p>

  <div class="summary-box">
    <h2 style="margin-top: 0;">📈 Sumar Zilnic</h2>
    <div class="summary-grid">
      <div class="stat-card">
        <div class="stat-label">Achiziții</div>
        <div class="stat-value">${formatCurrency(totalAcqAmount)}</div>
        <div class="stat-sub">${formatQuantity(totalAcqQuantity)}</div>
        <div class="stat-avg">Preț mediu: ${formatCurrency(avgAcqPrice)}/kg</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Vânzări</div>
        <div class="stat-value">${formatCurrency(totalSaleAmount)}</div>
        <div class="stat-sub">${formatQuantity(totalSaleQuantity)}${totalSaleZeroQuantity > 0 ? ` <span class="negative">(${formatQuantity(totalSaleZeroQuantity)} la preț 0)</span>` : ''}</div>
        <div class="stat-avg">Preț mediu: ${formatCurrency(avgSalePrice)}/kg</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cheltuieli</div>
        <div class="stat-value negative">${formatCurrency(totalExpenses)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Încasări</div>
        <div class="stat-value positive">${formatCurrency(totalCollections)}</div>
      </div>
    </div>
  </div>

  ${totalAcqQuantity > 0 ? `
  <h2>🛒 Achiziții pe Categorii</h2>
  ${Object.entries(acqStats).filter(([_, s]) => s.quantity > 0).map(([cat, stats]) => `
    <div class="category-${cat}" style="padding-left: 15px; margin: 15px 0;">
      <h3>${CATEGORY_LABELS[cat]} - Preț mediu: ${formatCurrency(stats.quantity > 0 ? stats.amount / stats.quantity : 0)}/kg</h3>
      <p><strong>Total:</strong> ${formatQuantity(stats.quantity)} | ${formatCurrency(stats.amount)}</p>
      ${stats.items.length > 0 ? `
      <table>
        <tr><th>Material</th><th>Cantitate</th><th>Valoare</th><th>Preț mediu/kg</th></tr>
        ${stats.items.map(item => `
          <tr>
            <td>${item.material}</td>
            <td>${formatQuantity(item.quantity)}</td>
            <td>${formatCurrency(item.amount)}</td>
            <td>${formatCurrency(item.quantity > 0 ? item.amount / item.quantity : 0)}</td>
          </tr>
        `).join('')}
      </table>
      ` : ''}
    </div>
  `).join('')}
  ` : '<p><em>Nu au fost achiziții în această zi.</em></p>'}

  ${totalSaleQuantity > 0 ? `
  <h2>💰 Vânzări pe Categorii</h2>
  ${Object.entries(saleStats).filter(([_, s]) => s.quantity > 0).map(([cat, stats]) => `
    <div class="category-${cat}" style="padding-left: 15px; margin: 15px 0;">
      <h3>${CATEGORY_LABELS[cat]} - Preț mediu: ${formatCurrency(stats.quantity > 0 ? stats.amount / stats.quantity : 0)}/kg</h3>
      <p><strong>Total:</strong> ${formatQuantity(stats.quantity)} | ${formatCurrency(stats.amount)}${stats.zeroQuantity > 0 ? ` <span class="negative">(${formatQuantity(stats.zeroQuantity)} la preț 0)</span>` : ''}</p>
      ${stats.items.length > 0 ? `
      <table>
        <tr><th>Material</th><th>Cantitate</th><th>La preț 0</th><th>Valoare</th><th>Preț mediu/kg</th></tr>
        ${stats.items.map(item => `
          <tr>
            <td>${item.material}</td>
            <td>${formatQuantity(item.quantity)}</td>
            <td style="color: ${item.zeroQuantity > 0 ? '#ef4444' : '#22c55e'};">${item.zeroQuantity > 0 ? formatQuantity(item.zeroQuantity) : '-'}</td>
            <td>${formatCurrency(item.amount)}</td>
            <td>${formatCurrency(item.quantity > 0 ? item.amount / item.quantity : 0)}</td>
          </tr>
        `).join('')}
      </table>
      ` : ''}
    </div>
  `).join('')}
  ` : '<p><em>Nu au fost vânzări în această zi.</em></p>'}

  ${notifications.length > 0 ? `
  <h2>🔔 Notificări</h2>
  ${notifications.map(n => `
    <div class="notification">
      ${n.message} <span class="notification-count">${n.count}</span>
    </div>
  `).join('')}
  ` : ''}

  <div class="footer">
    <p>Acest raport a fost generat automat de sistemul WiseRecyc.</p>
    <p>Data generării: ${new Date().toLocaleString('ro-RO')}</p>
  </div>
</body>
</html>
  `
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get date from request body or use today
    // Supports: "yesterday", "today", or specific date like "2026-01-28"
    let targetDate = getTodayDateString()
    try {
      const body = await req.json()
      if (body.date) {
        if (body.date === 'yesterday') {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          targetDate = yesterday.toISOString().split('T')[0]
        } else if (body.date === 'today') {
          targetDate = getTodayDateString()
        } else {
          targetDate = body.date
        }
      }
    } catch {
      // No body or invalid JSON, use default
    }

    console.log(`Generating daily report for date: ${targetDate}`)

    // Fetch all required data
    const [
      { data: materials, error: matErr },
      { data: acquisitions, error: acqErr },
      { data: sales, error: saleErr },
      { data: expenses, error: expErr },
      { data: suppliers },
      { data: clients },
      { data: contracts },
    ] = await Promise.all([
      supabase.from('materials').select('*'),
      supabase
        .from('acquisitions')
        .select('*, items:acquisition_items(*, material:materials(*)), supplier:suppliers(name)')
        .eq('company_id', COMPANY_ID)
        .eq('date', targetDate),
      supabase
        .from('sales')
        .select('*, items:sale_items(*, material:materials(*)), client:clients(name)')
        .eq('company_id', COMPANY_ID)
        .eq('date', targetDate),
      supabase
        .from('expenses')
        .select('*')
        .eq('company_id', COMPANY_ID)
        .eq('date', targetDate),
      supabase.from('suppliers').select('id, name, cui').eq('company_id', COMPANY_ID).eq('is_active', true).is('cui', null),
      supabase.from('clients').select('id, name, cui').eq('company_id', COMPANY_ID).eq('is_active', true).is('cui', null),
      supabase.from('contracts').select('id, contract_number, value').eq('company_id', COMPANY_ID).or('value.is.null,value.eq.0'),
    ])

    // Log any errors
    if (matErr) console.error('Materials error:', matErr)
    if (acqErr) console.error('Acquisitions error:', acqErr)
    if (saleErr) console.error('Sales error:', saleErr)
    if (expErr) console.error('Expenses error:', expErr)

    console.log(`Fetched: ${materials?.length || 0} materials, ${acquisitions?.length || 0} acquisitions, ${sales?.length || 0} sales, ${expenses?.length || 0} expenses`)

    // Log first acquisition for debugging
    if (acquisitions && acquisitions.length > 0) {
      console.log('First acquisition:', JSON.stringify(acquisitions[0], null, 2))
    }

    // Generate notifications
    const notifications: { message: string; count: number }[] = []

    if (suppliers && suppliers.length > 0) {
      notifications.push({ message: 'Furnizori fără CUI', count: suppliers.length })
    }
    if (clients && clients.length > 0) {
      notifications.push({ message: 'Clienți fără CUI', count: clients.length })
    }
    if (contracts && contracts.length > 0) {
      notifications.push({ message: 'Contracte fără valoare', count: contracts.length })
    }

    // Expenses without category (excluding TRANSFER CASE)
    const expensesWithoutCategory = (expenses || []).filter(
      (e: Expense) => !e.category_id && !e.name?.toUpperCase().includes('TRANSFER CASE')
    )
    if (expensesWithoutCategory.length > 0) {
      notifications.push({ message: 'Cheltuieli fără categorie', count: expensesWithoutCategory.length })
    }

    // Generate email HTML
    const html = generateEmailHTML(
      targetDate,
      acquisitions || [],
      sales || [],
      expenses || [],
      materials || [],
      notifications
    )

    // Send email
    const subject = `📊 Raport Zilnic WiseRecyc - ${formatDate(targetDate)}`

    await sendEmail(RECIPIENTS.to, subject, html, RECIPIENTS.bcc)

    console.log(`Daily report sent successfully to ${RECIPIENTS.to}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily report sent successfully',
        date: targetDate,
        recipients: RECIPIENTS,
        stats: {
          acquisitions: acquisitions?.length || 0,
          sales: sales?.length || 0,
          expenses: expenses?.length || 0,
          notifications: notifications.length,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error generating daily report:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
