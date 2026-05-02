// Fase 3.1 — Centro de notificações inteligentes
// Critérios cobertos:
// - 3.1.1: Bell com badge contendo nº de itens críticos/atenção
// - 3.1.2: Painel lateral (Sheet) com notificações priorizadas + CTA navegável
import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useFinwise } from "@/store/finwise-store";
import { buildForecast, buildInsights } from "@/store/intelligence";

function NotificationsBellInner() {
  const { transactions, categories, budgets, goals, recurrings, loading } = useFinwise();

  const insights = useMemo(() => {
    if (loading) return [];
    const fc = buildForecast(transactions, 30, recurrings);
    return buildInsights(transactions, categories, budgets, goals, recurrings, fc);
  }, [transactions, categories, budgets, goals, recurrings, loading]);

  const urgentCount = insights.filter(
    (i) => i.severity === "critico" || i.severity === "atencao",
  ).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {urgentCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {urgentCount > 9 ? "9+" : urgentCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-md overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notificações
          </SheetTitle>
        </SheetHeader>

        {insights.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" />
            Tudo em ordem por aqui!
          </div>
        ) : (
          <ul className="space-y-2">
            {insights.map((ins) => {
              const cfg = sevConfig[ins.severity];
              const Icon = cfg.icon;
              return (
                <li key={ins.id}>
                  <div className={`rounded-lg border ${cfg.border} bg-card/40 p-3`}>
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${cfg.bg} ${cfg.color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{ins.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {ins.description}
                        </p>
                        {ins.ctaLabel && ins.ctaTo && (
                          <Link
                            to={ins.ctaTo}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            {ins.ctaLabel}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[9px] uppercase">
                        {ins.severity}
                      </Badge>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

const sevConfig = {
  critico: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/15",
    border: "border-destructive/40",
  },
  atencao: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/15",
    border: "border-warning/30",
  },
  positivo: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/15",
    border: "border-success/30",
  },
  neutro: {
    icon: Info,
    color: "text-primary",
    bg: "bg-primary/15",
    border: "border-border/60",
  },
} as const;
