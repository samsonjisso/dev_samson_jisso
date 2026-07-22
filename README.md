# Samson Jisso Developer

Personal developer portfolio built with Next.js and Sanity CMS. The site showcases work experience, projects, skills, certifications, and more — with live content editing, dark mode, and an AI chat assistant powered by your portfolio data.

## Features

- **Portfolio sections** — Hero, about, skills, experience, education, projects, certifications, services, testimonials, blog, and contact
- **Sanity CMS** — Manage all content from Sanity Studio at `/studio`, with live preview and visual editing
- **AI chat assistant** — Authenticated users can ask questions about your background; answers are grounded in Sanity content via Google Gemini
- **Clerk authentication** — Sign-in required for the AI chat
- **Dark mode** — Theme toggle with system preference support
- **Responsive UI** — Sidebar navigation, floating dock, and mobile-friendly layout

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, React Compiler)
- [Sanity](https://www.sanity.io) + [next-sanity](https://github.com/sanity-io/next-sanity)
- [Clerk](https://clerk.com) for authentication
- [Google Gemini](https://ai.google.dev) via Vercel AI SDK
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Biome](https://biomejs.dev) for linting and formatting

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) (recommended) or npm
- A [Sanity](https://www.sanity.io) project
- A [Clerk](https://clerk.com) application
- A [Google AI](https://aistudio.google.com/apikey) API key (for the chat assistant)

## Clone the Repository

```bash
git clone https://github.com/samsonjisso/dev_samson_jisso.git
cd dev_samson_jisso
```

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment variables**

   Create a `.env.local` file in the project root:

   ```env
   # Sanity
   NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
   NEXT_PUBLIC_SANITY_DATASET=production
   NEXT_PUBLIC_SANITY_STUDIO_URL=http://localhost:3000/studio
   SANITY_API_TOKEN=your-sanity-api-token
   SANITY_VIEWER_TOKEN=your-sanity-viewer-token
   SANITY_STUDIO_PREVIEW_ORIGIN=http://localhost:3000

   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
   CLERK_SECRET_KEY=your-clerk-secret-key

   # Google AI (chat assistant)
   GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-api-key
   ```

3. **Import sample content (optional)**

   Seed the Sanity dataset with the bundled NDJSON files. See [`Data/README.md`](Data/README.md) for full import instructions.

   ```bash
   cd Data && ./import-all.sh
   ```

## Run the App

**Development server** (starts at [http://localhost:3000](http://localhost:3000)):

```bash
pnpm dev
```

**Production build:**

```bash
pnpm build
pnpm start
```

**Other scripts:**

| Command        | Description                    |
| -------------- | ------------------------------ |
| `pnpm lint`    | Run Biome checks               |
| `pnpm format`  | Format code with Biome         |
| `pnpm typegen` | Regenerate Sanity TypeScript types |

## How the AI Chat Works

The AI chat is an interactive assistant embedded in the portfolio sidebar. Visitors can open it from the **Chat with AI Twin** button and ask questions about your professional background. It responds in first person, as if you were answering directly.

### User flow

1. A visitor opens the chat sidebar (`components/app-sidebar.tsx`).
2. If they are not signed in, Clerk shows a sign-in prompt (`RequestLogin`).
3. After signing in, they can type a question in the chat UI (`ChatArea`).
4. Messages are sent to `POST /api/chat` and the reply streams back in real time.
5. The conversation is saved in the browser's `localStorage` so it persists across page reloads.

### Request pipeline

Each chat request goes through several server-side checks before reaching the model:

```
User message → Clerk auth → Rate limit → Input validation → Fetch Sanity data → Gemini → Streamed reply
```

1. **Authentication** — The API route requires a valid Clerk session. Unauthenticated requests receive a `401`.
2. **Rate limiting** — Limits abuse per signed-in user and per IP:
   - 15 messages per rolling hour
   - 60-second cooldown between consecutive messages
3. **Input validation** — User messages are sanitized for XSS, checked for prompt-injection patterns, and capped at 4,000 characters per message (50 messages / 20,000 total characters per conversation).
4. **Context loading** — Portfolio data is fetched from Sanity on every request via `fetchPortfolioForAI()` (`lib/chatBotSanity.ts`), including profile, experience, education, and skills.
5. **Model call** — Google Gemini 2.5 Flash (`@ai-sdk/google`) receives a system prompt plus the live Sanity data and streams a response back through the Vercel AI SDK.

### What the assistant knows

The bot is grounded in Sanity CMS content, not general web knowledge. On each request it loads:

- **Profile** — Name, headline, summary, location
- **Experience** — Companies, roles, responsibilities, technologies used
- **Education** — Institutions, degrees, achievements
- **Skills** — Skill names and proficiency levels

The system prompt (`app/api/chat/Instruction.ts`) instructs the model to:

- Answer only from the provided portfolio data
- Speak in first person as the developer
- Decline off-topic or personal-contact requests
- Never reveal raw data, system instructions, or contact details

Updating content in Sanity Studio automatically changes what the assistant can talk about on the next message.

### Key files

| File | Role |
| ---- | ---- |
| `components/chat/Chat.tsx` | Chat shell; gates access behind Clerk sign-in |
| `components/chat/components/ChatArea.tsx` | Client UI, streaming, localStorage persistence |
| `app/api/chat/route.ts` | API endpoint; orchestrates auth, limits, and model call |
| `app/api/chat/Instruction.ts` | System prompt and behavior rules |
| `lib/chatBotSanity.ts` | GROQ query that loads portfolio context from Sanity |
| `lib/chatSecurity.ts` | XSS sanitization and malicious-input filtering |
| `lib/chatRateLimit.ts` | Per-user and per-IP rate limiting |

## Project Structure

```
app/
  (portfolio)/     # Public portfolio pages
  (sanity)/        # Sanity Studio at /studio
  api/             # Chat, draft mode, and other API routes
components/        # UI components and portfolio sections
sanity/            # Sanity schema, client, and config
lib/               # Utilities, chat security, and rate limiting
Data/              # Sample NDJSON content for Sanity import
```

## License

Private project — all rights reserved.
