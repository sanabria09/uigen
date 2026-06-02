// "use client" marks this as a Client Component — it runs in the browser and
// can use hooks, event handlers, and browser APIs. Without this directive,
// Next.js treats every component as a Server Component by default.
"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { Message } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: Message[];
}

interface ChatContextType {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: string;
}

// React Context lets you share state across a component tree without passing
// props down manually at every level. Components call useChat() to access it.
const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  // Pull in the file system so we can pass the current file state with every
  // message and route Claude's tool calls to the right file operations.
  const { fileSystem, handleToolCall } = useFileSystem();

  // useAIChat (from Vercel AI SDK) manages the full chat lifecycle:
  // - `messages` is the running conversation history
  // - `handleSubmit` POSTs to /api/chat and streams the response back
  // - `status` reflects whether the model is currently generating
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
  } = useAIChat({
    api: "/api/chat",
    initialMessages,
    // `body` is merged into every POST request so the server always has the
    // latest file state and knows which project to save the response to.
    body: {
      files: fileSystem.serialize(),
      projectId,
    },
    // When Claude calls a tool mid-response, the SDK fires this callback
    // so the client can execute the tool and update the UI immediately.
    onToolCall: ({ toolCall }) => {
      handleToolCall(toolCall);
    },
  });

  // For anonymous users (no projectId), persist work-in-progress to
  // localStorage so it isn't lost if the page is refreshed.
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        handleInputChange,
        handleSubmit,
        status,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook that wraps useContext. The error throw ensures components always
// call this inside the provider tree — catches wiring mistakes at dev time.
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}