import { useCallback } from "react";

interface UseUnsavedChangesFlowProps {
  hasUnsavedChanges: boolean;
  dialog: {
    unsavedChangesActionType: "new" | "open" | null;
    setUnsavedChangesActionType: (type: "new" | "open" | null) => void;
  };
  handleNewProject: () => void;
  handleOpenProject: () => void;
  handleSaveProject: () => Promise<boolean>;
  setHasUnsavedChanges: (value: boolean) => void;
}

export function useUnsavedChangesFlow({
  hasUnsavedChanges,
  dialog,
  handleNewProject,
  handleOpenProject,
  handleSaveProject,
  setHasUnsavedChanges,
}: UseUnsavedChangesFlowProps) {
  const triggerNewProject = useCallback(() => {
    if (hasUnsavedChanges) {
      dialog.setUnsavedChangesActionType("new");
    } else {
      handleNewProject();
    }
  }, [hasUnsavedChanges, handleNewProject, dialog]);

  const triggerOpenProject = useCallback(() => {
    if (hasUnsavedChanges) {
      dialog.setUnsavedChangesActionType("open");
    } else {
      handleOpenProject();
    }
  }, [hasUnsavedChanges, handleOpenProject, dialog]);

  const handleSaveUnsavedChanges = useCallback(async () => {
    const saved = await handleSaveProject();
    if (saved) {
      const pendingAction = dialog.unsavedChangesActionType;
      dialog.setUnsavedChangesActionType(null);
      if (pendingAction === "new") {
        handleNewProject();
      } else if (pendingAction === "open") {
        handleOpenProject();
      }
    }
  }, [dialog, handleSaveProject, handleNewProject, handleOpenProject]);

  const handleDiscardUnsavedChanges = useCallback(() => {
    const pendingAction = dialog.unsavedChangesActionType;
    if (pendingAction === "new") {
      handleNewProject();
    } else if (pendingAction === "open") {
      handleOpenProject();
    }
    dialog.setUnsavedChangesActionType(null);
    setHasUnsavedChanges(false);
  }, [dialog, handleNewProject, handleOpenProject, setHasUnsavedChanges]);

  const handleCancelUnsavedChanges = useCallback(() => {
    dialog.setUnsavedChangesActionType(null);
  }, [dialog]);

  return {
    triggerNewProject,
    triggerOpenProject,
    handleSaveUnsavedChanges,
    handleDiscardUnsavedChanges,
    handleCancelUnsavedChanges,
  };
}
