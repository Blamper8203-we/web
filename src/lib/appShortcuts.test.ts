import { describe, expect, it, vi } from "vitest";
import { handleGlobalAppShortcut, isTextEditingTarget, type GlobalAppShortcutEvent } from "./appShortcuts";

function createEvent(
  overrides: Partial<GlobalAppShortcutEvent> = {},
): { event: GlobalAppShortcutEvent; preventDefault: ReturnType<typeof vi.fn> } {
  const preventDefault = vi.fn();
  const event: GlobalAppShortcutEvent = {
    key: "",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    defaultPrevented: false,
    preventDefault,
    ...overrides,
  };

  return { event, preventDefault };
}

function createHandlers() {
  return {
    openHelp: vi.fn(),
    newProject: vi.fn(),
    openProject: vi.fn(),
    saveProject: vi.fn(),
    print: vi.fn(),
  };
}

describe("isTextEditingTarget", () => {
  it("returns true for editable target", () => {
    const target = {
      closest: vi.fn(() => ({ tagName: "INPUT" })),
    };

    expect(isTextEditingTarget(target as unknown as EventTarget)).toBe(true);
  });

  it("returns false for non-editable target", () => {
    const target = {
      closest: vi.fn(() => null),
    };

    expect(isTextEditingTarget(target as unknown as EventTarget)).toBe(false);
  });
});

describe("handleGlobalAppShortcut", () => {
  it("opens help on F1", () => {
    const handlers = createHandlers();
    const { event, preventDefault } = createEvent({ key: "F1" });

    const handled = handleGlobalAppShortcut(event, handlers);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(handlers.openHelp).toHaveBeenCalledOnce();
  });

  it("opens project on meta+o", () => {
    const handlers = createHandlers();
    const { event } = createEvent({ key: "o", metaKey: true });

    const handled = handleGlobalAppShortcut(event, handlers);

    expect(handled).toBe(true);
    expect(handlers.openProject).toHaveBeenCalledOnce();
  });

  it("creates new project on ctrl+n", () => {
    const handlers = createHandlers();
    const { event } = createEvent({ key: "n", ctrlKey: true });

    const handled = handleGlobalAppShortcut(event, handlers);

    expect(handled).toBe(true);
    expect(handlers.newProject).toHaveBeenCalledOnce();
  });

  it("saves as current file on ctrl+s", () => {
    const handlers = createHandlers();
    const { event } = createEvent({ key: "s", ctrlKey: true });

    const handled = handleGlobalAppShortcut(event, handlers);

    expect(handled).toBe(true);
    expect(handlers.saveProject).toHaveBeenCalledWith(false);
  });

  it("saves as new file on ctrl+shift+s", () => {
    const handlers = createHandlers();
    const { event } = createEvent({ key: "s", ctrlKey: true, shiftKey: true });

    const handled = handleGlobalAppShortcut(event, handlers);

    expect(handled).toBe(true);
    expect(handlers.saveProject).toHaveBeenCalledWith(true);
  });

  it("prints on ctrl+p", () => {
    const handlers = createHandlers();
    const { event } = createEvent({ key: "p", ctrlKey: true });

    const handled = handleGlobalAppShortcut(event, handlers);

    expect(handled).toBe(true);
    expect(handlers.print).toHaveBeenCalledOnce();
  });

  it("ignores command shortcuts while editing text", () => {
    const handlers = createHandlers();
    const target = {
      closest: vi.fn(() => ({ tagName: "INPUT" })),
    };
    const { event } = createEvent({ key: "s", ctrlKey: true, target: target as unknown as EventTarget });

    const handled = handleGlobalAppShortcut(event, handlers);

    expect(handled).toBe(false);
    expect(handlers.saveProject).not.toHaveBeenCalled();
  });

  it("ignores already prevented events", () => {
    const handlers = createHandlers();
    const { event } = createEvent({ key: "F1", defaultPrevented: true });

    const handled = handleGlobalAppShortcut(event, handlers);

    expect(handled).toBe(false);
    expect(handlers.openHelp).not.toHaveBeenCalled();
  });
});

