import React from "react";
import { formatCurrency } from "../hooks/useCurrency";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  onSliceClick?: (index: number) => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function segmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
) {
  const gap = 1.5;
  const s = startAngle + gap;
  const e = endAngle - gap;
  const outerStart = polarToCartesian(cx, cy, outerR, e);
  const outerEnd = polarToCartesian(cx, cy, outerR, s);
  const innerStart = polarToCartesian(cx, cy, innerR, e);
  const innerEnd = polarToCartesian(cx, cy, innerR, s);
  const large = e - s > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${large} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function DonutChart({ data, onSliceClick }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = 80;
  const cy = 80;
  const outerR = 70;
  const innerR = 44;
  const size = 160;

  let cumAngle = 0;
  const slices = data.map((d) => {
    const angle = (d.value / total) * 360;
    const start = cumAngle;
    cumAngle += angle;
    return { ...d, startAngle: start, endAngle: cumAngle };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} className="flex-shrink-0">
        {slices.map((s, i) => (
          <path
            key={i}
            d={segmentPath(cx, cy, outerR, innerR, s.startAngle, s.endAngle)}
            fill={s.color}
            className={onSliceClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
            onClick={() => onSliceClick?.(i)}
          />
        ))}
      </svg>

      <div className="flex flex-col gap-2 min-w-0">
        {data.map((d, i) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <button
              key={i}
              onClick={() => onSliceClick?.(i)}
              disabled={!onSliceClick}
              className="flex items-center gap-2 text-left group disabled:cursor-default"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                {d.label}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-auto pl-4 flex-shrink-0">
                {pct}%
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatCurrency(d.value)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
