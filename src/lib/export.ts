import { Transaction, Category } from "@/store/types";

export function exportToCSV(transactions: Transaction[], categories: Category[]) {
  const getCategoryName = (id?: string) => {
    return categories.find((c) => c.id === id)?.name || "Sem categoria";
  };

  const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Tags", "Método de Pagamento"];
  
  const rows = transactions.map((t) => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`,
    `"${getCategoryName(t.categoryId)}"`,
    t.type === "entrada" ? "Entrada" : "Despesa",
    t.amount.toString().replace(".", ","),
    `"${(t.tags || []).join(", ")}"`,
    `"${t.paymentMethod || "—"}"`,
  ]);

  const csvContent = [
    headers.join(";"),
    ...rows.map((r) => r.join(";")),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `axispay_extrato_${dateStr}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
