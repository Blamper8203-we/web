import { useCallback, useState } from "react";
import { getPaletteTemplateDimensions, supportsDinRailPlacement } from "../../lib/modules/moduleCatalog";
import type { WorldPoint } from "../../lib/dinRailCanvas/types";
import type { DinRailCanvasRail } from "../../components/DinRailCanvasPixi";

export function useDinRailDragDrop({
  rail,
  getPaletteTemplate,
  snapModulePlacement,
  screenToWorld,
  onPaletteDrop,
  onUnsupportedTemplateDrop,
}: {
  rail: DinRailCanvasRail;
  getPaletteTemplate?: (templateId: string) => { category?: string; moduleRef?: string; modules: number } | undefined;
  snapModulePlacement: (x: number, y: number, w: number, h: number, id?: string, opts?: any) => { x: number; y: number };
  screenToWorld: (clientX: number, clientY: number) => WorldPoint;
  onPaletteDrop?: (templateId: string, x: number, y: number, options?: { snapToRail?: boolean }) => void;
  onUnsupportedTemplateDrop?: (templateId: string) => void;
}) {
  const [isDropTarget, setIsDropTarget] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const types = Array.from(event.dataTransfer.types).map((type) => type.toLowerCase());
    const supportsPalettePayload =
      types.includes("application/x-dinboard-palette")
      || types.includes("text/plain");

    if (!rail.isVisible || !supportsPalettePayload) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDropTarget(true);
  }, [rail.isVisible]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!rail.isVisible) {
      return;
    }

    const templateId =
      event.dataTransfer.getData("application/x-dinboard-palette")
      || event.dataTransfer.getData("text/plain");
    const template = getPaletteTemplate?.(templateId);
    if (!template) {
      setIsDropTarget(false);
      return;
    }

    if (!supportsDinRailPlacement(template)) {
      if (template.category === "Listwy do rozdzielnicy") {
        event.preventDefault();
        const world = screenToWorld(event.clientX, event.clientY);
        const size = getPaletteTemplateDimensions(template);
        const snapped = snapModulePlacement(world.x, world.y, size.width, size.height, undefined, {
          forceSnapToRail: true,
          moduleRef: template.moduleRef,
        });
        onPaletteDrop?.(templateId, snapped.x, snapped.y, { snapToRail: true });
        setIsDropTarget(false);
        return;
      }

      event.preventDefault();
      setIsDropTarget(false);
      onUnsupportedTemplateDrop?.(templateId);
      return;
    }

    event.preventDefault();
    const world = screenToWorld(event.clientX, event.clientY);
    const size = getPaletteTemplateDimensions(template);
    const snapped = snapModulePlacement(world.x, world.y, size.width, size.height, undefined, {
      forceSnapToRail: true,
      moduleRef: template.moduleRef,
    });
    onPaletteDrop?.(templateId, snapped.x, snapped.y, { snapToRail: true });
    setIsDropTarget(false);
  }, [getPaletteTemplate, onPaletteDrop, onUnsupportedTemplateDrop, rail.isVisible, screenToWorld, snapModulePlacement]);

  const handleDragLeave = useCallback(() => {
    setIsDropTarget(false);
  }, []);

  return {
    isDropTarget,
    handleDragOver,
    handleDrop,
    handleDragLeave,
  };
}
