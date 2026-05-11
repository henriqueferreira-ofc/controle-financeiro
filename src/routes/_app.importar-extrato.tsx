import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, ShieldCheck, FileText, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { parseStatementFile, type ParsedStatementTxn, type StatementFormat } from "@/store/statement-import";
import { useFinwise } from "@/store/finwise-store";
import { brl } from "@/lib/format";
import { v4 as uuidv4 } from "uuid";

export const Route = createFileRoute("/_app/importar-extrato")({
  head: () => ({
    meta: [
      { title: "Importar Extrato Bancário — AxisPay" },
      { name: "description", content: "Importe extratos OFX, CSV ou XLSX e concilie automaticamente seus lançamentos." },
    ],
  }),
  component: ImportStatementPage,
});

const BANKS = [
  { code: "santander", name: "Santander" },
  { code: "nubank", name: "Nubank" },
  { code: "bb", name: "Banco do Brasil" },
  { code: "caixa", name: "Caixa" },
  { code: "itau", name: "Itaú" },
  { code: "bradesco", name: "Bradesco" },
  { code: "inter", name: "Banco Inter" },
  { code: "btg", name: "BTG Pactual" },
  { code: "c6", name: "C6 Bank" },
  { code: "next", name: "Next" },
  { code: "neon", name: "Neon" },
  { code: "original", name: "Banco Original" },
  { code: "safra", name: "Safra" },
  { code: "sicoob", name: "Sicoob" },
  { code: "sicredi", name: "Sicredi" },
  { code: "pan", name: "Banco Pan" },
  { code: "mercadopago", name: "Mercado Pago" },
  { code: "picpay", name: "PicPay" },
  { code: "willbank", name: "Will Bank" },
  { code: "xp", name: "XP Investimentos" },
  { code: "outro", name: "Outro" },
];

type BankAccount = {
  id: string;
  bank_code: string;
  bank_name: string;
  nickname: string | null;
  number: string | null;
};

type ImportRecord = {
  id: string;
  filename: string;
  format: string;
  bank_name: string | null;
  imported_rows: number;
  duplicate_rows: number;
  total_rows: number;
  created_at: string;
};

const AUTH_TEXT =
  "Declaro que sou titular ou possuo autorização para utilizar os dados financeiros enviados e autorizo o sistema a processar essas informações exclusivamente para fins de organização financeira, conciliação de lançamentos, identificação de receitas, despesas, contas pagas e Pix recebidos/enviados.";

