// Lovable AI gateway: gera insights financeiros em linguagem natural
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_PAYLOAD_BYTES = 50_000;

// Rate limit em memória por user.id (best-effort em ambiente serverless).
// Janela deslizante: máx N requisições por janela.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (arr.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(userId, arr);
    return false;
  }
  arr.push(now);
  rateBuckets.set(userId, arr);
  return true;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verifica autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 2. Rate limit por usuário
    if (!checkRateLimit(user.id)) {
      return jsonResponse(
        { error: "Muitas requisições. Aguarde alguns segundos." },
        429,
      );
    }

    // 3. Valida payload
    const { summary } = await req.json();
    if (!summary) return jsonResponse({ error: "summary obrigatório" }, 400);
    const summaryStr = JSON.stringify(summary);
    if (summaryStr.length > MAX_PAYLOAD_BYTES) {
      return jsonResponse({ error: "Payload muito grande" }, 413);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return jsonResponse({ error: "Servidor mal configurado" }, 500);
    }

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
      return jsonResponse(
        { error: "Limite de requisições atingido. Aguarde alguns minutos." },
        429,
      );
    }
    if (response.status === 402) {
      return jsonResponse(
        { error: "Créditos da IA esgotados. Adicione créditos no workspace." },
        402,
      );
    }
    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error", response.status, text);
      return jsonResponse({ error: "Erro ao consultar IA" }, 500);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return jsonResponse({ error: "Resposta inválida da IA" }, 500);
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return jsonResponse(parsed);
  } catch (e) {
    console.error("financial-insights error", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown" },
      500,
    );
  }
});
