import { useState, useCallback, useMemo } from "react";

/**
 * Stan widoku schematu (sheet2) – wydzielony z App.tsx.
 *
 * Obejmuje:
 * - żądanie resetu viewportu
 * - żądanie scrolla do konkretnej strony schematu
 */
export function useSchematicState() {
  const [schematicViewportResetRequest, setSchematicViewportResetRequest] = useState(0);
  const [schematicScrollToPageRequest, setSchematicScrollToPageRequest] = useState<{
    pageIndex: number;
    timestamp: number;
  } | null>(null);

  const handleScrollToSchematicPage = useCallback((pageIndex: number) => {
    setSchematicScrollToPageRequest({ pageIndex, timestamp: Date.now() });
  }, []);

  const requestViewportReset = useCallback(() => {
    setSchematicViewportResetRequest((r) => r + 1);
  }, []);

  return useMemo(
    () => ({
      schematicViewportResetRequest,
      schematicScrollToPageRequest,
      setSchematicScrollToPageRequest,
      handleScrollToSchematicPage,
      requestViewportReset,
    }),
    [
      schematicViewportResetRequest,
      schematicScrollToPageRequest,
      setSchematicScrollToPageRequest,
      handleScrollToSchematicPage,
      requestViewportReset,
    ],
  );
}