function ImportStatementPage() {
  const { user } = useAuth();
  const [bankCode, setBankCode] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [parsed, setParsed] = useState<{ format: StatementFormat; txns: ParsedStatementTxn[] } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { transactions, addTransaction } = useFinwise();
  const [pendingImports, setPendingImports] = useState<any[]>([]);

  // New account inline
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [naNickname, setNaNickname] = useState("");
  const [naNumber, setNaNumber] = useState("");

  const selectedBank = useMemo(() => BANKS.find((b) => b.code === bankCode), [bankCode]);

  const reload = async () => {
    if (!user) return;
    const { data: accs } = await supabase
      .from("bank_accounts")
      .select("id, bank_code, bank_name, nickname, number")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAccounts((accs as BankAccount[]) || []);
    const { data: imps } = await supabase
      .from("bank_imports")
      .select("id, filename, format, bank_name, imported_rows, duplicate_rows, total_rows, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setImports((imps as ImportRecord[]) || []);

    const { data: pendings } = await supabase
      .from("imported_transactions")
      .select("*")
      .in("status", ["pendente", "importada"])
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    setPendingImports(pendings || []);
  };
  useEffect(() => { reload(); }, [user]);

  const accountsForBank = useMemo(
    () => accounts.filter((a) => !bankCode || a.bank_code === bankCode),
    [accounts, bankCode],
  );

  const createAccount = async () => {
    if (!user || !selectedBank) return toast.error("Selecione um banco");
    const { data, error } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: user.id,
        bank_code: selectedBank.code,
        bank_name: selectedBank.name,
        nickname: naNickname.trim() || selectedBank.name,
        number: naNumber.trim() || null,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success("Conta criada");
    setNaNickname(""); setNaNumber(""); setNewAccountOpen(false);
    setAccountId((data as BankAccount).id);
    await reload();
  };

  const handleFile = async (f: File | null) => {
    setFile(f);
    setParsed(null);
    if (!f) return;
    setParsing(true);
    try {
      const result = await parseStatementFile(f);
      if (result.txns.length === 0) {
        toast.error("Nenhuma transação reconhecida no arquivo.");
      } else {
        toast.success(`${result.txns.length} transações lidas`);
      }
      setParsed(result);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao ler arquivo");
    } finally {
      setParsing(false);
    }
  };

  const canImport = !!user && !!parsed && parsed.txns.length > 0 && !!accountId && authorized && !saving;

  const importNow = async () => {
    if (!user || !parsed || !accountId || !selectedBank) return;
    setSaving(true);
    try {
      // 1. Create import record
      const { data: imp, error: impErr } = await supabase
        .from("bank_imports")
        .insert({
          user_id: user.id,
          account_id: accountId,
          bank_code: selectedBank.code,
          bank_name: selectedBank.name,
          filename: file?.name || "extrato",
          format: parsed.format,
          total_rows: parsed.txns.length,
          authorized_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (impErr) throw impErr;

      // 2. Bulk insert transactions
      const rows = parsed.txns.map((t) => ({
        user_id: user.id,
        import_id: (imp as any).id,
        account_id: accountId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        external_id: t.externalId ?? null,
        is_pix: t.isPix,
        category_suggestion: t.categorySuggestion,
        status: t.categorySuggestion ? "importada" : "pendente",
        dedup_hash: t.dedupHash,
      }));

      let imported = 0, duplicates = 0;
      // Insert one-by-one so the unique index handles dedup gracefully
      for (const r of rows) {
        const { error } = await supabase.from("imported_transactions").insert(r);
        if (error) {
          if (error.code === "23505") duplicates++;
          else throw error;
        } else imported++;
      }
      await supabase
        .from("bank_imports")
        .update({ imported_rows: imported, duplicate_rows: duplicates })
        .eq("id", (imp as any).id);

      toast.success(`Importação concluída: ${imported} novas, ${duplicates} duplicadas`);
      setFile(null); setParsed(null); setAuthorized(false);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Falha na importação");
    } finally {
      setSaving(false);
    }
  };

  const deleteImport = async (id: string) => {
    if (!confirm("Excluir esta importação e todas as transações vinculadas?")) return;
    const { error } = await supabase.from("bank_imports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Importação removida");
    reload();
  };

  const handleConciliate = async (imp: any, matchId?: string) => {
    if (!matchId) {
      // Adicionar como novo
      addTransaction({
        type: imp.type,
        amount: Math.abs(imp.amount),
        date: imp.date,
        description: imp.description,
        categoryId: undefined,
        paid: true,
        essential: false,
        fixed: false,
      });
    }

    const { error } = await supabase
      .from("imported_transactions")
      .update({ status: "conciliada" })
      .eq("id", imp.id);

    if (error) {
      toast.error("Erro ao conciliar.");
      return;
    }
    toast.success("Transação conciliada!");
    setPendingImports((prev) => prev.filter((p) => p.id !== imp.id));
  };

  const handleIgnore = async (impId: string) => {
    const { error } = await supabase
      .from("imported_transactions")
      .update({ status: "ignorada" })
      .eq("id", impId);
    if (!error) {
      setPendingImports((prev) => prev.filter((p) => p.id !== impId));
      toast.success("Transação ignorada.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Importar Extrato Bancário</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie um extrato (OFX, CSV ou XLSX) para conciliar receitas, despesas, PIX e contas pagas.
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Sua segurança em primeiro lugar</p>
          <p className="text-muted-foreground mt-1">
            Não solicitamos nem armazenamos sua senha bancária. Apenas o arquivo de extrato enviado por você é processado, e somente você tem acesso aos seus dados.
          </p>
        </div>
      </div>

      <Tabs defaultValue="conciliation">
        <TabsList>
          <TabsTrigger value="conciliation">
            Conciliação {pendingImports.length > 0 && <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">{pendingImports.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="upload">Nova importação</TabsTrigger>
          <TabsTrigger value="history">Histórico ({imports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" /> 1. Envie o arquivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Select value={bankCode} onValueChange={(v) => { setBankCode(v); setAccountId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                    <SelectContent>
                      {BANKS.map((b) => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <div className="flex gap-2">
                    <Select value={accountId} onValueChange={setAccountId} disabled={!bankCode}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={bankCode ? "Selecione a conta" : "Selecione um banco primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {accountsForBank.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nickname || a.bank_name}{a.number ? ` • ${a.number}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" disabled={!bankCode} onClick={() => setNewAccountOpen((v) => !v)}>
                      + Nova
                    </Button>
                  </div>
                </div>
              </div>

              {newAccountOpen && (
                <div className="grid gap-3 rounded-md border p-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Apelido</Label>
                    <Input value={naNickname} onChange={(e) => setNaNickname(e.target.value)} placeholder="Conta principal" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Número (opcional)</Label>
                    <Input value={naNumber} onChange={(e) => setNaNumber(e.target.value)} placeholder="00000-0" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={createAccount} className="w-full">Criar conta</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Arquivo de extrato (.ofx, .csv, .xlsx)</Label>
                <Input
                  type="file"
                  accept=".ofx,.qfx,.csv,.txt,.xlsx,.xls"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
                {parsing && <p className="text-xs text-muted-foreground">Lendo arquivo…</p>}
                {parsed && (
                  <p className="text-xs text-success">
                    {parsed.txns.length} transações lidas ({parsed.format.toUpperCase()})
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {parsed && parsed.txns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> 2. Pré-visualização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.txns.slice(0, 100).map((t, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{t.date}</TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[280px]">{t.description}</span>
                              {t.isPix && <Badge variant="outline" className="text-[9px]">PIX</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {t.categorySuggestion ? (
                              <Badge variant="secondary" className="font-normal">{t.categorySuggestion}</Badge>
                            ) : (
                              <Badge variant="outline" className="font-normal text-muted-foreground">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums text-sm font-medium ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                            {t.type === "entrada" ? "+" : "-"} {brl(t.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsed.txns.length > 100 && (
                  <p className="text-xs text-muted-foreground mt-2">Exibindo as 100 primeiras de {parsed.txns.length} transações.</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> 3. Autorização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id="auth"
                  checked={authorized}
                  onCheckedChange={(v) => setAuthorized(v === true)}
                  className="mt-1"
                />
                <Label htmlFor="auth" className="text-sm font-normal leading-relaxed cursor-pointer">
                  {AUTH_TEXT}
                </Label>
              </div>
              <Button onClick={importNow} disabled={!canImport} className="w-full sm:w-auto" size="lg">
                {saving ? "Importando…" : "Importar Extrato"}
              </Button>
              {!parsed && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Envie um arquivo para habilitar a importação.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {imports.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  Nenhuma importação ainda.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Formato</TableHead>
                      <TableHead className="text-right">Linhas</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imports.map((imp) => (
                      <TableRow key={imp.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(imp.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{imp.filename}</TableCell>
                        <TableCell className="text-sm">{imp.bank_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{imp.format.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          <span className="text-success">{imp.imported_rows}</span>
                          {imp.duplicate_rows > 0 && (
                            <span className="text-muted-foreground"> / {imp.duplicate_rows} dup.</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => deleteImport(imp.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-success" />
            Cada importação registra data, hora e o usuário responsável. Excluir remove todas as transações vinculadas.
          </div>
        </TabsContent>

        <TabsContent value="conciliation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Conciliação Inteligente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingImports.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  Nenhuma transação pendente de conciliação. Ótimo trabalho!
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Verifique as transações importadas e adicione-as ao sistema ou faça o match com lançamentos manuais já existentes.
                  </p>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Data</TableHead>
                          <TableHead>Transação do Banco</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Sugestão de Match (Local)</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingImports.map((imp) => {
                          const possibleMatches = transactions.filter((t) => 
                            t.date === imp.date && 
                            Math.abs(t.amount) === Math.abs(imp.amount) &&
                            t.type === imp.type
                          );
                          const isIncome = imp.type === "entrada";

                          return (
                            <TableRow key={imp.id}>
                              <TableCell className="text-xs">{imp.date}</TableCell>
                              <TableCell className="text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  {imp.description}
                                  {imp.is_pix && <Badge variant="outline" className="text-[9px]">PIX</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className={`text-right tabular-nums text-sm font-semibold ${isIncome ? "text-success" : "text-destructive"}`}>
                                {isIncome ? "+" : "-"} {brl(Math.abs(imp.amount))}
                              </TableCell>
                              <TableCell>
                                {possibleMatches.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {possibleMatches.map(m => (
                                      <div key={m.id} className="flex items-center justify-between bg-muted/50 p-1.5 rounded-md text-xs border border-border/50">
                                        <span className="truncate max-w-[150px]">{m.description}</span>
                                        <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={() => handleConciliate(imp, m.id)}>
                                          Match
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Nenhum match exato encontrado.</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleIgnore(imp.id)}>
                                    Ignorar
                                  </Button>
                                  <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleConciliate(imp)}>
                                    Adicionar
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
