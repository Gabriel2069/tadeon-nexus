import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

interface AttributeRadarProps {
  color: string;
  data: { attr: string; value: number }[];
  fillOpacity?: number;
  tickColor: string;
}

function projectPaletteColor(input: string, fallback: string) {
  const normalized = input.trim().toLowerCase();
  if (["#a855f7", "#c084fc", "#9333ea", "#8b5cf6"].includes(normalized)) {
    return fallback;
  }
  return input;
}

export default function AttributeRadar({
  color,
  data,
  fillOpacity = 0.18,
  tickColor,
}: AttributeRadarProps) {
  const radarColor = projectPaletteColor(color, "#d9d7a4");
  const labelColor = projectPaletteColor(tickColor, "#e9e3d5");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart
        data={data}
        cx="50%"
        cy="51%"
        outerRadius="68%"
        margin={{ top: 24, right: 34, bottom: 22, left: 34 }}
      >
        <PolarGrid
          gridType="polygon"
          stroke="#4f6e5d"
          strokeOpacity={0.28}
          radialLines
        />
        <PolarAngleAxis
          dataKey="attr"
          axisLine={false}
          tickLine={false}
          tick={{
            fill: labelColor,
            fontSize: 12,
            fontFamily: "EB Garamond, Georgia, serif",
            fontWeight: 700,
          }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tick={false}
          axisLine={false}
          tickCount={6}
        />
        <Radar
          dataKey="value"
          stroke={radarColor}
          strokeWidth={2.2}
          fill={radarColor}
          fillOpacity={Math.min(fillOpacity, 0.22)}
          dot={{
            r: 3.2,
            fill: radarColor,
            fillOpacity: 0.95,
            stroke: "#080a0e",
            strokeWidth: 1.25,
          }}
          isAnimationActive
          animationDuration={460}
          animationEasing="ease-out"
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
