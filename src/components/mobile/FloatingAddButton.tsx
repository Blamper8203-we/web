import { AppIcon } from "../AppIcon";
import "./FloatingAddButton.css";

interface FloatingAddButtonProps {
  onClick: () => void;
  isVisible: boolean;
}

export function FloatingAddButton({ onClick, isVisible }: FloatingAddButtonProps) {
  if (!isVisible) return null;

  return (
    <button className="mobile-fab" onClick={onClick} aria-label="Dodaj moduł">
      <AppIcon name="plus" size={24} />
    </button>
  );
}
