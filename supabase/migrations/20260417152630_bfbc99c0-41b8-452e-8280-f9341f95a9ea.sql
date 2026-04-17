-- =========================================================
-- FASE 1: Categorias (globais + customizadas) + Flags em transações
-- =========================================================

-- 1) Tabela de categorias
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL, -- NULL = categoria global (visível para todos)
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('entrada', 'despesa')),
  icon text NOT NULL DEFAULT 'circle',
  color text NOT NULL DEFAULT '#64748b',
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_kind ON public.categories(kind);

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Todos podem ver globais; cada user vê suas próprias
CREATE POLICY "Anyone can view global categories"
  ON public.categories FOR SELECT
  USING (is_global = true);

CREATE POLICY "Users can view their own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_global = false);

CREATE POLICY "Users can update their own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id AND is_global = false);

CREATE POLICY "Users can delete their own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id AND is_global = false);

-- Trigger updated_at
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2) Seed de categorias globais (incluindo Dízimo e Contas Diversas)
INSERT INTO public.categories (user_id, name, kind, icon, color, is_global) VALUES
  -- Despesas
  (NULL, 'Alimentação',      'despesa', 'utensils',     '#ef4444', true),
  (NULL, 'Transporte',       'despesa', 'car',          '#f97316', true),
  (NULL, 'Moradia',          'despesa', 'home',         '#8b5cf6', true),
  (NULL, 'Saúde',            'despesa', 'heart-pulse',  '#ec4899', true),
  (NULL, 'Lazer',            'despesa', 'gamepad-2',    '#06b6d4', true),
  (NULL, 'Educação',         'despesa', 'graduation-cap','#3b82f6', true),
  (NULL, 'Compras',          'despesa', 'shopping-bag', '#a855f7', true),
  (NULL, 'Dízimo',           'despesa', 'church',       '#eab308', true),
  (NULL, 'Contas Diversas',  'despesa', 'file-text',    '#64748b', true),
  (NULL, 'Outros',           'despesa', 'circle',       '#94a3b8', true),
  -- Entradas
  (NULL, 'Salário',          'entrada', 'briefcase',    '#22c55e', true),
  (NULL, 'Freelance',        'entrada', 'laptop',       '#14b8a6', true),
  (NULL, 'Investimentos',    'entrada', 'trending-up',  '#10b981', true),
  (NULL, 'Outros',           'entrada', 'plus-circle',  '#84cc16', true);

-- 3) Adicionar flags às transações
ALTER TABLE public.transactions
  ADD COLUMN essential boolean NOT NULL DEFAULT true,
  ADD COLUMN fixed boolean NOT NULL DEFAULT false;

CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON public.transactions(category);