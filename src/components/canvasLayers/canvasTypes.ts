export interface WorldRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface NormalizedRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export type InteractionState =
  | { mode: "idle" }
  | { lastX: number; lastY: number; mode: "pan" }
  | {
      anchorWorld: WorldPoint;
      mode: "select";
    }
  | {
      anchorId: string;
      anchorRectStart: WorldRect;
      dragIds: string[];
      mode: "drag";
      pointerWorldStart: WorldPoint;
      startPositions: Map<string, WorldPoint>;
    };

export function buildWorldRectStyle(rect: WorldRect): React.CSSProperties {
  return {
    position: "absolute",
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

export function expandRect(rect: WorldRect, padding: number): WorldRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}
