# Daily Report Edge Function

Trimite rapoarte zilnice prin email cu statistici din dashboard.

## Setup

### 1. Configurare Resend

1. Creează cont pe [resend.com](https://resend.com)
2. Generează API Key din Dashboard → API Keys
3. Adaugă domeniul `wiserecyc.ro` în Resend (Domain Settings)
4. Setează secret-ul în Supabase:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 2. Deploy Function

```bash
supabase functions deploy daily-report
```

### 3. Test Manual

```bash
# Test pentru ziua curentă
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/daily-report \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Test pentru o dată specifică
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/daily-report \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-29"}'
```

### 4. Configurare Cron Jobs

În Supabase SQL Editor, rulează:

```sql
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to call Edge Function
CREATE OR REPLACE FUNCTION call_daily_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_id bigint;
BEGIN
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/daily-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO response_id;
END;
$$;

-- Cron job pentru ora 18:00 (EET = UTC+2, deci 16:00 UTC)
SELECT cron.schedule(
  'daily-report-evening',
  '0 16 * * *',  -- 16:00 UTC = 18:00 EET
  'SELECT call_daily_report()'
);

-- Cron job pentru ora 11:00 (EET = UTC+2, deci 9:00 UTC)
SELECT cron.schedule(
  'daily-report-morning',
  '0 9 * * *',  -- 9:00 UTC = 11:00 EET
  'SELECT call_daily_report()'
);

-- Verifică cron jobs programate
SELECT * FROM cron.job;
```

## Configurare Producție

Când ești gata pentru producție, modifică în `index.ts`:

```typescript
const TEST_MODE = false  // Schimbă din true în false
```

Acest lucru va trimite email-ul către:
- **TO:** raduadriancatalin@yahoo.com
- **BCC:** mario.tarsitu@gmail.com

## Conținut Email

Raportul include:
- 📈 Sumar zilnic (achiziții, vânzări, cheltuieli, încasări)
- 🛒 Achiziții detaliate pe categorii (Feroase, Neferoase, DEEE, Altele)
- 💰 Vânzări detaliate pe categorii
- 🔔 Notificări (furnizori/clienți fără CUI, contracte fără valoare, etc.)

## Troubleshooting

### Email nu ajunge
1. Verifică RESEND_API_KEY este setat corect
2. Verifică domeniul este verificat în Resend
3. Verifică logs: `supabase functions logs daily-report`

### Cron nu funcționează
1. Verifică pg_cron este activat: `SELECT * FROM cron.job;`
2. Verifică logs cron: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
