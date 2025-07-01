import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUnits } from "@/contexts/units-context";
import { formatMicronBags } from "@/lib/utils";
import { Link } from "wouter";
import { Search, Filter, Eye, Edit, Trash2, TestTube, Calendar, Percent, Weight } from "lucide-react";

export default function AllBatches() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const { convertWeight, convertTemperature, convertPressure, getWeightUnit, getTemperatureUnit, getPressureUnit, unitSystem } = useUnits();

  const { data: batches, isLoading } = useQuery({
    queryKey: ["/api/rosin-presses"],
  });

  const filteredBatches = batches?.filter((batch: any) =>
    batch.strain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    batch.startMaterial.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedBatches = filteredBatches?.sort((a: any, b: any) => {
    switch (sortBy) {
      case "date":
        return new Date(b.pressDate).getTime() - new Date(a.pressDate).getTime();
      case "strain":
        return a.strain.localeCompare(b.strain);
      case "yield":
        return b.yieldPercentage - a.yieldPercentage;
      case "amount":
        return b.yieldAmount - a.yieldAmount;
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">All Batches</h1>
          <p className="text-gray-500 mt-1">View and manage all rosin press batches</p>
        </div>
        <Link href="/new-press">
          <Button>
            <TestTube className="h-4 w-4 mr-2" />
            New Press
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by strain or material..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date (Newest)</SelectItem>
                <SelectItem value="strain">Strain (A-Z)</SelectItem>
                <SelectItem value="yield">Yield % (Highest)</SelectItem>
                <SelectItem value="amount">Amount (Highest)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batches Grid */}
      {sortedBatches?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <TestTube className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No batches found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? "Try adjusting your search criteria" : "Create your first rosin press to get started"}
            </p>
            <Link href="/new-press">
              <Button>Create New Press</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBatches?.map((batch: any) => (
            <Link key={batch.id} href={`/batch/${batch.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mb-2">
                        Batch #{batch.id}
                      </Badge>
                      <CardTitle className="text-lg">{batch.strain}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(batch.pressDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {batch.startMaterial}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Percent className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Yield</p>
                        <p className="font-semibold">{batch.yieldPercentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Weight className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-semibold">
                          {convertWeight(batch.yieldAmount).toFixed(2)}{getWeightUnit()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="space-y-2 text-sm">
                    {batch.temperature && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Temperature:</span>
                        <span>{convertTemperature(batch.temperature, "metric").toFixed(0)}{getTemperatureUnit()}</span>
                      </div>
                    )}
                    {batch.pressure && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pressure:</span>
                        <span>{convertPressure(batch.pressure).toFixed(0)} {getPressureUnit()}</span>
                      </div>
                    )}
                    {batch.humidity && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Humidity:</span>
                        <span>{batch.humidity}%</span>
                      </div>
                    )}
                    {batch.pressDuration && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <span>{Math.floor(batch.pressDuration / 60)}:{(batch.pressDuration % 60).toString().padStart(2, '0')}</span>
                      </div>
                    )}
                    {batch.pressSize && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Press Size:</span>
                        <span>{batch.pressSize} tons</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Micron Bags:</span>
                      <span className="text-right text-xs">{formatMicronBags(batch.micronBags, unitSystem)}</span>
                    </div>
                  </div>

                  {/* View Indicator */}
                  <div className="flex justify-center pt-3 border-t">
                    <span className="text-sm text-gray-500 flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      Click to view details & manage curing
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
