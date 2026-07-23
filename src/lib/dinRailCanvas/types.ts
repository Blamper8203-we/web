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
  | { lastX: number; lastY: number; mode: "pan"; startX: number; startY: number }
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
