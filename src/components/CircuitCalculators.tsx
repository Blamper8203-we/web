import { useMemo } from "react";
import { AppIcon } from "./AppIcon";
import { calculateCurrent } from "../lib/phaseDistribution/phaseDistributionCalculator";

interface CircuitCalculatorsProps {
  values: Record<string, string | number | boolean>;
  moduleType: "mcb" | "rcbo" | "socket" | "other";
}

export function CircuitCalculators({ values, moduleType }: CircuitCalculatorsProps) {
  if (moduleType !== "mcb" && moduleType !== "rcbo" && moduleType !== "socket") {
    return null;
  }

  const results = useMemo(() => {
    // Extract raw values
    const powerW = Number(values.PowerW) || 0;
    const phase = String(values.Phase || "L1");
    const protectionType = String(values.ProtectionType || "B16");
    const cableLength = Number(values.CableLength) || 0;
    const cableCrossSection = Number(values.CableCrossSection) || 0;

    // 1. Current (Ib)
    const currentA = calculateCurrent(powerW, phase, 230);

    // 2. Voltage drop (dU)
    let voltageDropV = 0;
    let voltageDropPercent = 0;
    if (cableLength > 0 && cableCrossSection > 0 && currentA > 0) {
      const is3Phase = phase.includes("L1+L2+L3") || phase === "3F";
      const rho = 0.0175;
      
      if (is3Phase) {
        voltageDropV = (Math.sqrt(3) * currentA * cableLength * rho) / cableCrossSection;
        voltageDropPercent = (voltageDropV / 400) * 100;
      } else {
        voltageDropV = (2 * currentA * cableLength * rho) / cableCrossSection;
        voltageDropPercent = (voltageDropV / 230) * 100;
      }
    }

    // 3. Short circuit loop impedance (Zs max & Cable Z)
    let maxZs = 0;
    let cableZ = 0;
    
    const protMatch = protectionType.match(/([BCDZK])(\d+)/i);
    if (protMatch) {
      const char = protMatch[1].toUpperCase();
      const inA = Number(protMatch[2]);
      
      let multiplier = 5; // Default B
      if (char === "C") multiplier = 10;
      if (char === "D") multiplier = 20;

      const iaA = inA * multiplier; // Prąd wyłączający
      maxZs = 230 / iaA;
    }

    if (cableLength > 0 && cableCrossSection > 0) {
      cableZ = (2 * cableLength * 0.0175) / cableCrossSection;
    }

    return {
      currentA,
      voltageDropPercent,
      maxZs,
      cableZ
    };
  }, [values]);

  const hasData = results.currentA > 0 || results.maxZs > 0;

  if (!hasData) return null;

  return (
    <div className="circuit-calculators">
      <div className="circuit-calculators-title">
        <AppIcon name="cog" size={14} /> Parametry obliczeniowe
      </div>
      <div className="circuit-calculators-grid">
        {results.currentA > 0 && (
          <div className="calc-item">
            <span className="calc-label">Prąd obciążenia (Ib)</span>
            <span className="calc-value">{results.currentA.toFixed(1)} A</span>
          </div>
        )}
        
        {results.voltageDropPercent > 0 && (
          <div className="calc-item">
            <span className="calc-label">Spadek napięcia (dU)</span>
            <span className={`calc-value ${results.voltageDropPercent > 3 ? "text-danger" : ""}`}>
              {results.voltageDropPercent.toFixed(2)} %
            </span>
          </div>
        )}

        {results.maxZs > 0 && (
          <>
            <div className="calc-item">
              <span className="calc-label">Wymagane Zs (max)</span>
              <span className="calc-value">{results.maxZs.toFixed(2)} Ω</span>
            </div>
            {results.cableZ > 0 && (
              <div className="calc-item" title="Impedancja samego przewodu dla tego obwodu">
                <span className="calc-label">Impedancja kabla</span>
                <span className={`calc-value ${results.cableZ > results.maxZs * 0.8 ? "text-warning" : ""}`}>
                  {results.cableZ.toFixed(2)} Ω
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
