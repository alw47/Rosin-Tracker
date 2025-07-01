import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useUnits } from "@/contexts/units-context";

interface EnvironmentChartProps {
  startMaterialFilter?: string;
}

export function EnvironmentChart({ startMaterialFilter = "all" }: EnvironmentChartProps) {
  const { data: trends, isLoading } = useQuery({
    queryKey: ["/api/analytics/environment-trends", startMaterialFilter],
    queryFn: () => {
      const params = startMaterialFilter !== "all" ? `?startMaterial=${encodeURIComponent(startMaterialFilter)}` : "";
      return fetch(`/api/analytics/environment-trends${params}`).then(res => res.json());
    },
  });
  
  const { convertTemperature, getTemperatureUnit } = useUnits();

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-500">
        No environment data available
      </div>
    );
  }

  const chartData = trends.map((trend: any) => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    temperature: parseFloat(convertTemperature(trend.avgTemperature, "metric").toFixed(1)),
    humidity: parseFloat(trend.avgHumidity.toFixed(1)),
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="temperature" orientation="left" domain={['dataMin - 10', 'dataMax + 10']} />
          <YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'temperature') {
                return [`${value}${getTemperatureUnit()}`, 'Temperature'];
              }
              return [`${value}%`, 'Humidity'];
            }}
            labelFormatter={(label) => `Date: ${label}`}
            labelStyle={{ color: 'var(--foreground)' }}
            contentStyle={{ 
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '6px'
            }}
          />
          <Line
            yAxisId="temperature"
            type="monotone"
            dataKey="temperature"
            stroke="#dc2626"
            strokeWidth={2}
            dot={{ fill: "#dc2626", strokeWidth: 2, r: 4 }}
            activeDot={{ 
              r: 6, 
              fill: "#dc2626", 
              stroke: "hsl(var(--background))", 
              strokeWidth: 2,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
            }}
          />
          <Line
            yAxisId="humidity"
            type="monotone"
            dataKey="humidity"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
            activeDot={{ 
              r: 6, 
              fill: "#2563eb", 
              stroke: "hsl(var(--background))", 
              strokeWidth: 2,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
