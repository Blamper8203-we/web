import { describe, expect, it } from "vitest";

const MOJIBAKE_PATTERNS = [
  /Ä[…„™‡†Ę]/,
  /Ĺ[‚š›şşĽź]/,
  /Ă[ł“łł]/,
  /Â[˛°·]/,
  /Î[©”]/,
  /â[€“”ś]/,
];

const sourceFiles = import.meta.glob("../**/*.{css,ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const rootDocuments = import.meta.glob("../../*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const artifactDocuments = import.meta.glob("../../test-artifacts/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

describe("source text encoding", () => {
  it("does not contain common UTF-8 mojibake sequences", () => {
    const allFiles = {
      ...sourceFiles,
      ...rootDocuments,
      ...artifactDocuments,
    };
    const offenders = Object.entries(allFiles).flatMap(([file, text]) =>
      MOJIBAKE_PATTERNS.some((pattern) => pattern.test(text)) ? [file] : [],
    );

    expect(offenders).toEqual([]);
  });
});
