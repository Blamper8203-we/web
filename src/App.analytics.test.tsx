/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Analytics } from "@vercel/analytics/react";

// WHY: <Analytics /> is a side-effect-only component (returns null, calls
// window.va in useEffect to inject the Vercel Web Analytics script). The
// value of testing it is verifying that:
//   1. The import resolves and the component is a function
//   2. Rendering does not throw in jsdom (no DOM exception, no hook errors)
//   3. It does not produce any visible markup (returns null)
//
// We do NOT assert window.va — the inject() calls into the Vercel SDK
// which assumes a browser network/RAF environment that jsdom does not
// fully emulate. The real verification is the Vercel dashboard once the
// app is deployed.

describe("<Analytics /> (Vercel Web Analytics)", () => {
  it("exports a renderable component that produces no DOM", () => {
    expect(typeof Analytics).toBe("function");

    const { container } = render(<Analytics />);

    // Side-effect component returns null — container must be empty.
    expect(container.childNodes.length).toBe(0);
  });

  it("renders without throwing when mounted alongside other React tree", () => {
    // Mount inside a wrapping div to confirm the component coexists with
    // other React children without throwing (e.g. hook ordering issues).
    expect(() =>
      render(
        <div>
          <span>before</span>
          <Analytics />
          <span>after</span>
        </div>,
      ),
    ).not.toThrow();
  });
});