import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Zap } from "lucide-react";
import { useFinwise } from "@/store/finwise-store";
import { brl } from "@/lib/format";
import { useMemo } from "react";
import { applyFilters } from "@/store/selectors";

export function BankStatsWidget() {
  const { transactions, filters } = useFinwise();
  
  const currentTxns = useMemo(() => applyFilters(transactions, filters), [transactions, filters]);

  const stats = useMemo(() => {
    let pixReceived = 0;
    let pixSent = 0;
    let paidBills = 0;
    let pendingBills = 0;

    currentTxns.forEach(t => {
      const isPix = /pix/i.test(t.description) || /pix/i.test(t.paymentMethod || "");
      
      if (t.type === "entrada") {
        if (isPix) pixReceived += Math.abs(t.amount);
      } else {
        if (isPix) pixSent += Math.abs(t.amount);
        
        if (t.paid) {
          paidBills += Math.abs(t.amount);
        } else {
          pendingBills += Math.abs(t.amount);
        }
      }
    });

    return { pixReceived, pixSent, paidBills, pendingBills };
  }, [currentTxns]);

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Movimentação Bancária
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowDownLeft className="h-3 w-3 text-success" /> Pix Recebidos
            </p>
            <p className="text-lg font-semibold tabular-nums text-success">{brl(stats.pixReceived)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-destructive" /> Pix Enviados
            </p>
            <p className="text-lg font-semibold tabular-nums text-destructive">{brl(stats.pixSent)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-muted-foreground" /> Contas Pagas
            </p>
            <p className="text-lg font-semibold tabular-nums">{brl(stats.paidBills)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-destructive/80" /> Pendentes
            </p>
            <p className="text-lg font-semibold tabular-nums text-destructive">{brl(stats.pendingBills)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
