import { View, StyleSheet } from "react-native";
import {
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryTooltip,
  VictoryTheme,
} from "victory-native";
import { lightColors } from "../tokens/colors";
import { fontSizes } from "../tokens/typography";

export interface BarChartData {
  x: string; // rótulo do eixo X (ex: "Jan", "Fev")
  y: number; // valor em centavos
}

interface BarChartProps {
  data: BarChartData[];
  color?: string;
  height?: number;
  // Formata o valor do eixo Y para exibição (ex: centavos → "R$ 1.500")
  formatY?: (value: number) => string;
}

function defaultFormatY(value: number): string {
  return `R$ ${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

export function BarChart({
  data,
  color = lightColors.primary,
  height = 220,
  formatY = defaultFormatY,
}: BarChartProps) {
  return (
    <View style={[styles.container, { height }]}>
      <VictoryChart theme={VictoryTheme.grayscale} height={height} domainPadding={{ x: 20 }}>
        <VictoryAxis
          style={{
            tickLabels: {
              fontSize: fontSizes.xs,
              fill: lightColors.textSecondary,
            },
            axis: { stroke: lightColors.border },
            grid: { stroke: "transparent" },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={formatY}
          style={{
            tickLabels: {
              fontSize: fontSizes.xs,
              fill: lightColors.textSecondary,
            },
            axis: { stroke: "transparent" },
            grid: { stroke: lightColors.border, strokeDasharray: "4,4" },
          }}
        />
        <VictoryBar
          data={data}
          style={{ data: { fill: color, borderRadius: 4 } }}
          cornerRadius={{ top: 4 }}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", overflow: "hidden" },
});
