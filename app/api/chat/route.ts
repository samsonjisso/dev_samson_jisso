import { auth } from "@clerk/nextjs/server";
import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { fetchPortfolioForAI } from "@/lib/chatBotSanity";
import { enforceChatRateLimit } from "@/lib/chatRateLimit";
import { getClientIp, validateAndSanitizeMessages } from "@/lib/chatSecurity";
import {botInstructions} from "./Instruction"

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Authentication required", { status: 401 });
    }

    const ip = getClientIp(req);
    const rateLimit = enforceChatRateLimit(userId, ip);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: rateLimit.message,
          rateLimit: rateLimit.status,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const body = await req.json();
    const validation = validateAndSanitizeMessages(body.messages);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages = validation.messages as UIMessage[];
    const contextData = await fetchPortfolioForAI();

    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: await convertToModelMessages(messages),
      system: botInstructions + "\n\n ProfileData:\n" + contextData,
    });

    return result.toUIMessageStreamResponse({
      headers: {
        "x-rate-limit-remaining": String(rateLimit.status.remaining),
        "x-rate-limit-limit": String(rateLimit.status.limit),
        "x-rate-limit-cooldown": String(rateLimit.status.cooldownSeconds),
      },
    });
  } catch (error) {
    console.error("[CHAT_ERROR]", error);
    return new Response(JSON.stringify({ error: "Chat setup error" }), {
      status: 500,
    });
  }
}
