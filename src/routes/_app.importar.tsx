// Fase 1.3 — Página de Importação CSV
import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useFinwise } from "@/store/finwise-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  detectSeparator,
  parseCsv,
  processRows,
  hashKey,
  suggestCategory,
  type CsvRow,
  type ColumnMapping,
  type ParsedRow,
  type BankPreset,
  BANK_PRESETS,
} from "@/store/csv-import";
import { brl } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/_app/importar")({
  component: ImportarPage,
});

type Step = "upload" | "mapping" | "preview" | "done";

function ImportarPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { transactions, categories, refresh } = useFinwise();
  const [step, setStep] = React.useState<Step>("upload");
  const [fileName, setFileName] = React.useState("");
  const [rawText, setRawText] = React.useState("");
  const [separator, setSeparator] = React.useState(",");
  const [rows, setRows] = React.useState<CsvRow[]>([]);
  const [hasHeader, setHasHeader] = React.useState(true);
  const [mapping, setMapping] = React.useState<ColumnMapping>({
    date: null,
    description: null,
    amount: null,
    type: null,
    category: null,
  });
  const [parsed, setParsed] = React.useState<ParsedRow[]>([]);
  const [importing, setImporting] = React.useState(false);

  // Hashes existentes para dedup — fase 1.3 critério: deduplicação por hash
  const existingHashes = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      set.add(hashKey(t.date, t.amount, t.description));
    }
    return set;
  }, [transactions]);

  const headers = hasHeader && rows.length > 0 ? rows[0] : rows[0]?.map((_, i) => t("imp.col", { n: i + 1 })) ?? [];

  const onFile = async (f: File) => {
    setFileName(f.name);
    const text = await f.text();
    setRawText(text);
    const sep = detectSeparator(text);
    setSeparator(sep);
    const parsedRows = parseCsv(text, sep);
    setRows(parsedRows);
    // Auto-mapeamento heurístico
    if (parsedRows.length > 0) {
      const first = parsedRows[0].map((h) => h.toLowerCase().trim());
      const find = (...keys: string[]) =>
        first.findIndex((h) => keys.some((k) => h.includes(k)));
      setMapping({
        date: find("data", "date", "fecha"),
        description: find("descr", "histor", "concepto", "memo"),
        amount: find("valor", "amount", "monto", "importe"),
        type: find("tipo", "type"),
        category: find("categ"),
      });
    }
    setStep("mapping");
  };

  const reparseSeparator = (sep: string) => {
    setSeparator(sep);
    setRows(parseCsv(rawText, sep));
  };

  const goToPreview = () => {
    if (mapping.date === null || mapping.description === null || mapping.amount === null) {
      toast.error(t("imp.errMap"));
      return;
    }
    const result = processRows(rows, mapping, hasHeader, existingHashes);
    setParsed(result);
    setStep("preview");
  };

  const togglePreviewRow = (idx: number) => {
    setParsed((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, duplicate: !r.duplicate && r.valid ? false : !r.duplicate } : r)),
    );
  };

  const updateRow = (idx: number, patch: Partial<ParsedRow>) => {
    setParsed((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const stats = React.useMemo(() => {
    const total = parsed.length;
    const validRows = parsed.filter((r) => r.valid);
    const dupes = validRows.filter((r) => r.duplicate).length;
    const toImport = validRows.filter((r) => !r.duplicate).length;
    const invalid = total - validRows.length;
    return { total, dupes, toImport, invalid };
  }, [parsed]);

  // Mapeia nome de categoria → id (cria a categoria se não existir)
  const ensureCategoryId = async (name: string, kind: "entrada" | "despesa"): Promise<string | null> => {
    if (!name || !user) return null;
    const found = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.kind === kind,
    );
    if (found) return found.id;
    const { data, error } = await supabase
      .from("categories")
      .insert({ user_id: user.id, name, kind, icon: "circle", color: "#64748b", is_global: false })
      .select()
      .single();
    if (error) return null;
    return data.id;
  };

  const doImport = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const toInsert = parsed.filter((r) => r.valid && !r.duplicate);
      const rowsToInsert: Array<{
        user_id: string;
        type: "entrada" | "despesa";
        date: string;
        description: string;
        category: string | null;
        amount: number;
        essential: boolean;
        fixed: boolean;
      }> = [];

      for (const r of toInsert) {
        const catId = r.categoryName ? await ensureCategoryId(r.categoryName, r.type) : null;
        rowsToInsert.push({
          user_id: user.id,
          type: r.type,
          date: r.date,
          description: r.description,
          category: catId,
          amount: r.amount,
          essential: r.type === "despesa",
          fixed: false,
        });
      }

      // Insere em lotes de 200
      for (let i = 0; i < rowsToInsert.length; i += 200) {
        const chunk = rowsToInsert.slice(i, i + 200);
        const { error } = await supabase.from("transactions").insert(chunk);
        if (error) throw error;
      }

      toast.success(t("imp.success", { n: rowsToInsert.length }));
      await refresh();
      setStep("done");
    } catch (e: any) {
      toast.error(t("imp.errImport", { m: e?.message ?? "—" }));
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFileName("");
    setRawText("");
    setRows([]);
    setParsed([]);
    setMapping({ date: null, description: null, amount: null, type: null, category: null });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 md:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("imp.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("imp.subtitleLong")}
        </p>
      </header>

      {/* Steps indicator */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(["upload", "mapping", "preview", "done"] as const).map((s, i) => (
          <Badge
            key={s}
            variant={step === s ? "default" : "outline"}
            className="capitalize"
          >
            {i + 1}. {s === "upload" ? t("imp.steps.upload") : s === "mapping" ? t("imp.steps.mapping") : s === "preview" ? t("imp.steps.preview") : t("imp.steps.done")}
          </Badge>
        ))}
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("imp.selectTitle")}</CardTitle>
            <CardDescription>
              {t("imp.selectDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-10 hover:bg-accent/30">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">{t("imp.dropCta")}</p>
                <p className="text-xs text-muted-foreground">{t("imp.dropHint")}</p>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> {fileName}
            </CardTitle>
            <CardDescription>
              {t("imp.detected", { n: rows.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-6 border-b pb-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-primary font-semibold">{t("imp.bankPreset")}</Label>
                <Select 
                  onValueChange={(v: BankPreset) => {
                    const p = BANK_PRESETS[v];
                    setSeparator(p.separator);
                    setMapping(p.mapping);
                    setHasHeader(p.hasHeader);
                    setRows(parseCsv(rawText, p.separator));
                  }}
                >
                  <SelectTrigger className="w-full border-primary/40 bg-primary/5">
                    <SelectValue placeholder={t("imp.bankPh")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BANK_PRESETS).map(([id, p]) => (
                      <SelectItem key={id} value={id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">
                  {t("imp.bankNote")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("imp.sepManual")}</Label>
                  <Select value={separator} onValueChange={reparseSeparator}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">{t("imp.sepComma")}</SelectItem>
                      <SelectItem value=";">{t("imp.sepSemi")}</SelectItem>
                      <SelectItem value={"\t"}>{t("imp.sepTab")}</SelectItem>
                      <SelectItem value="|">{t("imp.sepPipe")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-end pb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasHeader"
                      checked={hasHeader}
                      onCheckedChange={(v) => setHasHeader(!!v)}
                    />
                    <Label htmlFor="hasHeader" className="cursor-pointer text-xs">{t("imp.header")}</Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(["date", "description", "amount", "type", "category"] as const).map((field) => (
                <div key={field}>
                  <Label className="capitalize text-xs">
                    {field === "date" ? t("imp.fieldDate") : field === "description" ? t("imp.fieldDesc") : field === "amount" ? t("imp.fieldAmount") : field === "type" ? t("imp.fieldType") : t("imp.fieldCat")}
                  </Label>
                  <Select
                    value={mapping[field] === null ? "none" : String(mapping[field])}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [field]: v === "none" ? null : parseInt(v, 10) }))
                    }
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder={t("tx.categorySelect")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("imp.none")}</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>{h || t("imp.col", { n: i + 1 })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview das primeiras linhas */}
            <div className="overflow-x-auto rounded-lg border bg-muted/20">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-2 py-1 text-left font-medium">{h || t("imp.col", { n: i + 1 })}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(hasHeader ? rows.slice(1, 6) : rows.slice(0, 5)).map((r, i) => (
                    <tr key={i} className="border-t">
                      {r.map((c, j) => (
                        <td key={j} className="px-2 py-1 text-muted-foreground">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={reset}>{t("common.cancel")}</Button>
              <Button onClick={goToPreview}>{t("imp.continue")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("imp.statTotal")}</div><div className="text-xl font-bold">{stats.total}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("imp.statImport")}</div><div className="text-xl font-bold text-green-600">{stats.toImport}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("imp.statDupes")}</div><div className="text-xl font-bold text-amber-600">{stats.dupes}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{t("imp.statInvalid")}</div><div className="text-xl font-bold text-destructive">{stats.invalid}</div></CardContent></Card>
          </div>

          {stats.dupes > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("imp.dupeAlert", { n: stats.dupes })}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t("imp.reviewTitle")}</CardTitle>
                <CardDescription>{t("imp.reviewDesc")}</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setParsed(prev => prev.map(r => {
                    const suggested = suggestCategory(r.description);
                    return suggested ? { ...r, categoryName: suggested.category, type: suggested.type } : r;
                  }));
                  toast.success(t("imp.aiOk"));
                }}
                className="gap-2 border-primary/40 text-primary"
              >
                <Sparkles className="h-4 w-4" /> {t("imp.aiCat")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs">
                    <tr>
                      <th className="w-8 px-2 py-2"></th>
                      <th className="px-2 py-2 text-left">{t("imp.tblDate")}</th>
                      <th className="px-2 py-2 text-left">{t("imp.tblDesc")}</th>
                      <th className="px-2 py-2 text-left">{t("imp.tblType")}</th>
                      <th className="px-2 py-2 text-left">{t("imp.tblCat")}</th>
                      <th className="px-2 py-2 text-right">{t("imp.tblAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-t ${!r.valid ? "bg-destructive/5" : r.duplicate ? "bg-amber-500/5 opacity-60" : ""}`}
                      >
                        <td className="px-2 py-1.5">
                          {r.valid ? (
                            <Checkbox
                              checked={!r.duplicate}
                              onCheckedChange={() => togglePreviewRow(i)}
                            />
                          ) : (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.date || "—"}</td>
                        <td className="px-2 py-1.5">
                          <div className="max-w-[260px] truncate">{r.description || <span className="text-destructive">{t("imp.empty")}</span>}</div>
                          {r.errors.length > 0 && (
                            <div className="text-xs text-destructive">{r.errors.join(", ")}</div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <Select
                            value={r.type}
                            onValueChange={(v: "entrada" | "despesa") => updateRow(i, { type: v })}
                          >
                            <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="entrada">{t("tx.income")}</SelectItem>
                              <SelectItem value="despesa">{t("tx.expense")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={r.categoryName ?? ""}
                            onChange={(e) => updateRow(i, { categoryName: e.target.value || null })}
                            placeholder="—"
                            className="h-7 w-[140px] text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium">
                          <span className={r.type === "entrada" ? "text-green-600" : "text-destructive"}>
                            {r.type === "entrada" ? "+" : "-"}{brl(r.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep("mapping")}>{t("imp.back")}</Button>
            <Button onClick={doImport} disabled={importing || stats.toImport === 0}>
              <Wand2 className="mr-2 h-4 w-4" />
              {importing ? t("imp.importing") : t("imp.importBtn", { n: stats.toImport })}
            </Button>
          </div>
        </>
      )}

      {step === "done" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h2 className="text-xl font-bold">{t("imp.doneTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("imp.doneDesc")}</p>
            <Button onClick={reset}>{t("imp.another")}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
