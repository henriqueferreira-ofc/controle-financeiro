import { createFileRoute } from "@tanstack/react-router";
import { useFinwise } from "@/store/finwise-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, BarChart3, Calendar, Wallet } from "lucide-react";
import { useState, useMemo } from "react";
import { KpiCard } from "@/components/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios Mensais — AxisPay" },
      { name: "description", content: "Análise detalhada de entradas e saídas por mês." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { transactions, categories } = useFinwise();
  
  // Estado para Mês e Ano
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());

  // Anos disponíveis nos registros
  const years = useMemo(() => {
    const y = new Set<string>();
    y.add(now.getFullYear().toString());
    transactions.forEach(t => y.add(new Date(t.date).getFullYear().toString()));
    return Array.from(y).sort((a, b) => b.localeCompare(a));
  }, [transactions, now]);

  const months = [
    { value: "0", label: "Janeiro" },
    { value: "1", label: "Fevereiro" },
    { value: "2", label: "Março" },
    { value: "3", label: "Abril" },
    { value: "4", label: "Maio" },
    { value: "5", label: "Junho" },
    { value: "6", label: "Julho" },
    { value: "7", label: "Agosto" },
    { value: "8", label: "Setembro" },
    { value: "9", label: "Outubro" },
    { value: "10", label: "Novembro" },
    { value: "11", label: "Dezembro" },
  ];

  // Filtragem dos dados
  const filteredData = useMemo(() => {
    const m = parseInt(selectedMonth);
    const y = parseInt(selectedYear);

    const periodTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });

    const entries = periodTransactions.filter(t => t.type === "entrada");
    const expenses = periodTransactions.filter(t => t.type === "despesa");

    const totalIn = entries.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const totalOut = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);

    return {
      transactions: periodTransactions.sort((a, b) => b.date.localeCompare(a.date)),
      totalIn,
      totalOut,
      balance: totalIn - totalOut
    };
  }, [transactions, selectedMonth, selectedYear]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análise detalhada de movimentações mensais.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumo do Mês */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Saldo do Mês"
          value={brl(filteredData.balance)}
          tone={filteredData.balance >= 0 ? "success" : "destructive"}
          icon={Wallet}
        />
        <KpiCard
          label="Total Entradas"
          value={brl(filteredData.totalIn)}
          tone="success"
          icon={ArrowUpRight}
        />
        <KpiCard
          label="Total Saídas"
          value={brl(filteredData.totalOut)}
          tone="destructive"
          icon={ArrowDownRight}
        />
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Movimentações de {months[parseInt(selectedMonth)].label}
          </CardTitle>
          <Badge variant="outline" className="font-normal">
            {filteredData.transactions.length} registros
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Nenhuma movimentação encontrada neste mês.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.transactions.map((t) => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    const isIncome = t.type === 'entrada';
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(t.date), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{t.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal" style={{ 
                            backgroundColor: cat?.color + '20', 
                            color: cat?.color,
                            borderColor: cat?.color + '40'
                          }}>
                            {cat?.name || "Sem categoria"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
                          {isIncome ? '+' : '-'} {brl(Math.abs(t.amount))}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
