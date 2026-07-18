import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { InstallButton, InstallButtonVariant } from "./InstallButton";
import { IosInstallOverlay } from "./IosInstallOverlay";

interface PwaInstallAssetsProps {
  variant: InstallButtonVariant;
}

/**
 * Router logiki instalacji PWA. Decyduje:
 * - czy w ogóle pokazać przycisk (canShowButton),
 * - jaką akcję wykonać po kliknięciu (iOS overlay vs beforeinstallprompt),
 * - czy pokazać stan "instalowanie" podczas prompta.
 *
 * Ten komponent jest jedynym miejscem, które zna szczegóły platformy.
 * LandingHeader i LandingHero renderują po prostu `<PwaInstallAssets variant=.../>`
 * i nie muszą wiedzieć nic o beforeinstallprompt ani iOS.
 *
 * Renderuje `null` gdy instalacja nie jest dostępna — dzięki temu header/hero
 * nie zostają z pustym wrapperem.
 */
export function PwaInstallAssets({ variant }: PwaInstallAssetsProps) {
  const { t } = useTranslation();
  const { canShowButton, isIos, promptInstall } = usePwaInstall();
  const [iosOverlayOpen, setIosOverlayOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!canShowButton) {
    return null;
  }

  const handleClick = async () => {
    if (isIos) {
      // WHY: iOS nie ma beforeinstallprompt — pokazujemy instrukcję ręcznej
      // instalacji. Nie blokujemy stanem "installing" bo to tylko display instrukcji.
      setIosOverlayOpen(true);
      return;
    }
    // Android / desktop Chrome / Edge — wywołujemy natywny prompt.
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      // WHY: finally zamiast .then() — nawet jeśli promptInstall rzuci
      // (co nie powinno się stać, hook ma try/catch w środku), zdejmujemy stan.
      setInstalling(false);
    }
  };

  return (
    <>
      <InstallButton
        variant={variant}
        onClick={handleClick}
        installing={installing}
        ariaLabel={t("landing.install.button", "Zainstaluj aplikację")}
      />
      {isIos && iosOverlayOpen && (
        <IosInstallOverlay onClose={() => setIosOverlayOpen(false)} />
      )}
    </>
  );
}
