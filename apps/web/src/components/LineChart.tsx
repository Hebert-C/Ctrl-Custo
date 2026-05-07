import React from "react";
import { formatCurrency } from "../hooks/useCurrency";

export interface LineChartEntry {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartEntry[];
}

const W = 560;
const H = 200;
const PADDING = { top: 20, right: 16, bottom: 36, left: 72 };
const innerW = W - PADDING.left - PADDING.right;
const innerH = H - PADDING.top - PADDING.bottom;

function niceRange(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(Math.abs(max - min) * 0.15, 500_00);
  return { min: min - pad, max: max + pad };
}

export function LineChart({ data }: LineChartProps) {
  if (data.length === 0) return null;
  const { min, max } = niceRange(data.map((d) => d.value));
  const range = max - min || 1;

  function px(i: number) {
    return PADDING.left + (i / (data.length - 1)) * innerW;
  }
  function py(value: number) {
    return PADDING.top + innerH - ((value - min) / range) * innerH;
  }

  const zeroY = py(0);
  const showZero = min < 0 && max > 0;

  const points = data.map((d, i) => ({ x: px(i), y: py(d.value), value: d.value }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => min + (range / ticks) * i);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {/* Y grid + labels */}
      {tickValues.map((tick, i) => {
        const y = py(tick);
        return (
          <g key={i}>
            <line
              x1={PADDING.left}
              x2={W - PADDING.right}
              y1={y}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">
              {formatCurrency(tick).replace("R$ ", "").replace(",00", "")}
            </text>
          </g>
        );
      })}

      {/* Zero line */}
      {showZero && (
        <line
          x1={PADDING.left}
          x2={W - PADDING.right}
          y1={zeroY}
          y2={zeroY}
          stroke="#6B7280"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {/* Area fill */}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`${PADDING.left},${PADDING.top + innerH} ${polyline} ${W - PADDING.right},${PADDING.top + innerH}`}
        fill="url(#lineGrad)"
      />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="#6366F1"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="#6366F1" strokeWidth={2} />
          <title>
            {data[i].label}: {formatCurrency(p.value)}
          </title>
        </g>
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={px(i)}
          y={PADDING.top + innerH + 16}
          textAnchor="middle"
          fontSize={10}
          fill="#9CA3AF"
        >
          {d.label}
        </text>
      ))}

      {/* X baseline */}
      <line
        x1={PADDING.left}
        x2={W - PADDING.right}
        y1={PADDING.top + innerH}
        y2={PADDING.top + innerH}
        stroke="#E5E7EB"
        strokeWidth={1}
      />
    </svg>
  );
}
