-- 1. categories UPDATE policy: add WITH CHECK to block escalating is_global
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
CREATE POLICY "Users can update their own categories"
  ON public.categories
  FOR UPDATE
  USING (auth.uid() = user_id AND is_global = false)
  WITH CHECK (auth.uid() = user_id AND is_global = false);

-- Reset any escalated rows
UPDATE public.categories SET is_global = false
WHERE is_global = true AND user_id IS NOT NULL;

-- 2. apply_due_recurring_transactions: enforce caller == _user_id
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
  IF auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE user_id = _user_id
      AND active = true
      AND next_run <= CURRENT_DATE
      AND (end_date IS NULL OR next_run <= end_date)
  LOOP
    WHILE r.next_run <= CURRENT_DATE AND (r.end_date IS NULL OR r.next_run <= r.end_date) LOOP
      IF r.paused_until IS NULL OR r.next_run > r.paused_until THEN
        IF NOT (r.next_run = ANY(COALESCE(r.skip_dates, ARRAY[]::date[]))) THEN
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

-- 3. Revoke public EXECUTE on SECURITY DEFINER trigger helpers
-- handle_updated_at and handle_new_user are trigger functions; no API caller needs EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- apply_due_recurring_transactions stays callable by authenticated users (now guarded)
REVOKE EXECUTE ON FUNCTION public.apply_due_recurring_transactions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_due_recurring_transactions(uuid) TO authenticated;

-- 4. avatars bucket: restrict listing while keeping public URL access
-- Drop any overly permissive SELECT policy that lets anyone enumerate the bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

-- Authenticated users can list/read only their own folder
CREATE POLICY "Users can view own avatar files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can upload/update/delete only in their own folder
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );