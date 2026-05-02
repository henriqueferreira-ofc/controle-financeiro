// Fase 3.1 — Celebração ao concluir uma meta
// Critério: 3.1.3 — Toast de celebração quando uma meta atinge 100% e ainda não estava marcada como completed.
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { PartyPopper } from "lucide-react";
import { useFinwise } from "@/store/finwise-store";

export function useGoalCelebrations() {
  const { goals, updateGoal } = useFinwise();
  const celebratedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const g of goals) {
      if (g.completed) {
        celebratedRef.current.add(g.id);
        continue;
      }
      const reached = g.currentAmount >= g.targetAmount && g.targetAmount > 0;
      if (reached && !celebratedRef.current.has(g.id)) {
        celebratedRef.current.add(g.id);
        toast.success(`🎉 Meta concluída: ${g.name}`, {
          description: "Parabéns! Você atingiu 100% da sua meta.",
          duration: 6000,
          icon: <PartyPopper className="h-4 w-4 text-success" />,
        });
        // Marca como completed silenciosamente
        updateGoal(g.id, { completed: true }).catch(() => {
          // se falhar, permite tentar novamente em outro ciclo
          celebratedRef.current.delete(g.id);
        });
      }
    }
  }, [goals, updateGoal]);
}
