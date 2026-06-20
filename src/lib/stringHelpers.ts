export function firstNonEmpty(...values: Array<string | null | undefined>): string {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim() ?? "";
}
