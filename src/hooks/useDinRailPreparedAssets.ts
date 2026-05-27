import { useEffect, useState } from "react";
import type { SymbolItem } from "../types/symbolItem";
import { serializeParameters } from "../lib/modules/rasterPreview";
import { loadPreparedSvgMarkup, shouldRenderRawModuleAsset } from "../lib/modules/svgAsset";

interface PreparedSymbolAsset {
  imageSrc?: string;
  namespacedMarkup?: string;
}

function namespaceSvgMarkup(svgMarkup: string, prefix: string): string {
  if (typeof DOMParser === "undefined") {
    return svgMarkup;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== "svg") {
      return svgMarkup;
    }

    const idMap = new Map<string, string>();
    root.querySelectorAll("[id]").forEach((element) => {
      const currentId = element.getAttribute("id");
      if (!currentId) {
        return;
      }

      const nextId = `${prefix}-${currentId}`;
      idMap.set(currentId, nextId);
      element.setAttribute("id", nextId);
    });

    const rewriteValue = (value: string) => {
      let nextValue = value;
      idMap.forEach((nextId, currentId) => {
        const escapedId = currentId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const urlRegex = new RegExp(`url\\(\\s*['"]?#${escapedId}['"]?\\s*\\)`, "g");
        nextValue = nextValue.replace(urlRegex, `url(#${nextId})`);

        if (nextValue === `#${currentId}`) {
          nextValue = `#${nextId}`;
        }
      });
      return nextValue;
    };

    root.querySelectorAll("*").forEach((element) => {
      for (const attributeName of element.getAttributeNames()) {
        const value = element.getAttribute(attributeName);
        if (!value || (!value.includes("url(#") && !value.includes("#"))) {
          continue;
        }

        const rewritten = rewriteValue(value);
        if (rewritten !== value) {
          element.setAttribute(attributeName, rewritten);
        }
      }
    });

    return root.outerHTML;
  } catch {
    return svgMarkup;
  }
}

function buildSymbolAssetKey(symbol: SymbolItem): string {
  return [
    symbol.id,
    symbol.visualPath ?? "",
    serializeParameters(symbol.parameters),
  ].join("\u0001");
}

export function useDinRailPreparedAssets(symbols: SymbolItem[]) {
  const [assetMap, setAssetMap] = useState<Map<string, PreparedSymbolAsset>>(new Map());
  const assetRequestKey = symbols
    .filter((symbol) => symbol.visualPath)
    .map(buildSymbolAssetKey)
    .join("\u0002");

  useEffect(() => {
    let cancelled = false;
    const nextSymbols = symbols.filter((symbol) => symbol.visualPath);

    Promise.all<readonly [string, PreparedSymbolAsset]>(
      nextSymbols.map(async (symbol) => {
        if (shouldRenderRawModuleAsset(symbol.visualPath)) {
          return [
            symbol.id,
            {
              imageSrc: symbol.visualPath,
            },
          ] as const;
        }

        const rawMarkup = await loadPreparedSvgMarkup(symbol.visualPath, symbol.parameters);
        return [
          symbol.id,
          {
            namespacedMarkup: namespaceSvgMarkup(rawMarkup, `din-${symbol.id}`),
          },
        ] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) {
          return;
        }

        setAssetMap(new Map(entries));
      })
      .catch(() => {
        if (!cancelled) {
          setAssetMap(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetRequestKey]);

  return assetMap;
}
