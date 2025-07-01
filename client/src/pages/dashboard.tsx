import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YieldChart } from "@/components/charts/yield-chart";
import { EnvironmentChart } from "@/components/charts/environment-chart";
import { useUnits } from "@/contexts/units-context";
import { Link } from "wouter";
import { Plus, TestTube, Percent, Clock, Weight, TrendingUp, ArrowRight } from "lucide-react";
import { NotificationsDropdown } from "@/components/ui/notifications-dropdown";
import type { RosinPress } from "@/shared/schema";

interface Statistics {
  totalBatches: number;
  avgYield: number;
  activeCuring: number;
  totalYield: number;
}

export default function Dashboard() {
  const { convertWeight, getWeightUnit } = useUnits();

  const { data: statistics, isLoading: statsLoading } = useQuery<Statistics>({
    queryKey: ["/api/analytics/statistics"],
  });

  const { data: recentBatches, isLoading: batchesLoading } = useQuery<RosinPress[]>({
    queryKey: ["/api/rosin-presses/recent"],
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatWeight = (weight: number) => {
    return convertWeight(weight).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your rosin pressing operations</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/new-press">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Press
            </Button>
          </Link>
          <NotificationsDropdown />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Batches</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {statistics?.totalBatches || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TestTube className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">Active pressing</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Yield</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {statistics?.avgYield ? `${statistics.avgYield.toFixed(1)}%` : "0.0%"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Percent className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">Consistent quality</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Curing</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {statistics?.activeCuring || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Clock className="h-4 w-4 text-yellow-600 mr-1" />
              <span className="text-yellow-600 font-medium">In progress</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Yield</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {statistics?.totalYield ? `${formatWeight(statistics.totalYield)}${getWeightUnit()}` : `0${getWeightUnit()}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Weight className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">Production total</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield Trends Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Yield Trends</CardTitle>
            <Select defaultValue="30">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <YieldChart />
          </CardContent>
        </Card>

        {/* Temperature & Humidity Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Temperature & Humidity</CardTitle>
            <div className="flex space-x-4">
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                Temp
              </div>
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                Humidity
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EnvironmentChart />
          </CardContent>
        </Card>
      </div>

      {/* Recent Batches & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Batches */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-semibold">Recent Batches</CardTitle>
              <Link href="/batches">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 py-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                      <div className="w-16 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentBatches?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No batches yet</p>
                  <p className="text-sm">Create your first rosin press to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBatches?.slice(0, 5).map((batch: any) => (
                    <div key={batch.id} className="flex items-center justify-between py-4 border-b border-green-200 dark:border-green-800 last:border-b-0">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <TestTube className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                              #{batch.id}
                            </Badge>
                            <p className="font-medium text-neutral-800">{batch.strain}</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            Pressed {new Date(batch.pressDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-neutral-800">{batch.yieldPercentage.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">
                          {formatWeight(batch.yieldAmount)}{getWeightUnit()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/new-press">
              <Button variant="outline" className="w-full justify-between h-auto p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">New Press</p>
                    <p className="text-sm text-gray-500">Start new batch</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Button>
            </Link>

            <Link href="/curing-logs">
              <Button variant="outline" className="w-full justify-between h-auto p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Curing Log</p>
                    <p className="text-sm text-gray-500">Update curing status</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Button>
            </Link>

            <Link href="/analytics">
              <Button variant="outline" className="w-full justify-between h-auto p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Analytics</p>
                    <p className="text-sm text-gray-500">View detailed reports</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
