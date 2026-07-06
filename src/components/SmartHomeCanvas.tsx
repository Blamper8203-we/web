import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "./AppIcon";
import "./SmartHomeCanvas.css";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * WHY: Osobny typ symbolu Smart Home (niezależny od SymbolItem na szynie DIN).
 * Symbole CAD Smart Home żyją w osobnym stanie — użytkownik dodaje je ręcznie
 * z palety na canvas Smart Home. Przyszła Faza 3 może powiązać je z modułami DIN.
 */
export interface SmartHomeSymbol {
  id: string;
  /** Ścieżka źródłowa do SVG (np. "Symbol AMPIO MSERV-4S.svg") */
  sourceSvgPath: string;
  /** Kod SVG do wyrenderowania wprost na ekranie (dla wybranego bloku) */
  svgContent: string;
  /** Pozycja X na canvas (world coords) */
  x: number;
  /** Pozycja Y na canvas (world coords) */
  y: number;
  /** Szerokość symbolu w px (world) */
  width: number;
  /** Wysokość symbolu w px (world) */
  height: number;
  /** Obrót symbolu w stopniach */
  rotation?: number;
  /** Nazwa wyświetlana */
  label: string;
}

interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

const ZOOM_FACTOR = 1.12;
const GRID_STEP = 50; // px at zoom=1

// ── Component ────────────────────────────────────────────────────────────────

interface SmartHomeCanvasProps {
  symbols: SmartHomeSymbol[];
  onSymbolsChange: (symbols: SmartHomeSymbol[]) => void;
  onZoomChange?: (zoomPercent: number) => void;
}

import { fetchAndParseCadSymbol } from "../lib/schematic/cadSymbolParser";
import { CAD_SYMBOL_CATALOG } from "../lib/schematic/smartHomeCatalog";

