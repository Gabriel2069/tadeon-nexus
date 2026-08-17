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
  fillOpacity = 0.34,
  tickColor,
}: AttributeRadarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="86%" margin={{ top: 18, right: 26, bottom: 18, left: 26 }}>
        <PolarGrid stroke={color} strokeOpacity={0.3} />
        <PolarAngleAxis
          dataKey="attr"
          tick={{ fill: tickColor, fontSize: 12, fontFamily: "Cinzel, serif", fontWeight: 650 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tick={false}
          stroke={color}
          strokeOpacity={0.3}
        />
        <Radar
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={fillOpacity}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
