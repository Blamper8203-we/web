import type { ReactNode } from "react";
import { useA4Scale } from "../hooks/useA4Scale";

interface A4ScaledPageProps {
  orientation?: "portrait" | "landscape";
  children: ReactNode;
}

/**
 * Wrapper dla strony A4 który dopasowuje ją wizualnie do szerokości okna
 * zachowując naturalne proporcje (210×297mm lub 297×210mm).
 *
 * Używa `useA4Scale` (ResizeObserver) do obliczenia scale = wrapperWidth / baseWidthMm.
 * Bazowy wrapper ma aspect-ratio zgodny z orientacją, a strona A4 w środku
 * zachowuje wymiary w milimetrach + `transform: scale(var(--a4-scale))`.
 *
 * W odróżnieniu od responsywnego reflow (który zmienia fonty/paddingi pod
 * szerokość ekranu), to podejście zachowuje wierny wygląd dokumentu —
 * fonty w pt, paddingi w mm, position:absolute dla top-bar/footer renderują
 * się dokładnie tak jak w wyeksportowanym PDF.
 */
export default function A4ScaledPage({ orientation = "portrait", children }: A4ScaledPageProps) {
  const ref = useA4Scale<HTMLDivElement>(orientation === "landscape" ? 297 : 210);
  const className = orientation === "landscape"
    ? "a4-page-wrapper a4-page-wrapper--landscape"
    : "a4-page-wrapper";
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
