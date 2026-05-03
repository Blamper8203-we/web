import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadImportedModules,
  mergePaletteGroups,
  saveImportedModules,
  upsertImportedModules,
  type ImportedModuleDefinition,
} from '../lib/modules/importedModuleCatalog';
import {
  PALETTE_GROUPS as ASSET_PALETTE_GROUPS,
} from '../lib/modules/moduleCatalog';
import {
  buildPaletteTemplateMap,
  HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY,
} from '../lib/appHelpers';

export function useImportedModules(showTemporaryStatus: (msg: string, ms?: number) => void) {
  const [importedModules, setImportedModules] = useState<ImportedModuleDefinition[]>(() =>
    loadImportedModules(),
  );

  const [hiddenPaletteTemplateIds, setHiddenPaletteTemplateIds] = useState<string[]>(() => {
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
  });

  const [svgImportDialogOpen, setSvgImportDialogOpen] = useState(false);
  const [importedModulesManagerOpen, setImportedModulesManagerOpen] = useState(false);
  const [activePaletteGroupTitle, setActivePaletteGroupTitle] = useState('');

  const paletteGroups = useMemo(() => {
    const hiddenSet = new Set(hiddenPaletteTemplateIds);
    return mergePaletteGroups(ASSET_PALETTE_GROUPS, importedModules)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !hiddenSet.has(item.templateId)),
      }))
      .filter((group) => group.items.length > 0);
  }, [hiddenPaletteTemplateIds, importedModules]);

  const paletteTemplateMap = useMemo(() => buildPaletteTemplateMap(paletteGroups), [paletteGroups]);

  const importedModuleCategoryOptions = useMemo(() => {
    const options = new Set<string>(ASSET_PALETTE_GROUPS.map((g) => g.title));
    for (const mod of importedModules) options.add(mod.category);
    return Array.from(options).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [importedModules]);

  // Keep active tab valid when groups change
  useEffect(() => {
    if (activePaletteGroupTitle && paletteGroups.some((g) => g.title === activePaletteGroupTitle)) {
      return;
    }
    setActivePaletteGroupTitle(paletteGroups[0]?.title ?? '');
  }, [activePaletteGroupTitle, paletteGroups]);

  // Persist state
  useEffect(() => {
    saveImportedModules(importedModules);
  }, [importedModules]);

  useEffect(() => {
    window.localStorage.setItem(
      HIDDEN_PALETTE_TEMPLATE_IDS_STORAGE_KEY,
      JSON.stringify(hiddenPaletteTemplateIds),
    );
  }, [hiddenPaletteTemplateIds]);

  const handleHidePaletteTemplate = useCallback((templateId: string) => {
    setHiddenPaletteTemplateIds((prev) => (prev.includes(templateId) ? prev : [...prev, templateId]));
  }, []);

  const handleSvgImportCommit = useCallback(
    (modules: ImportedModuleDefinition[], preferredCategory: string) => {
      if (modules.length === 0) {
        showTemporaryStatus('Nie wybrano zadnych modulow do importu.', 4000);
        return;
      }
      setImportedModules((prev) => upsertImportedModules(prev, modules));
      setActivePaletteGroupTitle(preferredCategory);
      setSvgImportDialogOpen(false);
      showTemporaryStatus(
        `Zaimportowano ${modules.length} modul${modules.length === 1 ? '' : 'y'} SVG`,
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
      showTemporaryStatus('Usunieto importowany modul SVG', 3000);
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
