import { describe, expect, it } from "vitest";
import { PdfDinRailSnapshotPage } from "./PdfDinRailSnapshotPage";

/**
 * PdfDinRailSnapshotPage — minimal render test for the rail PNG page.
 *
 * WHY: PdfDinRailSnapshotPage embeds a rasterized PNG of the rail canvas.
 * Without a dedicated test, a regression in image plumbing would only be
 * noticed by manual PDF inspection.
 */

function collectImageSrc(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (Array.isArray(node)) return node.flatMap(collectImageSrc);
  if (typeof node === "object" && node !== null) {
    const element = node as { type?: unknown; props?: { src?: unknown; children?: unknown } };
    if (typeof element.type === "function") {
      try {
        const rendered = (element.type as (props: unknown) => unknown)(element.props);
        if (rendered !== undefined) return collectImageSrc(rendered);
      } catch {
        // Fallback — renderer components may throw outside the renderer.
      }
    }
    if (typeof element.props?.src === "string") return [element.props.src];
    if (element.props?.children !== undefined) return collectImageSrc(element.props.children);
  }
  return [];
}

const SAMPLE_PNG_DATAURL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";

describe("PdfDinRailSnapshotPage", () => {
  it("embeds a raster (PNG) data URL into the page", () => {
    const tree = PdfDinRailSnapshotPage({ imageDataUrl: SAMPLE_PNG_DATAURL });

    const sources = collectImageSrc(tree);
    expect(sources).toContain(SAMPLE_PNG_DATAURL);
  });

  it("wraps a raw SVG string in a base64 data URL before embedding", () => {
    // Regression guard: the component historically accepted raw SVG and
    // wrapped it. The current contract takes a data URL, but raw input
    // should still be handled defensively.
    const rawSvg = "<svg xmlns='http://www.w3.org/2000/svg'><rect width='10' height='10'/></svg>";
    const tree = PdfDinRailSnapshotPage({ imageDataUrl: rawSvg });

    const sources = collectImageSrc(tree);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources[0]).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});