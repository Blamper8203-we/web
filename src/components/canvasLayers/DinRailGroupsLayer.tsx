import {
  DIN_RAIL_GROUP_BRACKET_LABEL_GAP,
  DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT,
  DIN_RAIL_GROUP_BRACKET_OFFSET_Y,
  formatDinRailGroupLabel,
  type DinRailGroupFrameData,
} from "../../lib/dinRailSelection";
import type { WorldPoint } from "../../lib/dinRailCanvas/types";
import { clamp } from "../../lib/dinRailCanvas/geometry";

export interface DinRailGroupsLayerProps {
  groupFrames: DinRailGroupFrameData[];
  pan: WorldPoint;
  scale: number;
  selectedIds: Set<string>;
}

export function DinRailGroupsLayer({
  groupFrames,
  pan,
  scale,
  selectedIds,
}: DinRailGroupsLayerProps) {
  return (
    <svg
      className="din-rail-groups-layer"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 100,
      }}
    >
      <defs>
        <linearGradient id="svg-bracket-leg-default" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(82,148,255,0.95)" />
          <stop offset="100%" stopColor="rgba(82,148,255,0)" />
        </linearGradient>
        <linearGradient id="svg-bracket-leg-selected" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(13,121,242,1)" />
          <stop offset="100%" stopColor="rgba(13,121,242,0)" />
        </linearGradient>
        <filter id="svg-bracket-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {groupFrames.map((group) => {
        const isSelected = group.symbolIds.some((id) => selectedIds.has(id));
        const isSingle = group.memberCount <= 1;
        const screenX = group.x * scale + pan.x;
        const screenY = group.y * scale + pan.y;
        const screenWidth = Math.max(1, group.width * scale);
        const barH = clamp(1 * scale, 1, 2);
        const legH = clamp(DIN_RAIL_GROUP_BRACKET_LEG_HEIGHT * scale, 4, 28);
        const labelH = clamp(22 * scale, 12, 26);
        const labelGap = clamp(DIN_RAIL_GROUP_BRACKET_LABEL_GAP * scale, 1, 8);
        const labelPadX = clamp(10 * scale, 4, 12);
        const labelFont = clamp(12.5 * scale, 8, 16);

        const topY = screenY - DIN_RAIL_GROUP_BRACKET_OFFSET_Y * scale;
        const color = isSelected
          ? "rgba(13,121,242,1)"
          : isSingle
            ? "rgba(82,148,255,0.5)"
            : "rgba(82,148,255,0.85)";

        const legGrad = isSelected
          ? "url(#svg-bracket-leg-selected)"
          : "url(#svg-bracket-leg-default)";
        const label = formatDinRailGroupLabel(group.label, group.id);
        const estLabelW = Math.min(label.length * labelFont * 0.65 + labelPadX * 2, 360);
        const labelX = screenX + screenWidth / 2;
        const labelY = topY - labelGap - labelH;

        return (
          <g key={`svg-group-${group.id}`}>
            <g>
              <rect x={screenX} y={topY} width={screenWidth} height={barH} fill={color} />
              <rect x={screenX} y={topY} width={barH} height={legH} fill={legGrad} />
              <rect
                x={screenX + screenWidth - barH}
                y={topY}
                width={barH}
                height={legH}
                fill={legGrad}
              />
            </g>
            <rect
              x={labelX - estLabelW / 2}
              y={labelY}
              width={estLabelW}
              height={labelH}
              rx={4}
              ry={4}
              fill={isSelected ? "rgba(13,121,242,0.95)" : "rgba(10, 15, 25, 0.9)"}
              stroke={isSelected ? "#fff" : "rgba(82,148,255,0.45)"}
              strokeWidth={1}
            />
            <text
              x={labelX}
              y={labelY + labelH / 2 + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize={labelFont}
              fontWeight={700}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
