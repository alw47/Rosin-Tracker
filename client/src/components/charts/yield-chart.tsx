import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";

interface YieldChartProps {
  startMaterialFilter?: string;
}

export function YieldChart({ startMaterialFilter = "all" }: YieldChartProps) {
  const { data: trends, isLoading } = useQuery({
    queryKey: ["/api/analytics/yield-trends", startMaterialFilter],
    queryFn: () => {
      const params = startMaterialFilter !== "all" ? `?startMaterial=${encodeURIComponent(startMaterialFilter)}` : "";
      return fetch(`/api/analytics/yield-trends${params}`).then(res => res.json());
    },
  });

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
        No yield data available
      </div>
    );
  }

  const chartData = trends.map((trend: any) => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    yield: parseFloat(trend.avgYield.toFixed(1)),
    batches: trend.totalBatches,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 'dataMax + 5']} />
          <Tooltip 
            formatter={(value, name) => [`${value}%`, 'Avg Yield']}
            labelFormatter={(label) => `Date: ${label}`}
            labelStyle={{ color: 'var(--foreground)' }}
            contentStyle={{ 
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '6px'
            }}
          />
          <Line
            type="monotone"
            dataKey="yield"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
            activeDot={{ 
              r: 6, 
              fill: "hsl(var(--primary))", 
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
