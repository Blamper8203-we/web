import type { ConnectionItem } from "../types/connectionItem";
import type { SymbolItem } from "../types/symbolItem";
import { CircuitEditPanel } from "./CircuitEditPanel";

interface ConnectionsRightPanelProps {
  connections: ConnectionItem[];
  selectedConnectionId: string | null;
  onConnectionSelect: (id: string | null) => void;
  onConnectionsChange: (newConnections: ConnectionItem[], label: string, statusMsg: string) => void;
  symbols: SymbolItem[];
  selectedSymbol?: SymbolItem | null;
  onSymbolSave?: (nextSymbol: SymbolItem) => void;
  onClearSymbolSelection?: () => void;
}

export function ConnectionsRightPanel({
  symbols,
  selectedSymbol,
  onSymbolSave,
  onClearSymbolSelection,
}: ConnectionsRightPanelProps) {
  return (
    <div
      className="right-panel-content"
      style={{ padding: "8px", height: "100%", boxSizing: "border-box", overflowY: "auto" }}
    >
      <CircuitEditPanel
        symbol={selectedSymbol ?? null}
        symbols={symbols}
        onSave={onSymbolSave ?? (() => {})}
        onClearSelection={onClearSymbolSelection ?? (() => {})}
      />
    </div>
  );
}
