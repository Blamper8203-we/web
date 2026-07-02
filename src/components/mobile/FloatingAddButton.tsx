import { useTranslation } from "react-i18next";
import { AppIcon } from "../AppIcon";
import "./FloatingAddButton.css";

interface FloatingAddButtonProps {
  onClick: () => void;
  isVisible: boolean;
}

export function FloatingAddButton({ onClick, isVisible }: FloatingAddButtonProps) {
  const { t } = useTranslation();
  if (!isVisible) return null;

  return (
    <button className="mobile-fab" onClick={onClick} aria-label={t("auto.dodajmodu_737", "Dodaj moduł")}>
      <AppIcon name="plus" size={24} />
    </button>
  );
}
