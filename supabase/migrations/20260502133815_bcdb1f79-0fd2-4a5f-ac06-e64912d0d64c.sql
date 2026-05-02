-- Fase 1.1 — Motor de Recorrências: edge cases
-- Critério: log de geração (auto_generated flag)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_id uuid NULL;

-- Critério: pausar/retomar por N meses + pular ocorrência única
ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS paused_until date NULL,
  ADD COLUMN IF NOT EXISTS skip_dates date[] NOT NULL DEFAULT '{}'::date[];

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id ON public.transactions(recurring_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);