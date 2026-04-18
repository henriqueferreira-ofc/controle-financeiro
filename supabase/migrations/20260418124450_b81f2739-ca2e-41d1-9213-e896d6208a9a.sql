-- Budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'weekly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, period)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC NOT NULL DEFAULT 0,
  target_date DATE,
  icon TEXT NOT NULL DEFAULT 'target',
  color TEXT NOT NULL DEFAULT '#10b981',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Recurring transactions table
CREATE TABLE public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'despesa')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category UUID,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run DATE NOT NULL,
  essential BOOLEAN NOT NULL DEFAULT true,
  fixed BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recurring" ON public.recurring_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recurring" ON public.recurring_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recurring" ON public.recurring_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own recurring" ON public.recurring_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER recurring_updated_at BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to apply due recurring transactions
CREATE OR REPLACE FUNCTION public.apply_due_recurring_transactions(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  count_inserted INTEGER := 0;
  next_dt DATE;
BEGIN
  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE user_id = _user_id
      AND active = true
      AND next_run <= CURRENT_DATE
      AND (end_date IS NULL OR next_run <= end_date)
  LOOP
    -- Loop while next_run is due
    WHILE r.next_run <= CURRENT_DATE AND (r.end_date IS NULL OR r.next_run <= r.end_date) LOOP
      INSERT INTO public.transactions (user_id, type, date, description, category, amount, essential, fixed, recurring)
      VALUES (r.user_id, r.type, r.next_run, r.description, r.category::text, r.amount, r.essential, r.fixed, true);
      
      count_inserted := count_inserted + 1;
      
      -- Calculate next run
      next_dt := CASE r.frequency
        WHEN 'daily' THEN r.next_run + INTERVAL '1 day'
        WHEN 'weekly' THEN r.next_run + INTERVAL '1 week'
        WHEN 'monthly' THEN r.next_run + INTERVAL '1 month'
        WHEN 'yearly' THEN r.next_run + INTERVAL '1 year'
      END;
      
      r.next_run := next_dt;
    END LOOP;
    
    UPDATE public.recurring_transactions
    SET next_run = r.next_run
    WHERE id = r.id;
  END LOOP;
  
  RETURN count_inserted;
END;
$$;