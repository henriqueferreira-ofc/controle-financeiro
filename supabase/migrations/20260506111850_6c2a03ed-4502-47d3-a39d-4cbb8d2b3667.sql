-- Bank accounts
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  agency TEXT,
  number TEXT,
  nickname TEXT,
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ba select own" ON public.bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ba insert own" ON public.bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ba update own" ON public.bank_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ba delete own" ON public.bank_accounts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER ba_updated BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Bank imports (one per uploaded file)
CREATE TABLE public.bank_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  bank_code TEXT,
  bank_name TEXT,
  filename TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('ofx','csv','xlsx')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi select own" ON public.bank_imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bi insert own" ON public.bank_imports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bi update own" ON public.bank_imports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bi delete own" ON public.bank_imports FOR DELETE USING (auth.uid() = user_id);

-- Imported transactions (raw rows from statements)
CREATE TABLE public.imported_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  import_id UUID NOT NULL REFERENCES public.bank_imports(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada','despesa')),
  external_id TEXT,
  is_pix BOOLEAN NOT NULL DEFAULT false,
  category_suggestion TEXT,
  status TEXT NOT NULL DEFAULT 'importada' CHECK (status IN ('importada','conciliada','ignorada','pendente')),
  matched_transaction_id UUID,
  dedup_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.imported_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it select own" ON public.imported_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "it insert own" ON public.imported_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "it update own" ON public.imported_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "it delete own" ON public.imported_transactions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER it_updated BEFORE UPDATE ON public.imported_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX imported_tx_dedup ON public.imported_transactions (user_id, account_id, dedup_hash);
CREATE INDEX imported_tx_user_date ON public.imported_transactions (user_id, date DESC);
CREATE INDEX bank_imports_user_created ON public.bank_imports (user_id, created_at DESC);
CREATE INDEX bank_accounts_user ON public.bank_accounts (user_id);