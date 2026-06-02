// Any file named route.ts inside /app/api/ becomes an API endpoint.
// Exporting a function named POST, GET, etc. handles that HTTP method.
// This file handles POST /api/chat.
import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText, appendResponseMessages } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel } from "@/lib/provider";
import { generationPrompt } from "@/lib/prompts/generation";

export async function POST(req: Request) {
  // The browser sends the full chat history + current file state on every message.
  const {
    messages,
    files,
    projectId,
  }: { messages: any[]; files: Record<string, FileNode>; projectId?: string } =
    await req.json();

  // Prepend the system prompt as the first message so Claude always has context.
  // `cacheControl: ephemeral` tells Anthropic to cache this prompt server-side,
  // reducing cost and latency on repeated calls with the same system prompt.
  messages.unshift({
    role: "system",
    content: generationPrompt,
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
  });

  // Reconstruct the VirtualFileSystem from serialized data sent by the client.
  const fileSystem = new VirtualFileSystem();
  fileSystem.deserializeFromNodes(files);

  const model = getLanguageModel();
  // Use fewer steps for mock provider to prevent repetition
  const isMockProvider = !process.env.ANTHROPIC_API_KEY;

  // `streamText` from the Vercel AI SDK calls the model and streams the response
  // token-by-token. `maxSteps` controls how many tool-call/response round trips
  // Claude can make before the stream is closed.
  const result = streamText({
    model,
    messages,
    maxTokens: 10_000,
    maxSteps: isMockProvider ? 4 : 40,
    onError: (err: any) => {
      console.error(err);
    },
    // `tools` are functions Claude can call mid-response to read/write files.
    // Each tool receives the shared `fileSystem` instance so changes persist
    // across multiple tool calls within a single response.
    tools: {
      str_replace_editor: buildStrReplaceTool(fileSystem),
      file_manager: buildFileManagerTool(fileSystem),
    },
    // `onFinish` runs after the full response is complete (all tool calls done).
    // This is where we persist the updated messages and file state to the DB.
    onFinish: async ({ response }) => {
      if (projectId) {
        try {
          const session = await getSession();
          if (!session) {
            console.error("User not authenticated, cannot save project");
            return;
          }

          const responseMessages = response.messages || [];
          // Merge the original user messages with Claude's response messages
          // into one flat array for storage.
          const allMessages = appendResponseMessages({
            messages: [...messages.filter((m) => m.role !== "system")],
            responseMessages,
          });

          await prisma.project.update({
            where: {
              id: projectId,
              userId: session.userId,
            },
            data: {
              messages: JSON.stringify(allMessages),
              data: JSON.stringify(fileSystem.serialize()),
            },
          });
        } catch (error) {
          console.error("Failed to save project data:", error);
        }
      }
    },
  });

  // Convert the streaming result into a format the Vercel AI SDK's `useChat`
  // hook on the client knows how to consume.
  return result.toDataStreamResponse();
}

// Vercel serverless functions time out at 10s by default.
// This raises the limit to 120s to allow long AI responses to finish.
export const maxDuration = 120;