export function SmartHomeCanvas({
  symbols,
  onSymbolsChange,
  onZoomChange,
}: SmartHomeCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Viewport state ──
  const [viewport, setViewport] = useState<ViewportState>({
    panX: 0,
    panY: 0,
    zoom: 1,
  });

  // ── Interaction state ──
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [draggingSymbolId, setDraggingSymbolId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [selectedSymbolIds, setSelectedSymbolIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const [isDropTarget, setIsDropTarget] = useState(false);

  const [mouseWorldPos, setMouseWorldPos] = useState<{ x: number; y: number } | null>(null);

  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") setIsCtrlPressed(true);
      
      // Delete selected symbols
      if ((e.key === "Delete" || e.key === "Backspace") && selectedSymbolIdsRef.current.length > 0) {
        // Prevent deletion if typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          onSymbolsChange(symbolsRef.current.filter(s => !selectedSymbolIdsRef.current.includes(s.id)));
          setSelectedSymbolIds([]);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") setIsCtrlPressed(false);
    };
    const handleBlur = () => setIsCtrlPressed(false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // ── Zoom callback ──
  useEffect(() => {
    onZoomChange?.(Math.round(viewport.zoom * 100));
  }, [onZoomChange, viewport.zoom]);

  // ── Screen ↔ World conversions ──
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): [number, number] => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return [0, 0];
      const x = (screenX - rect.left - viewport.panX) / viewport.zoom;
      const y = (screenY - rect.top - viewport.panY) / viewport.zoom;
      return [x, y];
    },
    [viewport],
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number): [number, number] => {
      return [wx * viewport.zoom + viewport.panX, wy * viewport.zoom + viewport.panY];
    },
    [viewport],
  );

  // ── Zoom at point ──
  const zoomAtPoint = useCallback(
    (factor: number, screenX: number, screenY: number) => {
      setViewport((vp) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vp.zoom * factor));
        const ratio = newZoom / vp.zoom;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { ...vp, zoom: newZoom };
        const cx = screenX - rect.left;
        const cy = screenY - rect.top;
        return {
          zoom: newZoom,
          panX: cx - (cx - vp.panX) * ratio,
          panY: cy - (cy - vp.panY) * ratio,
        };
      });
    },
    [],
  );

  const zoomAroundCenter = useCallback(
    (factor: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      zoomAtPoint(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [zoomAtPoint],
  );

  const resetView = useCallback(() => {
    setViewport({ panX: 60, panY: 60, zoom: 1 });
  }, []);

  // ── Wheel zoom & rotation ──
  // Aby uniknąć ciągłego re-bindowania event listenera, korzystamy z refów dla stanu
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;
  const selectedSymbolIdsRef = useRef(selectedSymbolIds);
  selectedSymbolIdsRef.current = selectedSymbolIds;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey && selectedSymbolIdsRef.current.length > 0) {
        // Obracanie zaznaczonych elementów
        const step = e.shiftKey ? 1 : 15; // Precyzyjne 1 stopień z Shiftem, domyślnie co 15 stopni
        const delta = e.deltaY < 0 ? -step : step;
        
        onSymbolsChange(
          symbolsRef.current.map((s) =>
            selectedSymbolIdsRef.current.includes(s.id)
              ? { ...s, rotation: ((s.rotation || 0) + delta + 360) % 360 }
              : s
          )
        );
        return;
      }

      // Default: Zoom
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      zoomAtPoint(factor, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoomAtPoint, onSymbolsChange]);

  // ── Panning, Selection & Dragging ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const isMiddle = e.button === 1;
      const isCtrlLeft = e.button === 0 && (e.ctrlKey || e.metaKey);

      if (isMiddle || isCtrlLeft) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: viewport.panX,
          panY: viewport.panY,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // Left click on empty space → deselect or start selection box
      if (e.button === 0 && !draggingSymbolId) {
        if (!e.shiftKey) {
          setSelectedSymbolIds([]);
        }
        const [wx, wy] = screenToWorld(e.clientX, e.clientY);
        setSelectionBox({ startX: wx, startY: wy, endX: wx, endY: wy });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [viewport.panX, viewport.panY, draggingSymbolId, screenToWorld],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const [wx, wy] = screenToWorld(e.clientX, e.clientY);
      setMouseWorldPos({ x: Math.round(wx), y: Math.round(wy) });

      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setViewport((vp) => ({
          ...vp,
          panX: panStartRef.current.panX + dx,
          panY: panStartRef.current.panY + dy,
        }));
        return;
      }

      if (selectionBox) {
        setSelectionBox(prev => prev ? { ...prev, endX: wx, endY: wy } : null);
        
        const minX = Math.min(selectionBox.startX, wx);
        const maxX = Math.max(selectionBox.startX, wx);
        const minY = Math.min(selectionBox.startY, wy);
        const maxY = Math.max(selectionBox.startY, wy);

        const newSelectedIds = symbols
          .filter(sym => {
            const symRight = sym.x + sym.width;
            const symBottom = sym.y + sym.height;
            return (
              sym.x < maxX && symRight > minX &&
              sym.y < maxY && symBottom > minY
            );
          })
          .map(sym => sym.id);

        if (!e.shiftKey) {
          setSelectedSymbolIds(newSelectedIds);
        } else {
          setSelectedSymbolIds(prev => Array.from(new Set([...prev, ...newSelectedIds])));
        }
        return;
      }

      if (isDraggingSelection) {
        const dx = wx - dragOffsetRef.current.x;
        const dy = wy - dragOffsetRef.current.y;
        
        onSymbolsChange(
          symbols.map((s) => {
            if (selectedSymbolIds.includes(s.id)) {
              const startPos = dragStartPositionsRef.current.get(s.id);
              if (startPos) {
                return { ...s, x: startPos.x + dx, y: startPos.y + dy };
              }
            }
            return s;
          })
        );
      }
    },
    [isPanning, isDraggingSelection, selectionBox, screenToWorld, symbols, selectedSymbolIds, onSymbolsChange],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning) {
        setIsPanning(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
      if (selectionBox) {
        setSelectionBox(null);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
      if (isDraggingSelection) {
        setIsDraggingSelection(false);
        setDraggingSymbolId(null);
        dragStartPositionsRef.current.clear();
      }
    },
    [isPanning, selectionBox, isDraggingSelection],
  );

  // ── Symbol drag start ──
  const handleSymbolPointerDown = useCallback(
    (e: React.PointerEvent, symbolId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      let currentSelected = [...selectedSymbolIds];
      if (e.shiftKey) {
        if (!currentSelected.includes(symbolId)) {
          currentSelected.push(symbolId);
        }
      } else {
        if (!currentSelected.includes(symbolId)) {
          currentSelected = [symbolId];
        }
      }
      setSelectedSymbolIds(currentSelected);

      const [wx, wy] = screenToWorld(e.clientX, e.clientY);
      dragOffsetRef.current = { x: wx, y: wy };
      
      dragStartPositionsRef.current.clear();
      symbols.forEach(s => {
        if (currentSelected.includes(s.id)) {
          dragStartPositionsRef.current.set(s.id, { x: s.x, y: s.y });
        }
      });

      setIsDraggingSelection(true);
      setDraggingSymbolId(symbolId);

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [symbols, screenToWorld, selectedSymbolIds],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDropTarget(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      const templateId =
        e.dataTransfer.getData("application/x-dinboard-palette") ||
        e.dataTransfer.getData("text/plain");
      setIsDropTarget(false);
      if (!templateId) return;

      const catalogEntry = CAD_SYMBOL_CATALOG.find(c => c.id === templateId);
      if (!catalogEntry) return;

      const [wx, wy] = screenToWorld(e.clientX, e.clientY);

      try {
        const parsedBlocks = await fetchAndParseCadSymbol(catalogEntry.sourceSvgPath);
        
        if (parsedBlocks.length > 0) {
          const minX = Math.min(...parsedBlocks.map(b => b.originalX));
          const minY = Math.min(...parsedBlocks.map(b => b.originalY));
          const maxX = Math.max(...parsedBlocks.map(b => b.originalX + b.width));
          const maxY = Math.max(...parsedBlocks.map(b => b.originalY + b.height));
          const totalWidth = maxX - minX;
          const totalHeight = maxY - minY;

          const groupStartX = wx - totalWidth / 2;
          const groupStartY = wy - totalHeight / 2;

          const newSymbols: SmartHomeSymbol[] = parsedBlocks.map((block) => ({
            id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${block.internalId}`,
            sourceSvgPath: catalogEntry.sourceSvgPath,
            svgContent: block.svgContent,
            x: groupStartX + (block.originalX - minX), 
            y: groupStartY + (block.originalY - minY),
            width: block.width,
            height: block.height,
            label: `${catalogEntry.label} (${block.label})`,
            terminals: block.terminals,
          }));
          onSymbolsChange([...symbols, ...newSymbols]);
        } else {
          // Fallback, gdy brak bloków w pliku - obecnie niezaimplementowany w Faza 1.5 dla uproszczenia
          console.warn("Brak wydzielonych bloków w pliku SVG");
        }
      } catch (err) {
        console.error("Błąd podczas ładowania modułu CAD:", err);
      }
    },
    [screenToWorld, symbols, onSymbolsChange],
  );



  // ── Render grid pattern ──
  const gridStyle = (() => {
    const step = GRID_STEP * viewport.zoom;
    if (step < 8) return {}; // WHY: Siatka za gęsta przy dużym odddaleniu — ukryj
    const offsetX = viewport.panX % step;
    const offsetY = viewport.panY % step;
    const lineColor = "rgba(34, 197, 94, 0.06)";
    const dotColor = "rgba(34, 197, 94, 0.12)";

    return {
      backgroundImage: [
        `linear-gradient(${lineColor} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
      ].join(", "),
      backgroundSize: [`${step}px ${step}px`, `${step}px ${step}px`].join(", "),
      backgroundPosition: [
        `${offsetX}px ${offsetY}px`,
        `${offsetX}px ${offsetY}px`,
      ].join(", "),
    };
  })();

  const isEmpty = symbols.length === 0;

  return (
    <div className="smarthome-container">
      <div
        ref={containerRef}
        className={`smarthome-workspace ${isDropTarget ? "is-drop-target" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDropTarget(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setIsDropTarget(true);
        }}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          console.log("SMARTHOME DROP EVENT", e.dataTransfer.types);
          handleDrop(e);
        }}
      >
        {/* Grid */}
        <div className="smarthome-grid" style={gridStyle} />



        {/* Help button */}
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 9999 }}>
          <button 
            type="button" 
            onClick={() => setShowHelp(true)}
            style={{ 
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", background: "#141414", color: "#22c55e", 
              border: "1px solid #22c55e", borderRadius: 4, cursor: "pointer", fontWeight: "bold",
              boxShadow: "0 4px 6px rgba(0,0,0,0.4)"
            }}
          >
            <AppIcon name="help" size={16} /> Pomoc
          </button>
        </div>

        {/* Help Modal */}
        {showHelp && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <div style={{
              background: "#141414", border: "1px solid #22c55e", borderRadius: 8,
              padding: 24, maxWidth: 500, color: "#fff", boxShadow: "0 8px 16px rgba(0,0,0,0.8)"
            }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#22c55e", fontSize: 20 }}>Instrukcja: Schemat Smart Home</h3>
              <ul style={{ paddingLeft: 20, lineHeight: "1.6", color: "#e2e8f0" }}>
                <li><strong>Wstawianie bloków:</strong> Przeciągnij moduł z palety po lewej stronie i upuść na ekran. Aplikacja rozbije go na przesuwne, niezależne logicznie bloki.</li>
                <li><strong>Zaznaczanie:</strong> Kliknij i przeciągnij po pustym tle (bez trzymania klawiszy), aby narysować ramkę (lasso) zaznaczającą wiele bloków. Przytrzymaj <kbd style={{background: "#333", padding: "2px 6px", borderRadius: 4}}>SHIFT</kbd> i klikaj w bloki, by dodać je do zaznaczenia.</li>
                <li><strong>Przesuwanie:</strong> Złap dowolny blok lewym przyciskiem myszy. Jeśli jest ich zaznaczonych więcej, przesuną się całą grupą.</li>
                <li><strong>Obracanie:</strong> Zaznacz blok (lub grupę), przytrzymaj <kbd style={{background: "#333", padding: "2px 6px", borderRadius: 4}}>CTRL</kbd> i kręć rolką myszy. Z <kbd style={{background: "#333", padding: "2px 6px", borderRadius: 4}}>SHIFT</kbd> obrót jest precyzyjny (co 1° zamiast 15°).</li>
                <li><strong>Usuwanie:</strong> Po zaznaczeniu modułów naciśnij <kbd style={{background: "#333", padding: "2px 6px", borderRadius: 4}}>Delete</kbd> lub <kbd style={{background: "#333", padding: "2px 6px", borderRadius: 4}}>Backspace</kbd>, by je usunąć.</li>
                <li><strong>Widok (Pan/Zoom):</strong> Kręć kółkiem bez CTRL, aby przybliżać. Wciśnij środkowy przycisk myszy lub <kbd style={{background: "#333", padding: "2px 6px", borderRadius: 4}}>CTRL + Lewy Przycisk</kbd> aby przesuwać kamerę.</li>
              </ul>
              <button 
                onClick={() => setShowHelp(false)}
                style={{
                  marginTop: 20, width: "100%", padding: "10px", background: "#22c55e", color: "#000",
                  border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer"
                }}
              >
                Rozumiem
              </button>
            </div>
          </div>
        )}

        {/* Canvas interaction layer */}
        <div
          className="smarthome-canvas-layer"
          style={{ cursor: isPanning ? "grabbing" : draggingSymbolId ? "move" : "crosshair" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Selection Box */}
          {selectionBox && (
            <div
              className="smarthome-selection-box"
              style={{
                position: "absolute",
                border: "1px solid rgba(59, 130, 246, 0.8)",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                pointerEvents: "none",
                left: Math.min(worldToScreen(selectionBox.startX, selectionBox.startY)[0], worldToScreen(selectionBox.endX, selectionBox.endY)[0]),
                top: Math.min(worldToScreen(selectionBox.startX, selectionBox.startY)[1], worldToScreen(selectionBox.endX, selectionBox.endY)[1]),
                width: Math.abs(worldToScreen(selectionBox.endX, selectionBox.endY)[0] - worldToScreen(selectionBox.startX, selectionBox.startY)[0]),
                height: Math.abs(worldToScreen(selectionBox.endX, selectionBox.endY)[1] - worldToScreen(selectionBox.startX, selectionBox.startY)[1]),
                zIndex: 1000,
              }}
            />
          )}

          {/* Symbols */}
          {symbols.map((sym) => {
            const [sx, sy] = worldToScreen(sym.x, sym.y);
            const isSelected = selectedSymbolIds.includes(sym.id);
            return (
              <div
                key={sym.id}
                className={`smarthome-symbol ${
                  draggingSymbolId === sym.id ? "is-dragging" : ""
                } ${isSelected ? "is-selected" : ""}`}
                style={{
                  left: sx,
                  top: sy,
                  width: sym.width * viewport.zoom,
                  height: sym.height * viewport.zoom,
                  transform: `rotate(${sym.rotation || 0}deg)`,
                  transformOrigin: "center",
                }}
                onPointerDown={(e) => handleSymbolPointerDown(e, sym.id)}
              >
                {isSelected && isCtrlPressed && (
                  <div 
                    className="smarthome-rotation-hud"
                    style={{ transform: `rotate(${-(sym.rotation || 0)}deg) scale(${1 / viewport.zoom})` }}
                  >
                    <div className="rotation-circle" />
                    <div 
                      className="rotation-line" 
                      style={{ transform: `translateY(-50%) rotate(${sym.rotation || 0}deg)` }} 
                    />
                    <div className="rotation-badge">
                      {sym.rotation || 0}°
                    </div>
                  </div>
                )}
                <div 
                  className="smarthome-symbol-svg-wrapper"
                  dangerouslySetInnerHTML={{ __html: sym.svgContent }} 
                  style={{ width: "100%", height: "100%", pointerEvents: "none" }}
                />
                {sym.terminals && sym.terminals.map(t => {
                  const leftPct = (t.x / sym.width) * 100;
                  const topPct = (t.y / sym.height) * 100;
                  return (
                    <div
                      key={t.id}
                      className="smarthome-terminal-hotspot"
                      style={{
                        position: "absolute",
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: 10,
                        height: 10,
                        transform: "translate(-50%, -50%) scale(1)",
                        borderRadius: "50%",
                        backgroundColor: "rgba(239, 68, 68, 0.7)",
                        border: "1.5px solid #ef4444",
                        cursor: "crosshair",
                        pointerEvents: "auto",
                        boxShadow: "0 0 4px rgba(0,0,0,0.5)",
                        transition: "transform 0.1s"
                      }}
                      title="Terminal"
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.5)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)"; }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="smarthome-empty-state">
            <div className="smarthome-empty-state-icon">
              <AppIcon name="smarthome" size={28} />
            </div>
            <strong>
              {t(
                "app.smarthome.emptyTitle",
                "Schemat Smart Home",
              )}
            </strong>
            <span>
              {t(
                "app.smarthome.emptyHint",
                "Przeciągnij moduł Smart Home z palety po lewej stronie, aby dodać symbol na schemat.",
              )}
            </span>
          </div>
        )}

        {/* Zoom dock */}
        <div className="smarthome-zoom-dock">
          <button type="button" onClick={() => zoomAroundCenter(ZOOM_FACTOR)} title="Powiększ">
            <AppIcon name="zoomIn" size={16} />
          </button>
          <span className="smarthome-zoom-badge">{Math.round(viewport.zoom * 100)}%</span>
          <button type="button" onClick={() => zoomAroundCenter(1 / ZOOM_FACTOR)} title="Pomniejsz">
            <AppIcon name="zoomOut" size={16} />
          </button>
          <button type="button" onClick={resetView} title="Resetuj widok">
            <AppIcon name="zoomFit" size={16} />
          </button>
        </div>

        {/* Coordinate display */}
        {mouseWorldPos && (
          <div className="smarthome-coords">
            X: {mouseWorldPos.x} &nbsp; Y: {mouseWorldPos.y}
          </div>
        )}
      </div>
    </div>
  );
}
