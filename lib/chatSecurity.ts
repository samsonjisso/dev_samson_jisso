/**
 * Security helpers for the chat bot:
 *  - XSS protection: strip/escape any HTML or script-bearing content before it
 *    is processed or echoed back.
 *  - Malicious request filtering: reject prompts that look like prompt-injection,
 *    code-execution attempts, or obvious abuse, and enforce sane size limits.
 *
 * These run on the SERVER (in the API route) so they cannot be bypassed from the
 * client, and the client also gets a sanitized copy for display.
 */

/** Hard limits to block oversized / abusive payloads. */
export const MESSAGE_LIMITS = {
  maxMessages: 50,
  maxCharsPerMessage: 4000,
  maxTotalChars: 20000,
} as const;

/**
 * Remove HTML tags, dangerous protocols and control characters to neutralise
 * XSS payloads. The chat is plain-text only, so it's safe to strip all markup.
 */
export function sanitizeText(input: string): string {
  if (typeof input !== "string") return "";

  return (
    input
      // Drop <script>...</script> blocks entirely (including their content).
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      // Remove any remaining HTML/XML tags.
      .replace(/<\/?[a-z][\s\S]*?>/gi, "")
      // Neutralise dangerous URI schemes.
      .replace(/javascript:/gi, "")
      .replace(/data:text\/html/gi, "")
      .replace(/vbscript:/gi, "")
      // Strip inline event handlers like onclick=, onerror=, etc.
      .replace(/on\w+\s*=/gi, "")
      // Escape the core HTML-significant characters that remain.
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Remove non-printable control characters (keep \n and \t).
      // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional cleanup
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .trim()
  );
}

/**
 * Patterns that indicate prompt-injection or malicious intent. Kept conservative
 * to avoid false positives on legitimate questions.
 */
const MALICIOUS_PATTERNS: RegExp[] = [
  /ignore (all|any|previous|prior|above)\s+(instructions|rules|prompts)/i,
  /disregard (all|any|previous|prior|the)\s+(instructions|rules|prompts)/i,
  /you are now (a|an|in)\b/i,
  /system\s*prompt/i,
  /reveal (your|the)\s+(system|prompt|instructions)/i,
  /\bDROP\s+TABLE\b/i,
  /\bUNION\s+SELECT\b/i,
  /\b(rm\s+-rf|sudo\s+rm)\b/i,
  /<\s*script\b/i,
  /\bon(error|load|click)\s*=/i,
  /\bjavascript:\s*/i,
  /\beval\s*\(/i,
  /\bdocument\.(cookie|location)\b/i,
];

export type ValidationResult =
  | { ok: true; sanitizedText: string }
  | { ok: false; error: string };

/** Validate and sanitize a single user message's text. */
export function validateUserText(text: string): ValidationResult {
  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, error: "Empty message is not allowed." };
  }

  if (text.length > MESSAGE_LIMITS.maxCharsPerMessage) {
    return {
      ok: false,
      error: `Message too long (max ${MESSAGE_LIMITS.maxCharsPerMessage} characters).`,
    };
  }

  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      return {
        ok: false,
        error: "Your message was blocked for security reasons.",
      };
    }
  }

  return { ok: true, sanitizedText: sanitizeText(text) };
}

/** Extract the plain text from an AI SDK UI message's parts. */
function extractText(message: unknown): string {
  if (
    message &&
    typeof message === "object" &&
    "parts" in message &&
    Array.isArray((message as { parts: unknown[] }).parts)
  ) {
    return (message as { parts: Array<{ type?: string; text?: string }> }).parts
      .filter((p) => p?.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join(" ");
  }
  return "";
}

export type MessagesValidation =
  | { ok: true; messages: unknown[] }
  | { ok: false; error: string };

/**
 * Validate the whole incoming `messages` array: shape, size limits, malicious
 * content, and sanitize the text of every user-authored message in place.
 */
export function validateAndSanitizeMessages(
  rawMessages: unknown,
): MessagesValidation {
  if (!Array.isArray(rawMessages)) {
    return { ok: false, error: "Invalid request format." };
  }

  if (rawMessages.length === 0) {
    return { ok: false, error: "No messages provided." };
  }

  if (rawMessages.length > MESSAGE_LIMITS.maxMessages) {
    return { ok: false, error: "Conversation is too long." };
  }

  let totalChars = 0;
  const sanitized: unknown[] = [];

  for (const message of rawMessages) {
    if (!message || typeof message !== "object" || !("role" in message)) {
      return { ok: false, error: "Invalid message format." };
    }

    const role = (message as { role: unknown }).role;
    const text = extractText(message);
    totalChars += text.length;

    if (totalChars > MESSAGE_LIMITS.maxTotalChars) {
      return { ok: false, error: "Conversation payload is too large." };
    }

    // Only user-authored content is untrusted and needs validation.
    if (role === "user") {
      const result = validateUserText(text);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }

      // Rebuild the parts with sanitized text so nothing dangerous flows on.
      const cleaned = {
        ...(message as Record<string, unknown>),
        parts: [{ type: "text", text: result.sanitizedText }],
      };
      sanitized.push(cleaned);
    } else {
      sanitized.push(message);
    }
  }

  return { ok: true, messages: sanitized };
}

/** Best-effort extraction of the client IP from request headers. */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // First entry is the original client.
    return forwarded.split(",")[0]?.trim() || null;
  }
  return req.headers.get("x-real-ip");
}
