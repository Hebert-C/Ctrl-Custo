import React from "react";
import { formatCurrency } from "../hooks/useCurrency";

export interface BarChartEntry {
  label: string;
  income: number;
  expense: number;
}

interface BarChartProps {
  data: BarChartEntry[];
}

const W = 560;
const H = 220;
const PADDING = { top: 16, right: 16, bottom: 36, left: 72 };
const innerW = W - PADDING.left - PADDING.right;
const innerH = H - PADDING.top - PADDING.bottom;

function niceMax(value: number): number {
  if (value === 0) return 1000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / magnitude) * magnitude;
}

export function BarChart({ data }: BarChartProps) {
  const maxVal = niceMax(Math.max(...data.flatMap((d) => [d.income, d.expense])));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxVal);

  const groupW = innerW / data.length;
  const barW = Math.min(groupW * 0.3, 18);
  const gap = barW * 0.4;

  function barX(i: number, isExpense: boolean) {
    const center = PADDING.left + i * groupW + groupW / 2;
    return isExpense ? center + gap / 2 : center - barW - gap / 2;
  }

  function barH(value: number) {
    return (value / maxVal) * innerH;
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {/* Y grid + labels */}
      {ticks.map((tick) => {
        const y = PADDING.top + innerH - (tick / maxVal) * innerH;
        return (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={W - PADDING.right}
              y1={y}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">
              {tick === 0 ? "0" : formatCurrency(tick).replace("R$ ", "").replace(",00", "")}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const hIncome = barH(d.income);
        const hExpense = barH(d.expense);
        const xIncome = barX(i, false);
        const xExpense = barX(i, true);
        const labelX = PADDING.left + i * groupW + groupW / 2;
        const labelY = PADDING.top + innerH + 16;

        return (
          <g key={d.label}>
            <rect
              x={xIncome}
              y={PADDING.top + innerH - hIncome}
              width={barW}
              height={hIncome}
              rx={3}
              fill="#10B981"
              opacity={0.85}
            />
            <rect
              x={xExpense}
              y={PADDING.top + innerH - hExpense}
              width={barW}
              height={hExpense}
              rx={3}
              fill="#EF4444"
              opacity={0.85}
            />
            <text x={labelX} y={labelY} textAnchor="middle" fontSize={10} fill="#9CA3AF">
              {d.label}
            </text>
          </g>
        );
      })}

      {/* X baseline */}
      <line
        x1={PADDING.left}
        x2={W - PADDING.right}
        y1={PADDING.top + innerH}
        y2={PADDING.top + innerH}
        stroke="#E5E7EB"
        strokeWidth={1}
      />

      {/* Legend */}
      <g transform={`translate(${W - PADDING.right - 130}, ${PADDING.top})`}>
        <rect width={10} height={10} rx={2} fill="#10B981" opacity={0.85} />
        <text x={14} y={9} fontSize={10} fill="#6B7280">
          Receitas
        </text>
        <rect x={70} width={10} height={10} rx={2} fill="#EF4444" opacity={0.85} />
        <text x={84} y={9} fontSize={10} fill="#6B7280">
          Despesas
        </text>
      </g>
    </svg>
  );
}
