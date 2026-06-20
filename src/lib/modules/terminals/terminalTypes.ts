export interface TerminalHotspot {
  name: string; // np. "1", "2", "3", "N", "PE"
  x: number;    // Relatywne X w pikselach
  y: number;    // Relatywne Y w pikselach
  type: "phase" | "neutral" | "pe";
  isTop: boolean;
  direction?: "top" | "bottom" | "left" | "right" | "auto-horizontal" | "auto-vertical";
  radius?: number;
  visualInset?: number;
  exitOffset?: number;
}
