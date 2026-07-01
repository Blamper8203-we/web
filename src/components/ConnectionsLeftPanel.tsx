import { useTranslation } from "react-i18next";
import type { WireColor, WireType, RoutingMode, FerruleColor } from "../types/connectionItem";
import { DEFAULT_CUSTOM_RADIUS } from "../lib/connections/connectionsLogic";

interface ConnectionsLeftPanelProps {
  defaultWireSettings: {
    wireColor: WireColor;
    wireCrossSection: number;
    wireType: WireType;
    routingMode: RoutingMode;
    ferruleColor?: FerruleColor;
  };
  onChangeDefaultWireSettings: (settings: {
    wireColor: WireColor;
    wireCrossSection: number;
    wireType: WireType;
    routingMode: RoutingMode;
    ferruleColor?: FerruleColor;
  }) => void;
  selectedConnectionId?: string | null;
  connections?: import("../types/connectionItem").ConnectionItem[];
  onConnectionsChange?: (newConnections: import("../types/connectionItem").ConnectionItem[], label: string, statusMsg: string) => void;
}

const WIRE_COLORS: Array<{ value: WireColor; label: string; hex: string }> = [
  { value: "black", label: "Czarny (L)", hex: "#111827" },
  { value: "brown", label: "Brązowy (L)", hex: "#78350f" },
  { value: "grey", label: "Szary (L)", hex: "#6b7280" },
  { value: "blue", label: "Niebieski (N)", hex: "#3b82f6" },
  { value: "green-yellow", label: "Żółto-Zielony (PE)", hex: "repeating-linear-gradient(45deg, #eab308, #eab308 10px, #22c55e 10px, #22c55e 20px)" },
  { value: "red", label: "Czerwony (Sterowanie)", hex: "#ef4444" },
];

const FERRULE_COLORS: Array<{ value: FerruleColor; label: string; hex: string }> = [
  { value: "none", label: "Brak", hex: "transparent" },
  { value: "auto", label: "Auto (DIN)", hex: "linear-gradient(45deg, #171717, #1d4ed8, #b91c1c)" },
  { value: "white", label: "Biała", hex: "#dddddd" },
  { value: "grey", label: "Szara", hex: "#666666" },
  { value: "red", label: "Czerwona", hex: "#b91c1c" },
  { value: "blue", label: "Niebieska", hex: "#1d4ed8" },
  { value: "yellow", label: "Żółta", hex: "#eab308" },
  { value: "black", label: "Czarna", hex: "#171717" },
  { value: "brown", label: "Brązowa", hex: "#6b3410" },
];

const WIRE_CROSS_SECTIONS = [1.5, 2.5, 4.0, 6.0, 10.0, 16.0];

const WIRE_TYPES: Array<{ value: WireType; label: string }> = [
  { value: "LgY", label: "Linka (LgY)" },
];

