import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { YieldChart } from "@/components/charts/yield-chart";
import { EnvironmentChart } from "@/components/charts/environment-chart";
import { StrainRankingChart } from "@/components/charts/strain-ranking-chart";
import { useUnits } from "@/contexts/units-context";
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity, 
  Target,
  Thermometer 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Legend
} from "recharts";

interface Statistics {
  totalBatches: number;
  avgYield: number;
  activeCuring: number;
  totalYield: number;
}

interface StrainAnalytic {
  strain: string;
  totalBatches: number;
  avgYield: number;
  bestYield: number;
  avgTemperature: number;
  avgPressure: number;
  totalOutput: number;
}

interface TemperatureCorrelation {
  temperature: number;
  avgYield: number;
  batchCount: number;
}

export default function Analytics() {
  const { convertWeight, getWeightUnit, convertTemperature, getTemperatureUnit } = useUnits();
  const [startMaterialFilter, setStartMaterialFilter] = useState<string>("all");

  // Get all batches to extract unique start materials
  const { data: allBatches } = useQuery({
    queryKey: ["/api/rosin-presses"],
  });

  const uniqueStartMaterials = Array.from(
    new Set(allBatches?.map((batch: any) => batch.startMaterial) || [])
  ).sort();

  const { data: statistics, isLoading } = useQuery<Statistics>({
    queryKey: ["/api/analytics/statistics", startMaterialFilter],
    queryFn: () => {
      const params = startMaterialFilter !== "all" ? `?startMaterial=${encodeURIComponent(startMaterialFilter)}` : "";
      return fetch(`/api/analytics/statistics${params}`).then(res => res.json());
    },
  });

  const { data: strainAnalytics, isLoading: strainsLoading } = useQuery<StrainAnalytic[]>({
    queryKey: ["/api/analytics/strain-analytics", startMaterialFilter],
    queryFn: () => {
      const params = startMaterialFilter !== "all" ? `?startMaterial=${encodeURIComponent(startMaterialFilter)}` : "";
      return fetch(`/api/analytics/strain-analytics${params}`).then(res => res.json());
    },
  });

  const { data: temperatureCorrelation, isLoading: tempLoading } = useQuery<TemperatureCorrelation[]>({
    queryKey: ["/api/analytics/temperature-correlation", startMaterialFilter],
    queryFn: () => {
      const params = startMaterialFilter !== "all" ? `?startMaterial=${encodeURIComponent(startMaterialFilter)}` : "";
      return fetch(`/api/analytics/temperature-correlation${params}`).then(res => res.json());
    },
  });

  if (isLoading || strainsLoading || tempLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">Analytics</h1>
          <p className="text-gray-500 mt-1">Detailed insights into your rosin production</p>
        </div>
        
        {/* Start Material Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">Filter by:</span>
          <Select value={startMaterialFilter} onValueChange={setStartMaterialFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Materials" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Materials</SelectItem>
              {uniqueStartMaterials.map((material: string) => (
                <SelectItem key={material} value={material}>
                  {material}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Production Efficiency</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {statistics?.avgYield ? `${statistics.avgYield.toFixed(1)}%` : "0.0%"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Average yield across all batches
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Production</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {statistics?.totalYield ? `${convertWeight(statistics.totalYield).toFixed(1)}${getWeightUnit()}` : `0${getWeightUnit()}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Cumulative rosin produced
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Batches</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {statistics?.activeCuring || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Currently curing
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Batches</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {statistics?.totalBatches || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              All-time presses
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield Trends */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Yield Performance</CardTitle>
            <Select defaultValue="30">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">6 months</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <YieldChart startMaterialFilter={startMaterialFilter} />
          </CardContent>
        </Card>

        {/* Environment Conditions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Environmental Conditions</CardTitle>
            <div className="flex space-x-4">
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                Temperature
              </div>
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                Humidity
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EnvironmentChart startMaterialFilter={startMaterialFilter} />
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Best Performing Strains</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strainAnalytics && strainAnalytics.length > 0 ? (
                strainAnalytics
                  .slice()
                  .sort((a, b) => b.avgYield - a.avgYield)
                  .slice(0, 3)
                  .map((strain, index) => (
                    <div key={strain.strain} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'}`}></div>
                        <div>
                          <p className="font-medium">{strain.strain}</p>
                          <p className="text-sm text-gray-500">{strain.totalBatches} batches</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          {strain.avgYield.toFixed(1)}%
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">{strain.totalOutput.toFixed(1)}g total</p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No strain data available</p>
                  <p className="text-sm">Create some batches to see analysis</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Optimal Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {temperatureCorrelation && temperatureCorrelation.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Thermometer className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Temperature vs Yield</span>
                  </div>
                  {temperatureCorrelation
                    .slice()
                    .sort((a, b) => b.avgYield - a.avgYield)
                    .slice(0, 3)
                    .map((temp, index) => (
                      <div key={temp.temperature} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{convertTemperature(temp.temperature, "metric").toFixed(0)}{getTemperatureUnit()}</p>
                          <p className="text-sm text-gray-500">{temp.batchCount} batches</p>
                        </div>
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          {temp.avgYield.toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500">
                      Optimal range: {convertTemperature(temperatureCorrelation.sort((a, b) => b.avgYield - a.avgYield)[0]?.temperature || 0, "metric").toFixed(0)}{getTemperatureUnit()}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Thermometer className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No temperature data available</p>
                  <p className="text-sm">Create some batches to see analysis</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Strain Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strainAnalytics && strainAnalytics.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={strainAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="strain" 
                        fontSize={12}
                        tick={{ fill: 'currentColor' }}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${Number(value).toFixed(1)}%`,
                          'Avg Yield'
                        ]}
                        labelStyle={{ color: 'var(--foreground)' }}
                        contentStyle={{ 
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px'
                        }}
                      />
                      <Bar 
                        dataKey="avgYield" 
                        fill="#6366f1" 
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="text-xs text-gray-500 text-center">
                    Yield comparison across all strains
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No strain comparison available</p>
                  <p className="text-sm">Create batches with different strains</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics Section */}
      {strainAnalytics && strainAnalytics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strain Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Strain Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={strainAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strain" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${Number(value).toFixed(1)}${name === 'avgYield' ? '%' : name === 'totalOutput' ? 'g' : ''}`,
                      name === 'avgYield' ? 'Avg Yield' : name === 'totalOutput' ? 'Total Output' : name
                    ]}
                    labelStyle={{ color: 'var(--foreground)' }}
                    contentStyle={{ 
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="avgYield" 
                    fill="#6366f1" 
                    name="Average Yield %"
                  />
                  <Bar 
                    dataKey="totalOutput" 
                    fill="#10b981" 
                    name="Total Output (g)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Temperature Correlation Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Temperature vs Yield Correlation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={temperatureCorrelation?.map(item => ({
                  ...item,
                  temperature: convertTemperature(item.temperature, "metric")
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="temperature" 
                    domain={['dataMin - 5', 'dataMax + 5']}
                    name="Temperature"
                    label={{ value: `Temperature (${getTemperatureUnit()})`, position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    dataKey="avgYield"
                    name="Yield"
                    label={{ value: 'Average Yield (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => [
                      `${Number(value).toFixed(1)}${name === 'temperature' ? '°' + getTemperatureUnit() : '%'}`,
                      name === 'temperature' ? 'Temperature' : 'Average Yield'
                    ]}
                    labelStyle={{ color: 'var(--foreground)' }}
                    contentStyle={{ 
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--foreground)'
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Scatter dataKey="avgYield" fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Strain Performance Ranking Section */}
      <div className="space-y-6">
        <StrainRankingChart startMaterialFilter={startMaterialFilter} />
      </div>
    </div>
  );
}
