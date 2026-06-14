import { useCallback, useEffect, useState } from "react";

/**
 * Stan dla dropdown menus w toolbarze (Plik, Widok, Narzędzia, Ustawienia, Mobile).
 *
 * Łączy 5 useState + 2 useEffect (click-outside, escape) w jeden custom hook.
 * Zwraca interfejs do imperatywnego sterowania którym menu jest otwarte.
 *
 * @example
 *   const menu = useToolbarMenuState();
 *   <button onClick={() => menu.toggle("file")}>Plik</button>
 *   {menu.isOpen("file") && <FileMenu onClose={menu.closeAll} />}
 */
export type ToolbarMenuId = "file" | "view" | "tools" | "settings" | "mobile";

export function useToolbarMenuState() {
  const [openMenu, setOpenMenu] = useState<ToolbarMenuId | null>(null);

  // Otwiera podany menu (zamykając inne) lub przełącza jeśli już otwarty.
  const toggle = useCallback((id: ToolbarMenuId) => {
    setOpenMenu((current) => (current === id ? null : id));
  }, []);

  // Zamyka wszystkie menu.
  const closeAll = useCallback(() => {
    setOpenMenu(null);
  }, []);

  // Sprawdza czy dany menu jest otwarty.
  const isOpen = useCallback((id: ToolbarMenuId) => openMenu === id, [openMenu]);

  // Globalne listenery: click-outside i Escape zamykają wszystkie menu.
  // Wydzielone tutaj (zamiast w AppHeader) bo współdzielone przez desktop i mobile.
  useEffect(() => {
    const handlePointerDown = () => {
      setOpenMenu(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return { isOpen, toggle, closeAll };
}
