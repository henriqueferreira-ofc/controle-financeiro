-- 1) Limpar duplicatas existentes (mantém o registro mais antigo por chave)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, recurring_id, date, amount, type, description
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.transactions
  WHERE auto_generated = true
    AND recurring_id IS NOT NULL
)
DELETE FROM public.transactions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Índice único parcial: impede nova duplicação de recorrentes auto-geradas
CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurring_dedup_idx
  ON public.transactions (user_id, recurring_id, date)
  WHERE auto_generated = true AND recurring_id IS NOT NULL;

-- 3) Corrigir a função SQL: torná-la idempotente, gravar recurring_id e auto_generated
CREATE OR REPLACE FUNCTION public.apply_due_recurring_transactions(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  count_inserted INTEGER := 0;
  next_dt DATE;
  inserted_id UUID;
BEGIN
  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE user_id = _user_id
      AND active = true
      AND next_run <= CURRENT_DATE
      AND (end_date IS NULL OR next_run <= end_date)
  LOOP
    WHILE r.next_run <= CURRENT_DATE AND (r.end_date IS NULL OR r.next_run <= r.end_date) LOOP
      -- Respeita pausa
      IF r.paused_until IS NULL OR r.next_run > r.paused_until THEN
        -- Respeita skip_dates
        IF NOT (r.next_run = ANY(COALESCE(r.skip_dates, ARRAY[]::date[]))) THEN
          -- Inserção idempotente: ON CONFLICT pelo índice único
          INSERT INTO public.transactions
            (user_id, type, date, description, category, amount,
             essential, fixed, recurring, recurring_id, auto_generated)
          VALUES
            (r.user_id, r.type, r.next_run, r.description, r.category::text, r.amount,
             r.essential, r.fixed, true, r.id, true)
          ON CONFLICT (user_id, recurring_id, date)
            WHERE auto_generated = true AND recurring_id IS NOT NULL
          DO NOTHING
          RETURNING id INTO inserted_id;

          IF inserted_id IS NOT NULL THEN
            count_inserted := count_inserted + 1;
            inserted_id := NULL;
          END IF;
        END IF;
      END IF;

      next_dt := CASE r.frequency
        WHEN 'daily'   THEN r.next_run + INTERVAL '1 day'
        WHEN 'weekly'  THEN r.next_run + INTERVAL '1 week'
        WHEN 'monthly' THEN r.next_run + INTERVAL '1 month'
        WHEN 'yearly'  THEN r.next_run + INTERVAL '1 year'
      END;

      r.next_run := next_dt;
    END LOOP;

    UPDATE public.recurring_transactions
    SET next_run = r.next_run
    WHERE id = r.id;
  END LOOP;

  RETURN count_inserted;
END;
$function$;