import type { ConnectionItem } from "../types/connectionItem";
import type { SymbolItem } from "../types/symbolItem";

interface ConnectionsRightPanelProps {
  connections: ConnectionItem[];
  selectedConnectionId: string | null;
  onConnectionSelect: (id: string | null) => void;
  onConnectionsChange: (newConnections: ConnectionItem[], label: string, statusMsg: string) => void;
  symbols: SymbolItem[];
}

export function ConnectionsRightPanel(_props: ConnectionsRightPanelProps) {
  return (
    <div
      className="right-panel-content"
      style={{ padding: "16px", height: "100%", boxSizing: "border-box" }}
    />
  );
}
