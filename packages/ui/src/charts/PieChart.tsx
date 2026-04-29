import { View, Text, StyleSheet } from "react-native";
import { VictoryPie, VictoryTheme } from "victory-native";
import { lightColors, categoryColors } from "../tokens/colors";
import { fontSizes, fontWeights } from "../tokens/typography";
import { spacing, borderRadius } from "../tokens/spacing";

export interface PieChartData {
  label: string;
  value: number; // em centavos
  color?: string;
}

interface PieChartProps {
  data: PieChartData[];
  height?: number;
  showLegend?: boolean;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export function PieChart({ data, height = 220, showLegend = true }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const chartData = data.map((d, index) => ({
    x: d.label,
    y: d.value,
    color: d.color ?? categoryColors[index % categoryColors.length],
  }));

  return (
    <View style={styles.container}>
      <VictoryPie
        data={chartData}
        theme={VictoryTheme.grayscale}
        height={height}
        width={height}
        innerRadius={height * 0.28} // donut
        padAngle={2}
        style={{
          data: {
            // victory-native v36: datum é opcional em CallbackArgs
            fill: (args: { datum?: { color?: string } }) =>
              args.datum?.color ?? lightColors.primary,
          },
          labels: { display: "none" },
        }}
        labels={() => ""}
      />

      {showLegend && (
        <View style={styles.legend}>
          {data.map((item, index) => {
            const color = item.color ?? categoryColors[index % categoryColors.length];
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";

            return (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <View style={styles.legendText}>
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.legendValue}>
                    {formatCurrency(item.value)}{" "}
                    <Text style={[styles.legendPercent, { color }]}>{percentage}%</Text>
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[4],
  },

  legend: { flex: 1, gap: spacing[2], minWidth: 140 },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },

  legendText: { flex: 1 },

  legendLabel: {
    fontSize: fontSizes.sm,
    color: lightColors.textPrimary,
    fontWeight: fontWeights.medium,
  },

  legendValue: {
    fontSize: fontSizes.xs,
    color: lightColors.textSecondary,
  },

  legendPercent: {
    fontWeight: fontWeights.semibold,
  },
});
