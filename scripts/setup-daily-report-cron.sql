-- =====================================================
-- Setup Cron Jobs pentru Daily Report
-- Rulează acest script în Supabase SQL Editor
-- =====================================================

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Setează variabilele necesare pentru funcție
-- IMPORTANT: Înlocuiește cu valorile tale din Supabase Dashboard > Settings > API
DO $$
BEGIN
  -- Setează URL-ul proiectului
  PERFORM set_config('app.supabase_url', 'https://YOUR_PROJECT_ID.supabase.co', false);
  -- Setează service role key (din Dashboard > Settings > API > service_role key)
  PERFORM set_config('app.supabase_service_role_key', 'YOUR_SERVICE_ROLE_KEY', false);
END $$;

-- 3. Creează funcția care apelează Edge Function
CREATE OR REPLACE FUNCTION public.call_daily_report(report_date DATE DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  response_id bigint;
  request_body jsonb;
BEGIN
  -- Obține configurația
  SELECT value INTO supabase_url FROM vault.secrets WHERE name = 'supabase_url';
  SELECT value INTO service_role_key FROM vault.secrets WHERE name = 'service_role_key';

  -- Fallback la variabile de mediu dacă vault nu este configurat
  IF supabase_url IS NULL THEN
    supabase_url := current_setting('app.supabase_url', true);
  END IF;
  IF service_role_key IS NULL THEN
    service_role_key := current_setting('app.supabase_service_role_key', true);
  END IF;

  -- Construiește body-ul cererii
  request_body := jsonb_build_object('date', report_date::text);

  -- Apelează Edge Function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/daily-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    ),
    body := request_body
  ) INTO response_id;

  RETURN jsonb_build_object(
    'request_id', response_id,
    'date', report_date,
    'status', 'sent'
  );
END;
$$;

-- 4. Creează funcții wrapper pentru cron
-- Raport de seară (pentru ziua curentă)
CREATE OR REPLACE FUNCTION public.cron_daily_report_evening()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM call_daily_report(CURRENT_DATE);
END;
$$;

-- Raport de dimineață (pentru ziua anterioară - include intrările făcute seara/dimineața)
CREATE OR REPLACE FUNCTION public.cron_daily_report_morning()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Trimite raport pentru ziua anterioară (actualizat cu intrările din seară)
  PERFORM call_daily_report(CURRENT_DATE - INTERVAL '1 day');
END;
$$;

-- 5. Șterge cron jobs vechi dacă există
SELECT cron.unschedule('daily-report-evening') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-report-evening');
SELECT cron.unschedule('daily-report-morning') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-report-morning');

-- 6. Programează cron jobs
-- Ora 18:00 România (EET/EEST) = 16:00 UTC iarna / 15:00 UTC vara
-- Pentru simplitate, folosim 16:00 UTC (18:00 iarna, 19:00 vara)
SELECT cron.schedule(
  'daily-report-evening',
  '0 16 * * *',
  $$SELECT cron_daily_report_evening()$$
);

-- Ora 11:00 România = 9:00 UTC iarna / 8:00 UTC vara
-- Folosim 9:00 UTC
SELECT cron.schedule(
  'daily-report-morning',
  '0 9 * * *',
  $$SELECT cron_daily_report_morning()$$
);

-- 7. Verificare
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE 'daily-report%';

-- =====================================================
-- Comenzi utile pentru debugging
-- =====================================================

-- Vezi ultimele execuții cron:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Test manual (trimite raport pentru azi):
-- SELECT call_daily_report();

-- Test manual pentru o dată specifică:
-- SELECT call_daily_report('2026-01-29'::date);

-- Dezactivează temporar cron job:
-- UPDATE cron.job SET active = false WHERE jobname = 'daily-report-evening';

-- Reactivează cron job:
-- UPDATE cron.job SET active = true WHERE jobname = 'daily-report-evening';

-- Șterge complet cron job:
-- SELECT cron.unschedule('daily-report-evening');
