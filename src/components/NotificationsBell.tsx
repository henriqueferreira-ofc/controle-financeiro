import { memo, useMemo, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, CheckCircle2, Info, ArrowRight, X, Trash2 } from "lucide-react";
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
import { useI18n } from "@/i18n/I18nProvider";

const DISMISSED_KEY = "axispay-dismissed-notifications";

function NotificationsBellInner() {
  const { transactions, categories, budgets, goals, recurrings, loading } = useFinwise();
  const { t } = useI18n();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Load dismissed IDs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DISMISSED_KEY);
    if (saved) {
      try {
        setDismissedIds(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading dismissed notifications", e);
      }
    }
  }, []);

  const insights = useMemo(() => {
    if (loading) return [];
    const fc = buildForecast(transactions, 30, recurrings);
    const all = buildInsights(transactions, categories, budgets, goals, recurrings, fc);
    // Filter out dismissed ones
    return all.filter(ins => !dismissedIds.includes(ins.id));
  }, [transactions, categories, budgets, goals, recurrings, loading, dismissedIds]);

  const urgentCount = insights.filter(
    (i) => i.severity === "critico" || i.severity === "atencao",
  ).length;

  const dismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(newDismissed));
  };

  const clearAll = () => {
    const allIds = insights.map(i => i.id);
    const newDismissed = [...new Set([...dismissedIds, ...allIds])];
    setDismissedIds(newDismissed);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(newDismissed));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={t("notif.aria")}
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
        <SheetHeader className="mb-4 flex flex-row items-center justify-between border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {t("notif.title")}
          </SheetTitle>
          {insights.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAll}
              className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("notif.clearAll")}
            </Button>
          )}
        </SheetHeader>

        {insights.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success/60" />
            <p className="font-medium text-foreground">{t("notif.empty")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {insights.map((ins) => {
              const cfg = sevConfig[ins.severity];
              const Icon = cfg.icon;
              return (
                <li key={ins.id} className="group relative">
                  <div className={`rounded-xl border ${cfg.border} bg-card/40 p-4 transition-colors hover:bg-card/60`}>
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold leading-snug">{t(ins.titleKey, ins.params)}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => dismiss(ins.id)}
                            className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                            aria-label={t("notif.delete")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {t(ins.descriptionKey, ins.params)}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          {ins.ctaLabelKey && ins.ctaTo ? (
                            <Link
                              to={ins.ctaTo}
                              onClick={() => dismiss(ins.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              {t(ins.ctaLabelKey)}
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          ) : <div />}
                          <Badge variant="outline" className="h-5 px-1.5 text-[9px] uppercase tracking-wider">
                            {t(`sev.${ins.severity}`)}
                          </Badge>
                        </div>
                      </div>
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

export const NotificationsBell = memo(NotificationsBellInner);

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
