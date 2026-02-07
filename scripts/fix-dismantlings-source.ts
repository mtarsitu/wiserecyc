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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixDismantlingsSource() {
  console.log('=== Fixing Dismantlings Source Quantity ===\n')

  // Get all dismantlings with their outputs
  const { data: dismantlings, error } = await supabase
    .from('dismantlings')
    .select(`
      id,
      source_material_id,
      source_quantity,
      outputs:dismantling_outputs(
        id,
        material_id,
        quantity
      )
    `)

  if (error) {
    console.error('Error fetching dismantlings:', error)
    return
  }

  console.log(`Found ${dismantlings?.length || 0} dismantlings\n`)

  for (const dism of dismantlings || []) {
    // Calculate total output quantity
    const totalOutput = (dism.outputs || []).reduce((sum: number, out: any) => sum + (out.quantity || 0), 0)

    console.log(`Dismantling ${dism.id}:`)
    console.log(`  Current source_quantity: ${dism.source_quantity}`)
    console.log(`  Total outputs: ${totalOutput}`)

    if (dism.source_quantity !== totalOutput) {
      // Update source_quantity to match total outputs
      const { error: updateError } = await supabase
        .from('dismantlings')
        .update({ source_quantity: totalOutput })
        .eq('id', dism.id)

      if (updateError) {
        console.error(`  ERROR updating: ${updateError.message}`)
      } else {
        console.log(`  UPDATED source_quantity to ${totalOutput}`)
      }
    } else {
      console.log(`  Already correct, skipping`)
    }
    console.log('')
  }

  console.log('=== Done ===')
}

fixDismantlingsSource()
