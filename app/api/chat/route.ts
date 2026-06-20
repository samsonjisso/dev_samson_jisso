import { auth } from '@clerk/nextjs/server';
import { google } from '@ai-sdk/google';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { fetchPortfolioForAI } from '@/lib/chatBotSanity';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages }: { messages: UIMessage[] } = await req.json();

    // 1. Grab your real-time Sanity portfolio content
    const contextData = await fetchPortfolioForAI();

    // 2. Feed it into Gemini with explicit conversational rules
    const result = streamText({
      model: google('gemini-2.5-flash'),
      messages: await convertToModelMessages(messages),
      system: `
        You are a highly capable AI representation of a developer. 
        Your goal is to converse naturally with hiring managers and portfolio guests using ONLY the backend data provided below.
        
        PORTFOLIO BACKEND DATA:
        ${contextData}
        
        RULES:
        1. Speak naturally, professionally, and enthusiastically—like a human chatting about their work.
        2. Read the room: if the user asks a short question, give a punchy reply. If they want deep details, elaborate.
        3. Never lie or invent projects/skills that aren't present in the dataset.
        4. If they ask things completely unrelated to your career or software engineering, gently pivot back to your portfolio.
      `,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Chat setup error' }), { status: 500 });
  }
}
