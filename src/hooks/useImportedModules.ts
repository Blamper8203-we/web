import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadImportedModules,
  mergePaletteGroups,
  saveImportedModules,
  upsertImportedModules,
  type ImportedModuleDefinition,
} from '../lib/modules/importedModuleCatalog';
import { reportRuntimeError } from "../lib/runtimeDiagnostics";
import {
  PALETTE_GROUPS as ASSET_PALETTE_GROUPS,
} from '../lib/modules/moduleCatalog';
import { discoverModuleAssets } from '../lib/modules/moduleAssetDiscovery';
import {
  buildPaletteTemplateMap,
  HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY,
} from '../lib/appHelpers';

function loadHiddenPaletteTemplateIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function useImportedModules(showTemporaryStatus: (msg: string, ms?: number) => void) {
  const [importedModules, setImportedModules] = useState<ImportedModuleDefinition[]>(() =>
    loadImportedModules(),
  );
  const [discoveredModules, setDiscoveredModules] = useState<ImportedModuleDefinition[]>([]);
  const [hiddenPaletteTemplateIds, setHiddenPaletteTemplateIds] = useState<string[]>(loadHiddenPaletteTemplateIds);
  const [hasSyncedCatalogStorage, setHasSyncedCatalogStorage] = useState(false);

  const [svgImportDialogOpen, setSvgImportDialogOpen] = useState(false);
  const [importedModulesManagerOpen, setImportedModulesManagerOpen] = useState(false);
  const [activePaletteGroupTitle, setActivePaletteGroupTitle] = useState('');

  const paletteGroups = useMemo(() => {
    const hiddenSet = new Set(hiddenPaletteTemplateIds);
    const importedKeys = new Set(
      importedModules.map((item) => `${item.category}::${item.code}`.toLocaleLowerCase('pl-PL')),
    );
    const visibleDiscoveredModules = discoveredModules.filter((item) => {
      const key = `${item.category}::${item.code}`.toLocaleLowerCase('pl-PL');
      return !importedKeys.has(key);
    });

    return mergePaletteGroups(ASSET_PALETTE_GROUPS, [...visibleDiscoveredModules, ...importedModules])
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !hiddenSet.has(item.templateId)),
      }));
  }, [discoveredModules, hiddenPaletteTemplateIds, importedModules]);

  const paletteTemplateMap = useMemo(() => buildPaletteTemplateMap(paletteGroups), [paletteGroups]);

  const importedModuleCategoryOptions = useMemo(() => {
    const options = new Set<string>(ASSET_PALETTE_GROUPS.map((g) => g.title));
    for (const mod of importedModules) options.add(mod.category);
    for (const mod of discoveredModules) options.add(mod.category);
    return Array.from(options).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [discoveredModules, importedModules]);

  // Keep active tab valid when groups change
  useEffect(() => {
    if (activePaletteGroupTitle && paletteGroups.some((g) => g.title === activePaletteGroupTitle)) {
      return;
    }
    setActivePaletteGroupTitle(paletteGroups[0]?.title ?? '');
  }, [activePaletteGroupTitle, paletteGroups]);

  useEffect(() => {
    setImportedModules((prev) => {
      const nextModules = loadImportedModules();
      return JSON.stringify(prev) === JSON.stringify(nextModules) ? prev : nextModules;
    });
    setHiddenPaletteTemplateIds(loadHiddenPaletteTemplateIds());
    setHasSyncedCatalogStorage(true);
  }, []);

  // Persist state after catalog-version migration has had a chance to clear stale entries.
  useEffect(() => {
    if (!hasSyncedCatalogStorage) {
      return;
    }

    saveImportedModules(importedModules);
  }, [hasSyncedCatalogStorage, importedModules]);

  useEffect(() => {
    let cancelled = false;

    const refreshDiscoveredModules = async () => {
      const nextModules = await discoverModuleAssets(ASSET_PALETTE_GROUPS);
      if (!cancelled) {
        setDiscoveredModules((prev) => {
          const isSame = JSON.stringify(prev) === JSON.stringify(nextModules);
          return isSame ? prev : nextModules;
        });
      }
    };

    void refreshDiscoveredModules();
    const intervalId = window.setInterval(refreshDiscoveredModules, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!hasSyncedCatalogStorage) {
      return;
    }

    try {
      window.localStorage.setItem(
        HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY,
        JSON.stringify(hiddenPaletteTemplateIds),
      );
    } catch (error) {
      reportRuntimeError(error, {
        source: "unhandled-error",
      });
    }
  }, [hasSyncedCatalogStorage, hiddenPaletteTemplateIds]);

  const handleHidePaletteTemplate = useCallback((templateId: string) => {
    setHiddenPaletteTemplateIds((prev) => (prev.includes(templateId) ? prev : [...prev, templateId]));
  }, []);

  const handleSvgImportCommit = useCallback(
    (modules: ImportedModuleDefinition[], preferredCategory: string) => {
      if (modules.length === 0) {
        showTemporaryStatus('Nie wybrano żadnych modułów do importu.', 4000);
        return;
      }
      setImportedModules((prev) => upsertImportedModules(prev, modules));
      setActivePaletteGroupTitle(preferredCategory);
      setSvgImportDialogOpen(false);
      showTemporaryStatus(
        `Zaimportowano ${modules.length} moduł${modules.length === 1 ? '' : 'y'} SVG`,
        4000,
      );
    },
    [showTemporaryStatus],
  );

  const handleImportedModuleCategoryChange = useCallback((moduleId: string, category: string) => {
    setImportedModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, category } : m)),
    );
  }, []);

  const handleRemoveImportedModule = useCallback(
    (moduleId: string) => {
      setImportedModules((prev) => prev.filter((m) => m.id !== moduleId));
      showTemporaryStatus('Usunięto importowany moduł SVG', 3000);
    },
    [showTemporaryStatus],
  );

  return {
    importedModules,
    paletteGroups,
    paletteTemplateMap,
    importedModuleCategoryOptions,
    activePaletteGroupTitle,
    setActivePaletteGroupTitle,
    svgImportDialogOpen,
    setSvgImportDialogOpen,
    importedModulesManagerOpen,
    setImportedModulesManagerOpen,
    hiddenPaletteTemplateIds,
    handleHidePaletteTemplate,
    handleSvgImportCommit,
    handleImportedModuleCategoryChange,
    handleRemoveImportedModule,
  };
}
