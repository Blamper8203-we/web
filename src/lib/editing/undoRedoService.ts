export interface IUndoableCommand {
  execute(): void;
  undo(): void;
  label: string;
}

export class UndoRedoService {
  private _undoStack: IUndoableCommand[] = [];
  private _redoStack: IUndoableCommand[] = [];
  private readonly _maxHistoryDepth = 50;

  get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  get undoCount(): number {
    return this._undoStack.length;
  }

  get redoCount(): number {
    return this._redoStack.length;
  }

  get undoLabel(): string | null {
    return this._undoStack[this._undoStack.length - 1]?.label ?? null;
  }

  get redoLabel(): string | null {
    return this._redoStack[this._redoStack.length - 1]?.label ?? null;
  }

  execute(command: IUndoableCommand): void {
    command.execute();
    this._undoStack.push(command);
    this._redoStack = [];
    this._trimHistory();
  }

  undo(): boolean {
    if (this._undoStack.length === 0) {
      return false;
    }

    const command = this._undoStack.pop()!;
    command.undo();
    this._redoStack.push(command);
    return true;
  }

  redo(): boolean {
    if (this._redoStack.length === 0) {
      return false;
    }

    const command = this._redoStack.pop()!;
    command.execute();
    this._undoStack.push(command);
    return true;
  }

  clear(): void {
    this._undoStack = [];
    this._redoStack = [];
  }

  private _trimHistory(): void {
    while (this._undoStack.length > this._maxHistoryDepth) {
      this._undoStack.shift();
    }
  }
}

/**
 * Generic command created from execute/undo lambdas.
 * Most commonly used for complex operations like drag-drop
 * that need to capture before/after state snapshots.
 */
export function createActionCommand(
  label: string,
  executeFn: () => void,
  undoFn: () => void,
): IUndoableCommand {
  return {
    label,
    execute: executeFn,
    undo: undoFn,
  };
}
