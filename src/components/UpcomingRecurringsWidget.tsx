// Fase 1.1 — Widget "Próximas 4 semanas"
// Lista as próximas ocorrências de recorrências com data exata de disparo.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownCircle, ArrowUpCircle, CalendarRange } from "lucide-react";
import { brl, formatDateBR } from "@/lib/format";
import { upcomingOccurrences } from "@/store/projection";
import type { Category, Recurring } from "@/store/types";

export function UpcomingRecurringsWidget({
  recurrings,
  categories,
  weeks = 4,
}: {
  recurrings: Recurring[];
  categories: Category[];
  weeks?: number;
}) {
  const items = upcomingOccurrences(recurrings, weeks).slice(0, 12);

  return (
    <Card className="border-border/60 shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 text-primary" />
          Próximas {weeks} semanas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma recorrência agendada para o período.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((item, i) => {
              const cat = categories.find((c) => c.id === item.categoryId);
              const isIncome = item.type === "entrada";
              return (
                <li key={`${item.recurringId}-${item.date}-${i}`} className="flex items-center gap-3 py-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      isIncome ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {isIncome ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.description}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{formatDateBR(item.date)}</span>
                      {cat && (
                        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} />
                          <span className="max-w-[100px] truncate">{cat.name}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      isIncome ? "text-success" : "text-destructive"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {brl(item.amount)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
