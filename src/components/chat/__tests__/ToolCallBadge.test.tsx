import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolCallLabel ---

test("getToolCallLabel: str_replace_editor create shows Creating", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace shows Editing", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/components/Card.jsx" })).toBe("Editing Card.jsx");
});

test("getToolCallLabel: str_replace_editor insert shows Editing", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/index.tsx" })).toBe("Editing index.tsx");
});

test("getToolCallLabel: str_replace_editor view shows Reading", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Reading App.jsx");
});

test("getToolCallLabel: str_replace_editor undo_edit shows Undoing edit", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit");
});

test("getToolCallLabel: file_manager create_directory", () => {
  expect(getToolCallLabel("file_manager", { command: "create_directory", path: "/components" })).toBe("Creating directory components");
});

test("getToolCallLabel: file_manager delete_file", () => {
  expect(getToolCallLabel("file_manager", { command: "delete_file", path: "/old.jsx" })).toBe("Deleting old.jsx");
});

test("getToolCallLabel: file_manager delete_directory", () => {
  expect(getToolCallLabel("file_manager", { command: "delete_directory", path: "/utils" })).toBe("Deleting directory utils");
});

test("getToolCallLabel: file_manager rename", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "/Button.jsx" })).toBe("Renaming Button.jsx");
});

test("getToolCallLabel: unknown tool falls back to tool name", () => {
  expect(getToolCallLabel("some_other_tool", { command: "do_thing" })).toBe("some_other_tool");
});

test("getToolCallLabel: extracts filename from nested path", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/src/components/ui/Button.tsx" })).toBe("Creating Button.tsx");
});

test("getToolCallLabel: handles missing path gracefully", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
});

// --- ToolCallBadge rendering ---

test("ToolCallBadge shows green dot when done", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "OK",
      }}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
});

test("ToolCallBadge shows spinner when in progress", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeTruthy();
});

test("ToolCallBadge displays friendly label for file creation", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/Card.jsx" },
        state: "result",
        result: "OK",
      }}
    />
  );
  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
});

test("ToolCallBadge displays friendly label for file editing", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/App.jsx" },
        state: "call",
      }}
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("ToolCallBadge displays friendly label for directory creation", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "file_manager",
        args: { command: "create_directory", path: "/components" },
        state: "call",
      }}
    />
  );
  expect(screen.getByText("Creating directory components")).toBeDefined();
});
