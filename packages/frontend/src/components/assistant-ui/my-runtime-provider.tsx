"use client";

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
  type ThreadMessage,
} from "@assistant-ui/react";
import type { PropsWithChildren } from "react";

type PayloadMessage = {
  role: "user" | "assistant";
  content: string;
};

const ASSISTANT_API = "/api/assistant/chat";

const toPayloadMessages = (messages: readonly ThreadMessage[]): PayloadMessage[] => {
  return messages
    .map((message): PayloadMessage | null => {
      if (message.role !== "assistant" && message.role !== "user") return null;

      const content = message.content
        .filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text" && typeof part.text === "string",
        )
        .map((part) => part.text)
        .join("\n\n")
        .trim();

      if (!content) return null;
      return { role: message.role, content };
    })
    .filter(Boolean) as PayloadMessage[];
};

const parseStreamLine = (rawLine: string): string | null => {
  const normalized = rawLine.trim();
  if (!normalized || normalized === "[DONE]") return null;

  let line = normalized.startsWith("data:")
    ? normalized.slice("data:".length).trim()
    : normalized;

  // Prefer the last non-empty content='...'
  const contentMatches = [...line.matchAll(/content=['"]([^'"]*)['"]/g)]
    .map((m) => m[1]?.trim())
    .filter((m) => m);
  if (contentMatches.length) {
    const last = contentMatches[contentMatches.length - 1];
    if (last) return last;
  }

  // If there's text after a Python-style payload (e.g. }}) grab the tail
  const tailIndex = line.lastIndexOf("}}");
  if (tailIndex !== -1 && tailIndex + 2 < line.length) {
    const tail = line.slice(tailIndex + 2).trim();
    if (tail) return tail;
  }

  // Ignore purely diagnostic payloads
  if (/^{.*agent.*}$/i.test(line)) return null;

  // Fallback: return the line as-is
  return line;
};

const normalizeContent = (text: string): string => {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r");
};

const assistantAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const payload = toPayloadMessages(messages);

    if (!payload.length) {
      throw new Error("No messages to send to assistant");
    }

    const response = await fetch(ASSISTANT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payload }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        errorText || `Assistant request failed with status ${response.status}`,
      );
    }

    if (!response.body) {
      throw new Error("Assistant response did not include a body");
    }

    const decoder = new TextDecoder();
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    let buffer = "";
    let aggregatedText = "";

    const pushUpdate = (incoming: string | null): ChatModelRunResult | null => {
      if (!incoming) return null;
      const nextText = incoming.startsWith(aggregatedText)
        ? incoming
        : aggregatedText + incoming;
      aggregatedText = nextText;

      if (!aggregatedText.trim()) return null;

      return {
        content: [
          {
            type: "text",
            text: aggregatedText,
          },
        ],
      };
    };

    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buffer += value;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const parsed = parseStreamLine(line);
          const update = pushUpdate(parsed ? normalizeContent(parsed) : null);
          if (update) yield update;
        }
      }

      if (done) break;
    }

    const finalParsed = parseStreamLine(buffer);
    const finalUpdate = pushUpdate(finalParsed ? normalizeContent(finalParsed) : null);
    if (finalUpdate) yield finalUpdate;

    if (!aggregatedText.trim()) {
      throw new Error("Assistant response was empty");
    }
  },
};

export const MyRuntimeProvider = ({ children }: PropsWithChildren) => {
  const runtime = useLocalRuntime(assistantAdapter);

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
};
