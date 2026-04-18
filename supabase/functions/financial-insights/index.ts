// Lovable AI gateway: gera insights financeiros em linguagem natural
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { summary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!summary) throw new Error("summary obrigatório");

    const systemPrompt = `Você é um consultor financeiro pessoal brasileiro, direto e prático.
Analise os dados resumidos do usuário e gere insights ACIONÁVEIS, em português, focados em decisões.
Para cada insight, dê uma recomendação concreta. Use linguagem simples.
Seja específico com valores em R$ quando relevante. Evite jargão.`;

    const userPrompt = `Dados do usuário (JSON):
${JSON.stringify(summary, null, 2)}

Gere entre 4 e 6 insights priorizando:
1. Categoria dominante e oportunidade de redução
2. Comprometimento da renda (despesas/entradas)
3. Orçamentos excedidos (se houver)
4. Tendência (positiva/negativa) do saldo
5. Próxima ação prática recomendada
6. Comentário sobre metas (se houver)`;

    const tools = [
      {
        type: "function",
        function: {
          name: "emit_insights",
          description: "Retornar lista de insights financeiros estruturados",
          parameters: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    titulo: { type: "string", description: "Título curto" },
                    descricao: { type: "string", description: "1-2 frases explicando o insight" },
                    recomendacao: { type: "string", description: "Ação prática recomendada" },
                    severidade: {
                      type: "string",
                      enum: ["positivo", "neutro", "atencao", "critico"],
                    },
                  },
                  required: ["titulo", "descricao", "recomendacao", "severidade"],
                  additionalProperties: false,
                },
              },
            },
            required: ["insights"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "emit_insights" } },
        }),
      },
    );

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error", response.status, text);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "Resposta inválida da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("financial-insights error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
