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

export default function AttributeRadar({
  color,
  data,
  fillOpacity = 0.4,
  tickColor,
}: AttributeRadarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="80%">
        <PolarGrid stroke={color} strokeOpacity={0.35} />
        <PolarAngleAxis
          dataKey="attr"
          tick={{ fill: tickColor, fontSize: 11, fontFamily: "Cinzel, serif" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tick={false}
          stroke={color}
          strokeOpacity={0.4}
        />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={fillOpacity} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
