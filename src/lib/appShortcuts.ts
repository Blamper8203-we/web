export interface GlobalAppShortcutHandlers {
  openHelp: () => void;
  newProject: () => void;
  openProject: () => void;
  saveProject: (asNew: boolean) => void;
  print: () => void;
  resetSchematicViewport: () => void;
}

export type GlobalAppShortcutEvent = Pick<
  KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "shiftKey" | "target" | "preventDefault" | "defaultPrevented"
>;

export function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") {
    return false;
  }

  const candidate = target as { closest?: (selector: string) => unknown };
  if (typeof candidate.closest !== "function") {
    return false;
  }

  return Boolean(candidate.closest("input, textarea, select, [contenteditable='true']"));
}

export function handleGlobalAppShortcut(
  event: GlobalAppShortcutEvent,
  handlers: GlobalAppShortcutHandlers,
): boolean {
  if (event.defaultPrevented) {
    return false;
  }

  if (event.key === "F1") {
    event.preventDefault();
    handlers.openHelp();
    return true;
  }

  if (isTextEditingTarget(event.target)) {
    return false;
  }

  const withCommand = event.ctrlKey || event.metaKey;
  if (!withCommand) {
    return false;
  }

  const key = event.key.toLowerCase();
  if (key === "n") {
    event.preventDefault();
    handlers.newProject();
    return true;
  }

  if (key === "o") {
    event.preventDefault();
    handlers.openProject();
    return true;
  }

  if (key === "s") {
    event.preventDefault();
    handlers.saveProject(event.shiftKey);
    return true;
  }

  if (key === "p") {
    event.preventDefault();
    handlers.print();
    return true;
  }

  if (key === "0" && withCommand) {
    event.preventDefault();
    handlers.resetSchematicViewport();
    return true;
  }

  if (key === "home") {
    event.preventDefault();
    handlers.resetSchematicViewport();
    return true;
  }

  return false;
}

