import { useEffect } from "react";
import { handleGlobalAppShortcut } from "../../lib/appShortcuts";

interface UseAppEventBindingsProps {
  hasUnsavedChanges: boolean;
  dialog: {
    setIsHelpOpen: (isOpen: boolean) => void;
  };
  triggerNewProject: () => void;
  triggerOpenProject: () => void;
  handleSaveProject: () => Promise<boolean>;
  schematic: {
    requestViewportReset: () => void;
  };
}

export function useAppEventBindings({
  hasUnsavedChanges,
  dialog,
  triggerNewProject,
  triggerOpenProject,
  handleSaveProject,
  schematic,
}: UseAppEventBindingsProps) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      handleGlobalAppShortcut(event, {
        openHelp: () => dialog.setIsHelpOpen(true),
        newProject: triggerNewProject,
        openProject: triggerOpenProject,
        saveProject: handleSaveProject,
        print: () => window.print(),
        resetSchematicViewport: () => schematic.requestViewportReset(),
      });
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [triggerNewProject, triggerOpenProject, handleSaveProject, dialog, schematic]);
}