export function ConnectionsLeftPanel({
  defaultWireSettings,
  onChangeDefaultWireSettings,
  selectedConnectionId,
  connections,
  onConnectionsChange,
}: ConnectionsLeftPanelProps) {
  const { t } = useTranslation();
  const updateSetting = <K extends keyof ConnectionsLeftPanelProps["defaultWireSettings"]>(
    key: K,
    value: ConnectionsLeftPanelProps["defaultWireSettings"][K]
  ) => {
    onChangeDefaultWireSettings({
      ...defaultWireSettings,
      [key]: value,
    });
  };

  const selectedConnection = connections?.find((c) => c.id === selectedConnectionId);

  const handleUpdateSelected = <K extends keyof import("../types/connectionItem").ConnectionItem>(
    key: K,
    value: import("../types/connectionItem").ConnectionItem[K]
  ) => {
    if (!selectedConnection || !connections || !onConnectionsChange) return;
    const nextConnections = connections.map((conn) => {
      if (conn.id === selectedConnection.id) {
        return { ...conn, [key]: value };
      }
      return conn;
    });
    onConnectionsChange(nextConnections, "Edycja przewodu", "Zmieniono właściwości połączenia");
  };

  const handleDeleteSelected = () => {
    if (!selectedConnection || !connections || !onConnectionsChange) return;
    const nextConnections = connections.filter((conn) => conn.id !== selectedConnection.id);
    onConnectionsChange(nextConnections, t("app.connectionsLeftPanel.deleteAction", "Usunięcie przewodu"), t("app.connectionsLeftPanel.deleteStatus", "Usunięto zaznaczone połączenie"));
  };

  return (
    <div className="palette-sidebar" style={{ display: "flex", flexDirection: "column", flex: 1, gap: "20px", padding: "16px", overflowY: "auto" }}>
      
      {/* NAGŁÓWEK PANELU (TRYB PRZEWODNIKA) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "16px", borderBottom: "1px solid var(--panel-border)" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("app.connectionsLeftPanel.modeTitle", "Tryb przewodnika")}
        </h2>
        <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
          {t("app.connectionsLeftPanel.modeDesc", "Konfiguracja okablowania i połączeń szyny DIN")}
        </p>
      </div>

      {/* SEKCJA ZAZNACZONEGO PRZEWODU (EDYCJA LOKALNA) */}
      {selectedConnection && (
        <div className="sidebar-section" style={{ background: "rgba(59, 130, 246, 0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
          <h3 className="section-title" style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-primary)", marginBottom: "12px" }}>
            {t("app.connectionsLeftPanel.selectedTitle", "Zaznaczony przewód")}
          </h3>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "16px" }}>
            {t("app.connectionsLeftPanel.selectedDesc", "Zmieniasz właściwości wyłącznie dla wybranego przewodu.")}
          </p>

          {/* Promień zagięcia (dla zaznaczonego) */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "var(--text-main)" }}>
              {t("app.connectionsLeftPanel.radiusLabel", "Promień zagięcia (Radius)")}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="range"
                min="0"
                max="200"
                step="4"
                value={selectedConnection.customRadius ?? DEFAULT_CUSTOM_RADIUS}
                onChange={(e) => handleUpdateSelected("customRadius", parseInt(e.target.value, 10))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", width: "30px", textAlign: "right" }}>
                {selectedConnection.customRadius ?? DEFAULT_CUSTOM_RADIUS}
              </span>
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <button
              onClick={handleDeleteSelected}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {t("app.connectionsLeftPanel.deleteButton", "Usuń przewód")}
            </button>
          </div>
          
          <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)", margin: "16px 0" }} />
        </div>
      )}

      {/* SEKCJA USTAWIEN DOMYSLNYCH */}
      <div className="sidebar-section">
        <h3 className="section-title" style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-primary)", marginBottom: "12px" }}>
          {t("app.connectionsLeftPanel.newWireTitle", "Ustawienia nowego przewodu")}
        </h3>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>
          {t("app.connectionsLeftPanel.newWireDesc", "Wybierz domyślne parametry. Nowo narysowane połączenia będą tworzone z tymi właściwościami.")}
        </p>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)", margin: "4px 0" }} />

      {/* Kolor przewodu */}
      <div className="sidebar-section">
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "8px", color: "var(--text-main)" }}>
          {t("app.connectionsLeftPanel.wireColorLabel", "Kolor izolacji")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {WIRE_COLORS.map((color) => {
            const isSelected = defaultWireSettings.wireColor === color.value;
            const localizedLabel = t(`app.connectionsLeftPanel.wireColors.${color.value}`, color.label);
            return (
              <button
                key={color.value}
                type="button"
                onClick={() => updateSetting("wireColor", color.value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 4px",
                  borderRadius: "6px",
                  background: isSelected ? "var(--accent-primary-soft)" : "var(--bg-card)",
                  border: isSelected ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-color)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title={localizedLabel}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: color.hex,
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    marginBottom: "6px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                  }}
                />
                <span style={{ fontSize: "10px", color: "var(--text-main)", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                  {color.value === "green-yellow" ? t("app.connectionsLeftPanel.wireColors.peShort", "Żół-Ziel") : localizedLabel.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)", margin: "4px 0" }} />

      {/* Kolor tulejki */}
      <div className="sidebar-section">
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "8px", color: "var(--text-main)" }}>
          {t("app.connectionsLeftPanel.ferruleColorLabel", "Kolor tulejki (LgY)")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
          {FERRULE_COLORS.map((color) => {
            const isSelected = (defaultWireSettings.ferruleColor || "none") === color.value;
            const localizedLabel = t(`app.connectionsLeftPanel.ferruleColors.${color.value}`, color.label);
            return (
              <button
                key={color.value}
                type="button"
                onClick={() => updateSetting("ferruleColor", color.value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 4px",
                  borderRadius: "6px",
                  background: isSelected ? "var(--accent-primary-soft)" : "var(--bg-card)",
                  border: isSelected ? "1px solid var(--accent-primary)" : "1px solid var(--panel-border)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: color.hex,
                    marginBottom: "4px",
                    border: color.value === "none" || color.value === "white" ? "1px solid #ccc" : "none",
                    position: "relative"
                  }}
                >
                  {color.value === "none" && (
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(45deg)", width: "18px", height: "1px", background: "#ff4444" }} />
                  )}
                </div>
                <span style={{ fontSize: "10px", fontWeight: 500, color: isSelected ? "var(--accent-primary)" : "var(--text-secondary)", textAlign: "center", lineHeight: 1.1 }}>
                  {localizedLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)", margin: "4px 0" }} />

      {/* Przekrój przewodu */}
      <div className="sidebar-section">
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "8px", color: "var(--text-main)" }}>
          {t("app.connectionsLeftPanel.crossSectionLabel", "Przekrój poprzeczny")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {WIRE_CROSS_SECTIONS.map((size) => {
            const isSelected = defaultWireSettings.wireCrossSection === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => updateSetting("wireCrossSection", size)}
                style={{
                  padding: "8px 0",
                  borderRadius: "6px",
                  background: isSelected ? "var(--accent-primary-soft)" : "var(--bg-card)",
                  border: isSelected ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  fontSize: "12px",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {size.toFixed(1)} mm²
              </button>
            );
          })}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)", margin: "4px 0" }} />

      {/* Typ przewodu */}
      <div className="sidebar-section">
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "8px", color: "var(--text-main)" }}>
          {t("app.connectionsLeftPanel.wireTypeLabel", "Typ przewodnika")}
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {WIRE_TYPES.map((type) => {
            const isSelected = defaultWireSettings.wireType === type.value;
            const localizedLabel = t(`app.connectionsLeftPanel.wireTypes.${type.value}`, type.label);
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateSetting("wireType", type.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  background: isSelected ? "var(--accent-primary-soft)" : "var(--bg-card)",
                  border: isSelected ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  fontSize: "12.5px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: isSelected ? "var(--accent-primary)" : "transparent",
                    border: "1px solid var(--text-tertiary)",
                    marginRight: "10px",
                  }}
                />
                {localizedLabel}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
