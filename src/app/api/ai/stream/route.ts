import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

// Initialize ZAI instance
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

const ACADEMIC_SYSTEM_PROMPT = `Você é um assistente académico especializado em ajudar estudantes moçambicanos.
Responda sempre em Português de Moçambique (pt-MZ).
Mantenha um tom formal e académico.
Seja conciso mas informativo.`;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { prompt, context } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check user credits
    const userCredits = await db.credit.findUnique({
      where: { userId: session.user.id },
    });

    if (!userCredits || userCredits.balance < 3) {
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const zai = await getZAI();

    // For now, we'll use non-streaming and return the full response
    // as streaming with the current SDK setup requires specific handling
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: ACADEMIC_SYSTEM_PROMPT },
        {
          role: "user",
          content: context
            ? `Contexto: ${context}\n\nPedido: ${prompt}`
            : prompt,
        },
      ],
      thinking: { type: "disabled" },
    });

    const response = completion.choices[0]?.message?.content || "";

    // Calculate credits based on response length
    const creditsUsed = Math.max(3, Math.ceil(response.length / 500));

    // Deduct credits
    await db.$transaction([
      db.credit.update({
        where: { userId: session.user.id },
        data: {
          balance: { decrement: creditsUsed },
          used: { increment: creditsUsed },
        },
      }),
      db.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -creditsUsed,
          type: "USAGE",
          description: "IA Streaming",
        },
      }),
    ]);

    // Return as a stream-like response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send the response in chunks to simulate streaming
        const words = response.split(" ");
        let currentText = "";

        for (let i = 0; i < words.length; i++) {
          currentText += (i === 0 ? "" : " ") + words[i];
          const data = JSON.stringify({
            text: currentText,
            done: i === words.length - 1,
            creditsUsed,
            remainingCredits: userCredits.balance - creditsUsed,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // Small delay for streaming effect
          await new Promise((resolve) => setTimeout(resolve, 20));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI stream error:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar pedido" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
