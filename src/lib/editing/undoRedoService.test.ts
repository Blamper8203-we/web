import { describe, expect, it, vi } from "vitest";
import { UndoRedoService, createActionCommand } from "./undoRedoService";

describe("UndoRedoService", () => {
  it("starts empty with no undo/redo", () => {
    const service = new UndoRedoService();
    expect(service.canUndo).toBe(false);
    expect(service.canRedo).toBe(false);
    expect(service.undoCount).toBe(0);
    expect(service.redoCount).toBe(0);
    expect(service.undoLabel).toBeNull();
    expect(service.redoLabel).toBeNull();
  });

  it("executes a command and pushes it to undo stack", () => {
    const service = new UndoRedoService();
    const executeFn = vi.fn();
    const undoFn = vi.fn();

    service.execute(createActionCommand("Test", executeFn, undoFn));

    expect(executeFn).toHaveBeenCalledTimes(1);
    expect(undoFn).not.toHaveBeenCalled();
    expect(service.canUndo).toBe(true);
    expect(service.canRedo).toBe(false);
    expect(service.undoLabel).toBe("Test");
  });

  it("undo calls the undo function and pushes to redo stack", () => {
    const service = new UndoRedoService();
    const executeFn = vi.fn();
    const undoFn = vi.fn();

    service.execute(createActionCommand("Test", executeFn, undoFn));
    const result = service.undo();

    expect(result).toBe(true);
    expect(undoFn).toHaveBeenCalledTimes(1);
    expect(service.canUndo).toBe(false);
    expect(service.canRedo).toBe(true);
    expect(service.redoLabel).toBe("Test");
  });

  it("redo calls execute again and pushes back to undo stack", () => {
    const service = new UndoRedoService();
    const executeFn = vi.fn();
    const undoFn = vi.fn();

    service.execute(createActionCommand("Test", executeFn, undoFn));
    service.undo();
    const result = service.redo();

    expect(result).toBe(true);
    expect(executeFn).toHaveBeenCalledTimes(2);
    expect(service.canUndo).toBe(true);
    expect(service.canRedo).toBe(false);
  });

  it("returns false when undoing with empty stack", () => {
    const service = new UndoRedoService();
    const result = service.undo();

    expect(result).toBe(false);
  });

  it("returns false when redoing with empty stack", () => {
    const service = new UndoRedoService();
    const result = service.redo();

    expect(result).toBe(false);
  });

  it("clears redo stack when a new command is executed after undo", () => {
    const service = new UndoRedoService();

    service.execute(createActionCommand("First", vi.fn(), vi.fn()));
    service.execute(createActionCommand("Second", vi.fn(), vi.fn()));
    service.undo();
    service.execute(createActionCommand("Third", vi.fn(), vi.fn()));

    expect(service.canRedo).toBe(false);
    expect(service.redoCount).toBe(0);
    expect(service.undoCount).toBe(2); // First + Third
  });

  it("clear() resets both stacks", () => {
    const service = new UndoRedoService();

    service.execute(createActionCommand("Test", vi.fn(), vi.fn()));
    service.undo();
    service.clear();

    expect(service.canUndo).toBe(false);
    expect(service.canRedo).toBe(false);
    expect(service.undoCount).toBe(0);
    expect(service.redoCount).toBe(0);
  });

  it("trims undo stack to max depth of 50", () => {
    const service = new UndoRedoService();

    for (let i = 0; i < 60; i++) {
      service.execute(createActionCommand(`Command ${i}`, vi.fn(), vi.fn()));
    }

    expect(service.undoCount).toBe(50);
    expect(service.undoLabel).toBe("Command 59");
  });

  it("createActionCommand creates a command with correct label and functions", () => {
    const executeFn = vi.fn();
    const undoFn = vi.fn();
    const cmd = createActionCommand("Custom Label", executeFn, undoFn);

    expect(cmd.label).toBe("Custom Label");
    cmd.execute();
    expect(executeFn).toHaveBeenCalledTimes(1);
    cmd.undo();
    expect(undoFn).toHaveBeenCalledTimes(1);
  });

  it("supports multiple undo/redo cycles", () => {
    const service = new UndoRedoService();
    const history: number[] = [];

    // Push 3 commands
    service.execute(createActionCommand("Add 1", () => history.push(1), () => history.pop()));
    service.execute(createActionCommand("Add 2", () => history.push(2), () => history.pop()));
    service.execute(createActionCommand("Add 3", () => history.push(3), () => history.pop()));

    expect(history).toEqual([1, 2, 3]);

    // Undo twice
    service.undo();
    expect(history).toEqual([1, 2]);
    service.undo();
    expect(history).toEqual([1]);

    // Redo once
    service.redo();
    expect(history).toEqual([1, 2]);

    // Undo then redo back
    service.undo();
    expect(history).toEqual([1]);
    service.redo();
    expect(history).toEqual([1, 2]);
    service.redo();
    expect(history).toEqual([1, 2, 3]);
  });
});
