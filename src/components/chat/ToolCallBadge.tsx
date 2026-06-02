"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
  state: string;
  result?: any;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

function getFileName(path: string): string {
  return path.split("/").filter(Boolean).pop() || path;
}

export function getToolCallLabel(
  toolName: string,
  args: Record<string, any>
): string {
  const filename = getFileName(args.path || "");

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return `Creating ${filename || "file"}`;
      case "str_replace":
      case "insert":
        return `Editing ${filename || "file"}`;
      case "view":
        return `Reading ${filename || "file"}`;
      case "undo_edit":
        return "Undoing edit";
      default:
        return `Editing ${filename || "file"}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "create_directory":
        return `Creating directory ${filename}`.trim();
      case "delete_file":
        return `Deleting ${filename || "file"}`;
      case "delete_directory":
        return `Deleting directory ${filename}`.trim();
      case "rename":
        return `Renaming ${filename || "file"}`;
      default:
        return toolName;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args, state, result } = toolInvocation;
  const isDone = state === "result" && result;
  const label = getToolCallLabel(toolName, args || {});

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
