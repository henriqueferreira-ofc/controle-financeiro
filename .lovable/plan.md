# Importação de Extrato Bancário e Conciliação

## Visão geral
Construir uma alternativa ao Open Finance Brasil baseada em **importação manual** de extratos (OFX / CSV / XLSX), com classificação automática, deduplicação, conciliação e indicadores no dashboard. Antes disso, fechar os erros de build pendentes para deixar o app verde.

## Etapas

### 1. Limpar build (pré-requisito)
- `src/store/seed.ts`: adicionar `paid: true` nas transações seed.
- `src/store/intelligence.ts`: alinhar tipo `Forecast` com `messageKey`/`messageParams` e corrigir comparação `"alta"`.
- `src/routes/_app.relatorios.tsx`: corrigir uso de `transaction(...)` (chamada inválida) e tipagem do `Tooltip formatter`.
- `src/routes/_app.contas.tsx` e `_app.categorias.tsx`: tipar `formatter` do Recharts e default da cor.

### 2. Banco de dados (migration)
Criar tabelas com RLS por `user_id`:
- `bank_accounts` — banco, agência, conta, apelido, saldo inicial.
- `bank_imports` — log de cada importação: arquivo, formato, banco, conta, total de linhas, criado_em, autorizado_em.
- `imported_transactions` — linhas brutas importadas com `external_id`, `is_pix`, `status` (`importada|conciliada|ignorada|pendente`), `dedup_hash`, FK opcional para `transactions.id` quando conciliada.
- Índice único parcial em `(user_id, account_id, dedup_hash)` para deduplicação.

### 3. Parsers
- **OFX**: parser leve em TS (regex sobre tags `<STMTTRN>`, `<DTPOSTED>`, `<TRNAMT>`, `<MEMO>`, `<FITID>`).
- **CSV**: reusar `src/store/csv-import.ts`.
- **XLSX**: usar `xlsx` (SheetJS) — `bun add xlsx`.

Arquivo novo: `src/store/statement-import.ts` com função única `parseStatement(file): Promise<ParsedTxn[]>`.

### 4. Classificação automática
Estender `CATEGORY_RULES` em `csv-import.ts` (ou novo `classifier.ts`) com:
- "PIX RECEBIDO" → receita + `is_pix=true`
- "PIX ENVIADO" → despesa + `is_pix=true`
- "SALÁRIO" → Receita Fixa
- "ENERGIA/ÁGUA/INTERNET/TELEFONE" → Contas Fixas
- "BOLETO" → Conta Paga
- "TARIFA" → Tarifa Bancária
- "CARTÃO" → Cartão de Crédito

### 5. Tela "Importar Extrato Bancário"
Nova rota: `src/routes/_app.importar-extrato.tsx`
- Upload (drop zone) OFX / CSV / XLSX.
- Select de banco (lista já existente em `_app.contas.tsx`).
- Select de conta (`bank_accounts` do usuário, com botão "+ nova conta").
- Checkbox obrigatório com o texto exato de autorização.
- Aviso "não solicitamos senha bancária".
- Botão "Importar Extrato" (disabled até aceite + arquivo + conta).
- Após parse: prévia em tabela com data/desc/valor/tipo/categoria sugerida/duplicada, botão "Confirmar importação".
- Inserção em lote em `imported_transactions` + `transactions` (status `importada`).

### 6. Conciliação
Tela secundária / aba na mesma rota:
- Lista de `imported_transactions` com status `pendente`.
- Sugere match com `transactions` manuais por (data ±2d, valor, sinal).
- Ações: **Conciliar**, **Ignorar**, **Reclassificar categoria**.

### 7. Dashboard
Em `src/routes/_app.index.tsx` adicionar widget "Importações do mês":
- Total importado, Pix recebidos, Pix enviados, contas pagas, receitas, despesas, pendentes.
- Query em `imported_transactions` filtrada pelo mês corrente.

### 8. i18n
Adicionar chaves `import.statement.*` em `pt`, `en`, `es` para todos os textos novos.

### 9. Segurança
- RLS por `user_id` em todas as novas tabelas.
- Nada de credenciais — só upload de arquivo.
- Botão "Excluir importação" cascateia em `imported_transactions` da mesma `bank_imports.id`.
- `bank_imports` registra `user_id`, `created_at`, `authorized_at`.

## Detalhes técnicos
- Stack: TanStack Start + Supabase + shadcn (já no projeto).
- Parsing 100% client-side; só os dados normalizados vão pro Supabase.
- `xlsx` é Worker-compatível (build-time only), seguro para SSR.
- Dedup hash: `sha1(external_id || (date|amount|normalized_desc))`.
- Reusar `processRows` / `suggestCategory` de `csv-import.ts`.

## Fora de escopo (esta etapa)
- Conexão Open Finance real (exige homologação BCB).
- Integração com agregadores (Pluggy/Belvo).
- Sincronização automática agendada.

## Pergunta antes de começar
Confirma que posso (a) aplicar a migration descrita e (b) instalar a dependência `xlsx` para ler arquivos Excel?