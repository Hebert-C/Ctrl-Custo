import { View, StyleSheet } from "react-native";
import {
  VictoryLine,
  VictoryChart,
  VictoryAxis,
  VictoryScatter,
  VictoryTheme,
  VictoryArea,
} from "victory-native";
import { lightColors } from "../tokens/colors";
import { fontSizes } from "../tokens/typography";

export interface LineChartData {
  x: string; // rótulo do eixo X (ex: "Jan")
  y: number; // valor em centavos
}

interface LineChartProps {
  data: LineChartData[];
  color?: string;
  showArea?: boolean;
  height?: number;
  formatY?: (value: number) => string;
}

function defaultFormatY(value: number): string {
  return `R$ ${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

export function LineChart({
  data,
  color = lightColors.primary,
  showArea = true,
  height = 220,
  formatY = defaultFormatY,
}: LineChartProps) {
  const areaColor = `${color}20`; // 12% de opacidade

  return (
    <View style={[styles.container, { height }]}>
      <VictoryChart theme={VictoryTheme.grayscale} height={height}>
        <VictoryAxis
          style={{
            tickLabels: { fontSize: fontSizes.xs, fill: lightColors.textSecondary },
            axis: { stroke: lightColors.border },
            grid: { stroke: "transparent" },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={formatY}
          style={{
            tickLabels: { fontSize: fontSizes.xs, fill: lightColors.textSecondary },
            axis: { stroke: "transparent" },
            grid: { stroke: lightColors.border, strokeDasharray: "4,4" },
          }}
        />

        {showArea && (
          <VictoryArea
            data={data}
            style={{ data: { fill: areaColor, stroke: "transparent" } }}
            interpolation="monotoneX"
          />
        )}

        <VictoryLine
          data={data}
          style={{ data: { stroke: color, strokeWidth: 2.5 } }}
          interpolation="monotoneX"
        />

        {/* Pontos sobre a linha */}
        <VictoryScatter
          data={data}
          size={4}
          style={{
            data: { fill: lightColors.surface, stroke: color, strokeWidth: 2.5 },
          }}
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", overflow: "hidden" },
});
