import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CuringForm } from "@/components/forms/curing-form";
import { Search, Plus, Clock, Edit, Trash2, Calendar } from "lucide-react";

export default function CuringLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: curingLogs, isLoading } = useQuery({
    queryKey: ["/api/curing-logs"],
  });

  const { data: batches } = useQuery({
    queryKey: ["/api/rosin-presses/recent"],
  });

  const filteredLogs = curingLogs?.filter((log: any) =>
    log.visualColor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.consistency.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSuccess = () => {
    setIsDialogOpen(false);
  };

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
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">Curing Logs</h1>
          <p className="text-gray-500 mt-1">Track the curing process of your rosin batches</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Curing Log
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Curing Log</DialogTitle>
            </DialogHeader>
            <CuringForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by color or consistency..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches?.map((batch: any) => (
                  <SelectItem key={batch.id} value={batch.id.toString()}>
                    {batch.strain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Curing Logs Grid */}
      {filteredLogs?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No curing logs found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? "Try adjusting your search criteria" : "Start tracking the curing process of your batches"}
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Create New Curing Log</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Curing Log</DialogTitle>
                </DialogHeader>
                <CuringForm onSuccess={handleSuccess} />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLogs?.map((log: any) => (
            <Link key={log.id} href={`/batch/${log.batchId}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Batch #{log.batchId}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(log.curingDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {log.consistency}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Visual Properties */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Color:</span>
                      <span className="capitalize">{log.visualColor.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Consistency:</span>
                      <span className="capitalize">{log.consistency}</span>
                    </div>
                  </div>

                  {/* Notes Preview */}
                  {log.aromaNotes && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Aroma Notes:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {log.aromaNotes}
                      </p>
                    </div>
                  )}

                  {log.curingNotes && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Curing Notes:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {log.curingNotes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
