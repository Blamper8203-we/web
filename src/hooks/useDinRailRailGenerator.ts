import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generateDinRailSvg,
  getDinRailDimensions,
  type DinRailConfig,
} from "../lib/schematic/dinRailGenerator";
import {
  DEFAULT_CONFIG,
  DIN_RAIL_PREVIEW_CANVAS_HEIGHT,
  DIN_RAIL_PREVIEW_CANVAS_WIDTH,
  DIN_RAIL_PREVIEW_MARGIN_X,
  DIN_RAIL_PREVIEW_MARGIN_Y,
} from "../lib/dinRailCanvas/constants";

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value) || fallback));
}

interface UseDinRailRailGeneratorArgs {
  railConfig: DinRailConfig;
  isRailVisible: boolean;
  generatorRequest?: number;
  onGenerate: (
    config: DinRailConfig,
    svg: string,
    width: number,
    height: number,
  ) => void;
}

export interface UseDinRailRailGeneratorResult {
  isGeneratorOpen: boolean;
  draftConfig: DinRailConfig;
  openGenerator: () => void;
  closeGenerator: () => void;
  updateRows: (value: string) => void;
  updateModulesPerRow: (value: string) => void;
  generateRail: () => void;
  previewSvg: string;
  previewDims: { height: number; width: number };
  previewScale: number;
  totalModules: number;
}

export function useDinRailRailGenerator({
  railConfig,
  isRailVisible,
  generatorRequest = 0,
  onGenerate,
}: UseDinRailRailGeneratorArgs): UseDinRailRailGeneratorResult {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState<DinRailConfig>(
    isRailVisible ? railConfig : DEFAULT_CONFIG,
  );
  // WHY: inicjalizujemy lastSeenRequest aktualną wartością generatorRequest,
  // nie 0. Bez tego useEffect poniżej widzi "nieznaną" wartość przy mount
  // i otwiera dialog na starcie, nawet jeśli user tylko przełączył kartę
  // (np. wrócił z PDF do Szyny DIN). Repro: wygeneruj szynę, przejdź do
  // PDF, wróć — dialog się pojawia, bo canvas re-mountuje i lastSeenRequest
  // startuje od 0, ale generatorRequest w parencie zachowuje inkrementowaną
  // wartość z poprzedniego trigger.
  const [lastSeenRequest, setLastSeenRequest] = useState(generatorRequest);

  const openGenerator = useCallback(() => {
    setDraftConfig(isRailVisible ? railConfig : DEFAULT_CONFIG);
    setIsGeneratorOpen(true);
  }, [isRailVisible, railConfig]);

  const closeGenerator = useCallback(() => {
    setIsGeneratorOpen(false);
  }, []);

  useEffect(() => {
    if (generatorRequest === lastSeenRequest) return;
    setLastSeenRequest(generatorRequest);
    openGenerator();
  }, [generatorRequest, lastSeenRequest, openGenerator]);

  const updateRows = useCallback((value: string) => {
    if (value.trim() === "") {
      setDraftConfig((prev) => ({ ...prev, rows: "" as unknown as number }));
      return;
    }
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    setDraftConfig((prev) => ({ ...prev, rows: parsed }));
  }, []);

  const updateModulesPerRow = useCallback((value: string) => {
    if (value.trim() === "") {
      setDraftConfig((prev) => ({ ...prev, modulesPerRow: "" as unknown as number }));
      return;
    }
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    setDraftConfig((prev) => ({ ...prev, modulesPerRow: parsed }));
  }, []);

  const generateRail = useCallback(() => {
    const normalizedConfig: DinRailConfig = {
      rows: clampInt(draftConfig.rows, 1, 10, 1),
      modulesPerRow: clampInt(draftConfig.modulesPerRow, 6, 48, 6),
    };
    const svg = generateDinRailSvg(normalizedConfig);
    const dims = getDinRailDimensions(
      normalizedConfig.rows,
      normalizedConfig.modulesPerRow,
    );
    onGenerate(normalizedConfig, svg, dims.width, dims.height);
    setIsGeneratorOpen(false);
  }, [draftConfig.modulesPerRow, draftConfig.rows, onGenerate]);

  const safePreviewConfig = useMemo<DinRailConfig>(() => ({
    rows: Math.max(1, draftConfig.rows || 1),
    modulesPerRow: Math.max(6, draftConfig.modulesPerRow || 6),
  }), [draftConfig]);

  const previewSvg = useMemo(
    () => generateDinRailSvg(safePreviewConfig),
    [safePreviewConfig],
  );
  const previewDims = useMemo(
    () => getDinRailDimensions(safePreviewConfig.rows, safePreviewConfig.modulesPerRow),
    [safePreviewConfig],
  );
  const previewScale = useMemo(
    () => Math.min(
      (DIN_RAIL_PREVIEW_CANVAS_WIDTH - DIN_RAIL_PREVIEW_MARGIN_X * 2) / previewDims.width,
      (DIN_RAIL_PREVIEW_CANVAS_HEIGHT - DIN_RAIL_PREVIEW_MARGIN_Y * 2) / previewDims.height,
      1,
    ),
    [previewDims.height, previewDims.width],
  );

  const totalModules = isRailVisible
    ? railConfig.rows * railConfig.modulesPerRow
    : (draftConfig.rows || 1) * (draftConfig.modulesPerRow || 6);

  return {
    isGeneratorOpen,
    draftConfig,
    openGenerator,
    closeGenerator,
    updateRows,
    updateModulesPerRow,
    generateRail,
    previewSvg,
    previewDims,
    previewScale,
    totalModules,
  };
}
