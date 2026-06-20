import { useEffect } from "react";
import { useDebouncedPersist } from "../useDebouncedPersist";
import { PROJECT_METADATA_STORAGE_KEY } from "../../lib/projectMetadata";
import { SYMBOLS_STORAGE_KEY } from "../../lib/appHelpers";
import { safeSetItem } from "../../lib/storageService";
import { reportRuntimeError } from "../../lib/runtimeDiagnostics";
import type { ProjectMetadata } from "../../types/projectMetadata";
import type { SymbolItem } from "../../types/symbolItem";
import type { ConnectionItem, WireColor, WireType, RoutingMode, FerruleColor } from "../../types/connectionItem";

export const LOCAL_STORAGE_WRITE_DEBOUNCE_MS = 250;
export const CONNECTIONS_STORAGE_KEY = "dinboard.connections";
export const UI_THEME_STORAGE_KEY = "dinboard.ui_theme";
export type AppUiTheme = "modern" | "classic";

interface UseAppPersistenceProps {
  metadata: ProjectMetadata;
  symbols: SymbolItem[];
  connections: ConnectionItem[];
  currentWireSettings: {
    wireColor: WireColor;
    wireCrossSection: number;
    wireType: WireType;
    routingMode: RoutingMode;
    ferruleColor?: FerruleColor;
  };
  showDinRailGroups: boolean;
  uiTheme: AppUiTheme;
}

export function useAppPersistence({
  metadata,
  symbols,
  connections,
  currentWireSettings,
  showDinRailGroups,
  uiTheme,
}: UseAppPersistenceProps) {
  useDebouncedPersist(PROJECT_METADATA_STORAGE_KEY, metadata, LOCAL_STORAGE_WRITE_DEBOUNCE_MS);
  useDebouncedPersist(SYMBOLS_STORAGE_KEY, symbols, LOCAL_STORAGE_WRITE_DEBOUNCE_MS);
  useDebouncedPersist(CONNECTIONS_STORAGE_KEY, connections, LOCAL_STORAGE_WRITE_DEBOUNCE_MS);
  useDebouncedPersist("dinboard.default_wire_settings", currentWireSettings, LOCAL_STORAGE_WRITE_DEBOUNCE_MS);
  useDebouncedPersist("dinboard.show_din_rail_groups", showDinRailGroups, LOCAL_STORAGE_WRITE_DEBOUNCE_MS);

  useEffect(() => {
    safeSetItem(UI_THEME_STORAGE_KEY, uiTheme).catch((error) =>
      reportRuntimeError(error, { source: "unhandled-error" })
    );
  }, [uiTheme]);
}
