/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchematicTab } from "./SchematicTab";

// WHY: SchematicTab used to wrap the rendered schematic PNG in its own
// header (badge "SCHEMAT OBWODÓW" + Date + Object) and a PageFooter counter.
// That was duplicated chrome — the PNG rendered by renderSchematic already
// contains its own header/footer baked in. The component is now a thin
// wrapper: one .a4-page per image, with the image filling the sheet. These
// tests pin that contract.

describe("SchematicTab", () => {
  const baseProps = {
    displayDate: "2026-06-21",
    objectType: "Budynek mieszkalny",
    schematicStartPage: 4,
    totalUiPages: 8,
    isLoading: false,
    schematicError: null,
  } as const;

  it("renders one A4 landscape page per schematic image, with the image filling the sheet", () => {
    const { container } = render(
      <SchematicTab
        {...baseProps}
        schematicImages={[
          "data:image/png;base64,AAA",
          "data:image/png;base64,BBB",
        ]}
      />,
    );

    // One .a4-page--landscape per image, no extra chrome.
    const pages = container.querySelectorAll(".a4-page.a4-page--landscape");
    expect(pages).toHaveLength(2);

    // Each sheet must embed exactly one <img> and it must use the image src
    // from props (1:1 mapping, not a wrapper-generated placeholder).
    const imgs = container.querySelectorAll(".a4-page img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0]?.getAttribute("src")).toBe("data:image/png;base64,AAA");
    expect(imgs[1]?.getAttribute("src")).toBe("data:image/png;base64,BBB");

    // The image must fill the sheet (PDF A4 landscape is 297×210mm — the
    // object-fit/100%×100% rule is what makes the embedded PNG behave like
    // a real page in the printed PDF).
    const firstImg = imgs[0] as HTMLImageElement | null;
    expect(firstImg?.style.width).toBe("100%");
    expect(firstImg?.style.height).toBe("100%");
    expect(firstImg?.style.objectFit).toBe("contain");
  });

  it("does NOT add a duplicate 'Schemat obwodów' header badge — the PNG already has one baked in", () => {
    const { container } = render(
      <SchematicTab
        {...baseProps}
        schematicImages={[
          "data:image/png;base64,AAA",
          "data:image/png;base64,BBB",
        ]}
      />,
    );

    // No badge text outside the embedded image. If we ever re-introduce
    // the wrapper header this will catch it and the duplicate chrome bug
    // comes back.
    const badges = screen.queryAllByText("Schemat obwodów");
    expect(badges).toHaveLength(0);

    // No in-DOM page counter either — that lived in the now-removed
    // PageFooter.
    expect(container.textContent ?? "").not.toMatch(/Strona\s+\d+\s+z\s+\d+/i);
  });

  it("renders an empty-state sheet when no images are available", () => {
    render(
      <SchematicTab
        {...baseProps}
        schematicImages={[]}
      />,
    );

    expect(screen.getByText("Brak schematu do pokazania.")).toBeInTheDocument();
    expect(screen.getByText(/Dodaj obwody, fazy i zabezpieczenia/)).toBeInTheDocument();
  });

  it("shows an error message instead of the loading hint when snapshot failed", () => {
    const { container } = render(
      <SchematicTab
        {...baseProps}
        schematicImages={[]}
        schematicError="Nie udało się wyrenderować schematu."
      />,
    );

    expect(container.textContent).toContain("Nie udało się odświeżyć schematu.");
    expect(container.textContent).toContain("Nie udało się wyrenderować schematu.");
  });

  it("shows the loading hint while the snapshot is being prepared", () => {
    const { container } = render(
      <SchematicTab
        {...baseProps}
        schematicImages={[]}
        isLoading={true}
      />,
    );

    expect(container.textContent).toContain("Przygotowywanie schematu...");
  });

  it("uses landscape A4 dimensions for every sheet", () => {
    const { container } = render(
      <SchematicTab
        {...baseProps}
        schematicImages={[
          "data:image/png;base64,AAA",
          "data:image/png;base64,BBB",
        ]}
      />,
    );

    // a4-page--landscape is the CSS contract that the stage uses to lay out
    // the sheet at 297×210mm — anything else means the PDF-export orientation
    // (size="A4" orientation="landscape") will not match the preview.
    const portrait = container.querySelectorAll(".a4-page--portrait");
    expect(portrait).toHaveLength(0);

    const landscape = container.querySelectorAll(".a4-page--landscape");
    expect(landscape.length).toBe(2);
  });

  it("renders the empty-state sheet at the same landscape A4 dimensions as image sheets", () => {
    const { container } = render(
      <SchematicTab
        {...baseProps}
        schematicImages={[]}
      />,
    );

    // The empty state is a single .a4-page--landscape so the workspace
    // preview keeps the same sheet geometry whether the snapshot is ready
    // or still loading / failed. The user has to see the SAME A4 outline
    // in both states — otherwise the layout would shift on every load.
    const portrait = container.querySelectorAll(".a4-page--portrait");
    expect(portrait).toHaveLength(0);

    const landscape = container.querySelectorAll(".a4-page--landscape");
    expect(landscape.length).toBe(1);
  });

  it("renders the image sheet as a bare .a4-page wrapping the pinch-zoom wrapper (no inner header/footer chrome)", () => {
    const { container } = render(
      <SchematicTab
        {...baseProps}
        schematicImages={["data:image/png;base64,AAA"]}
      />,
    );

    // WHY: the PDF-rendered PNG already contains the schematic title bar,
    // the "Arkusz X z Y" badge, and the page footer. Adding a second set of
    // those elements around the <img> produces a duplicated chrome bug.
    // Od 2026-06-28 .a4-page--landscape zawiera PinchZoomImage wrapper
    // (ktory renderuje img z pinch-to-zoom na mobile) — bez inner chrome.
    // Jeśli ktoś doda flex-col / border-b-2 / footer do środka — ten test
    // złapie regresję zduplikowanego chrome.
    const page = container.querySelector(".a4-page--landscape");
    expect(page).not.toBeNull();

    // Dokładnie 1 bezpośrednie dziecko: wrapper pinch-zoom-image.
    const directChildren = page ? Array.from(page.children) : [];
    expect(directChildren).toHaveLength(1);
    expect(directChildren[0]?.classList.contains("pinch-zoom-image")).toBe(true);

    // Ten wrapper zawiera img z src z props (1:1 mapping).
    const imgInside = page?.querySelector(".pinch-zoom-image img");
    expect(imgInside?.getAttribute("src")).toBe("data:image/png;base64,AAA");

    // Defensive: no "Schemat obwodów" badge text, no "Strona X z Y" counter,
    // no footer element — those are all already baked into the PNG.
    expect(page?.querySelector(".bg-brand")).toBeNull();
    expect(page?.querySelector("footer")).toBeNull();
    expect(page?.textContent ?? "").not.toMatch(/Schemat obwodów/i);
  });
});
