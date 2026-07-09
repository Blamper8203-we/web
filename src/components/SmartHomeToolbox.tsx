import './SmartHomeToolbox.css';

export type ToolMode = "select" | "draw";

interface SmartHomeToolboxProps {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  onDeleteSelected: () => void;
  gridSnap: boolean;
  onGridSnapChange: (snap: boolean) => void;
  orthoMode: boolean;
  onOrthoModeChange: (ortho: boolean) => void;
  objectSnap: boolean;
  onObjectSnapChange: (osnap: boolean) => void;
}

export function SmartHomeToolbox({
  mode,
  onModeChange,
  onDeleteSelected,
  gridSnap,
  onGridSnapChange,
  orthoMode,
  onOrthoModeChange,
  objectSnap,
  onObjectSnapChange
}: SmartHomeToolboxProps) {
  return (
    <div className="smarthome-toolbox" onPointerDown={(e) => e.stopPropagation()}>
      <div className="smarthome-toolbox-header">TOOLBOX</div>
      
      <button 
        className={`smarthome-toolbox-button ${mode === "draw" ? "active" : ""}`}
        onClick={() => onModeChange("draw")}
        title="Draw Line"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19L19 5" />
          <circle cx="5" cy="19" r="2" fill="currentColor" stroke="none" />
          <path d="M19 5 l-4 0 m4 0 l0 4" />
        </svg>
        Draw Line
      </button>

      <button 
        className={`smarthome-toolbox-button ${mode === "select" ? "active" : ""}`}
        onClick={() => onModeChange("select")}
        title="Select"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4l16 7-6 2-3 8z" />
        </svg>
        Select
      </button>

      <button 
        className="smarthome-toolbox-button"
        onClick={onDeleteSelected}
        title="Delete"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
        Delete
      </button>

      <button 
        className={`smarthome-toolbox-button ${gridSnap ? "active" : ""}`}
        onClick={() => onGridSnapChange(!gridSnap)}
        title="Grid Snap"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18" />
          {gridSnap && <circle cx="15" cy="15" r="2" fill="currentColor" stroke="currentColor" />}
          {gridSnap && <circle cx="9" cy="9" r="2" fill="currentColor" stroke="currentColor" />}
        </svg>
        Grid Snap
      </button>

      <button 
        className={`smarthome-toolbox-button ${orthoMode ? "active" : ""}`}
        onClick={() => onOrthoModeChange(!orthoMode)}
        title="Ortho Mode (Kąty proste)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16M4 4v16" />
        </svg>
        ORTO
      </button>

      <button 
        className={`smarthome-toolbox-button ${objectSnap ? "active" : ""}`}
        onClick={() => onObjectSnapChange(!objectSnap)}
        title="Object Snap (Przyciąganie do pinów)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8h8M20 12v-8h-8" />
          <circle cx="12" cy="12" r="3" fill={objectSnap ? "currentColor" : "none"} stroke="currentColor" />
        </svg>
        OSNAP
      </button>
    </div>
  );
}
