import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CuringForm } from "@/components/forms/curing-form";
import { ReminderForm } from "@/components/forms/reminder-form";
import { useUnits } from "@/contexts/units-context";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime, formatDuration, formatMicronBags } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Plus, ArrowLeft, Thermometer, Timer, Droplets, TestTube, Percent, Weight, X, Calendar, Clock, Check, AlertCircle, MinusCircle, Edit } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { RosinPress, CuringLog, CuringReminder } from "@shared/schema";
import { PressForm } from "@/components/forms/press-form";

export default function BatchDetails() {
  const [, params] = useRoute("/batch/:id");
  const batchId = parseInt(params?.id || "0");
  const { convertTemperature, convertWeight, convertPressure, getTemperatureUnit, getWeightUnit, getPressureUnit, unitSystem } = useUnits();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCuringForm, setShowCuringForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Helper function to display value or N/A with icon
  const renderValueOrNA = (value: number | null | undefined, unit: string = "", decimals: number = 0) => {
    if (value === null || value === undefined || value === 0) {
      return (
        <span className="flex items-center text-gray-400">
          <MinusCircle className="h-3 w-3 mr-1" />
          N/A
        </span>
      );
    }
    return `${value.toFixed(decimals)}${unit}`;
  };

  const { data: batch, isLoading: batchLoading } = useQuery<RosinPress>({
    queryKey: [`/api/rosin-presses/${batchId}`],
    enabled: !!batchId && !isNaN(batchId),
  });

  const { data: curingLogs, isLoading: logsLoading } = useQuery<CuringLog[]>({
    queryKey: [`/api/curing-logs/batch/${batchId}`],
    enabled: !!batchId && !isNaN(batchId),
  });

  // Fetch reminders for this batch
  const { data: reminders = [], isLoading: remindersLoading } = useQuery<CuringReminder[]>({
    queryKey: [`/api/curing-reminders/batch/${batchId}`],
    enabled: !!batchId && !isNaN(batchId),
  });

  const deleteCuringLog = useMutation({
    mutationFn: async (logId: number) => {
      await apiRequest("DELETE", `/api/curing-logs/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/curing-logs/batch/${batchId}`] });
      toast({ title: "Success", description: "Curing log deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete curing log",
        variant: "destructive"
      });
    },
  });

  // Complete reminder mutation
  const completeReminder = useMutation({
    mutationFn: async (reminderId: number) => {
      await apiRequest("POST", `/api/curing-reminders/${reminderId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/curing-reminders/batch/${batchId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/curing-reminders/overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/curing-reminders/active"] });
      toast({ title: "Success", description: "Reminder completed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to complete reminder",
        variant: "destructive"
      });
    },
  });

  // Delete reminder mutation  
  const deleteReminder = useMutation({
    mutationFn: async (reminderId: number) => {
      await apiRequest("DELETE", `/api/curing-reminders/${reminderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/curing-reminders/batch/${batchId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/curing-reminders/overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/curing-reminders/active"] });
      toast({ title: "Success", description: "Reminder deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete reminder",
        variant: "destructive"
      });
    },
  });

  // Helper functions for reminders
  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'agitation': return 'Agitation Needed';
      case 'temperature_check': return 'Temperature Check';
      case 'moisture_check': return 'Moisture Check';
      case 'harvest': return 'Ready to Harvest';
      case 'custom': return 'Custom Reminder';
      default: return 'Reminder';
    }
  };

  const getReminderTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'agitation': return 'default' as const;
      case 'temperature_check': return 'secondary' as const;
      case 'moisture_check': return 'outline' as const;
      case 'harvest': return 'destructive' as const;
      case 'custom': return 'default' as const;
      default: return 'default' as const;
    }
  };

  const isReminderOverdue = (scheduledFor: string | Date) => {
    return new Date(scheduledFor) < new Date();
  };

  if (batchLoading || !batch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/batches">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Batches
            </Button>
          </Link>
        </div>
        {batchLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Batch not found</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const handleCuringSuccess = () => {
    setShowCuringForm(false);
    queryClient.invalidateQueries({ queryKey: [`/api/curing-logs/batch/${batchId}`] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/batches">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Batches
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Batch #{batch.id}</h1>
            <p className="text-lg text-gray-600">
              {Array.isArray(batch.strain) ? batch.strain.join(" + ") : batch.strain} - {formatDate(batch.pressDate)}
            </p>
          </div>
        </div>
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <PressForm 
              editingBatch={batch}
              onSuccess={() => {
                setShowEditForm(false);
                queryClient.invalidateQueries({ queryKey: [`/api/rosin-presses/${batchId}`] });
                queryClient.invalidateQueries({ queryKey: ["/api/rosin-presses"] });
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strain Info */}
        <Card>
          <CardHeader>
            <CardTitle>Strain Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <TestTube className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Strain{Array.isArray(batch.strain) && batch.strain.length > 1 ? 's' : ''}</p>
                <p className="font-semibold">
                  {Array.isArray(batch.strain) ? batch.strain.join(" + ") : batch.strain}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Weight className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Start Material</p>
                <p className="font-semibold">{batch.startMaterial}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <TestTube className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Micron Bags</p>
                <p className="font-semibold">{formatMicronBags(batch.micronBags as any, unitSystem)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Weight className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Start Amount</p>
                <p className="font-semibold">{convertWeight(batch.startAmount).toFixed(2)} {getWeightUnit()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Weight className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Yield Amount</p>
                <p className="font-semibold">{convertWeight(batch.yieldAmount).toFixed(2)} {getWeightUnit()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Percent className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Yield Percentage</p>
                <p className="font-semibold">{batch.yieldPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Press Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Press Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Thermometer className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Temperature</p>
                <p className="font-semibold">{renderValueOrNA(batch.temperature ? convertTemperature(batch.temperature, "metric") : batch.temperature, getTemperatureUnit(), 0)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Weight className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-500">Pressure</p>
                <p className="font-semibold">{renderValueOrNA(batch.pressure ? convertPressure(batch.pressure) : batch.pressure, ` ${getPressureUnit()}`, 0)}</p>
              </div>
            </div>
            {batch.pressSize && (
              <div className="flex items-center space-x-2">
                <TestTube className="h-4 w-4 text-indigo-600" />
                <div>
                  <p className="text-sm text-gray-500">Press Size</p>
                  <p className="font-semibold">{batch.pressSize} tons</p>
                </div>
              </div>
            )}
            {batch.pressDuration && (
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-semibold">{formatDuration(batch.pressDuration)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Droplets className="h-4 w-4 text-cyan-600" />
              <div>
                <p className="text-sm text-gray-500">Humidity</p>
                <p className="font-semibold">{renderValueOrNA(batch.humidity, "%", 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {batch.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{batch.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Images */}
      {batch.pictures && batch.pictures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {batch.pictures.map((picture: string, index: number) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <div className="cursor-pointer group relative w-full max-w-[200px] max-h-[200px] aspect-square overflow-hidden rounded-lg">
                      <img
                        src={picture}
                        alt={`Batch ${batch.id} - Image ${index + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                        <div className="bg-black bg-opacity-70 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-medium whitespace-nowrap">
                            Click to enlarge
                          </span>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-full">
                    <div className="relative">
                      <img
                        src={picture}
                        alt={`Batch ${batch.id} - Image ${index + 1} (Full Size)`}
                        className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Curing Logs Section - NOW FIRST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Curing Logs</h2>
          <Button onClick={() => setShowCuringForm(!showCuringForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Curing Log
          </Button>
        </div>

        {showCuringForm && (
          <Card>
            <CardHeader>
              <CardTitle>New Curing Log</CardTitle>
            </CardHeader>
            <CardContent>
              <CuringForm onSuccess={handleCuringSuccess} batchId={batchId} />
            </CardContent>
          </Card>
        )}

        {logsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : curingLogs && curingLogs.length > 0 ? (
          <div className="grid gap-4">
            {curingLogs.map((log: any) => (
              <Card key={log.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{formatDate(log.curingDate)}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCuringLog.mutate(log.id)}
                      disabled={deleteCuringLog.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Visual Color</p>
                      <Badge variant="outline">{log.visualColor}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Consistency</p>
                      <Badge variant="outline">{log.consistency}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Curing Date</p>
                      <p className="text-sm">{formatDateTime(log.curingDate)}</p>
                    </div>
                  </div>
                  
                  {log.aromaNotes && (
                    <div>
                      <p className="text-sm text-gray-500">Aroma Notes</p>
                      <p className="text-sm">{log.aromaNotes}</p>
                    </div>
                  )}
                  
                  {log.curingNotes && (
                    <div>
                      <p className="text-sm text-gray-500">Curing Notes</p>
                      <p className="text-sm">{log.curingNotes}</p>
                    </div>
                  )}
                  
                  {log.pictures && log.pictures.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Images</p>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {log.pictures.map((picture: string, index: number) => (
                          <Dialog key={index}>
                            <DialogTrigger asChild>
                              <div className="cursor-pointer group relative w-full aspect-square overflow-hidden rounded">
                                <img
                                  src={picture}
                                  alt={`Curing log ${log.id} - Image ${index + 1}`}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                                  <div className="bg-black bg-opacity-70 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-medium whitespace-nowrap">
                                      Click to enlarge
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl w-full">
                              <div className="relative">
                                <img
                                  src={picture}
                                  alt={`Curing log ${log.id} - Image ${index + 1} (Full Size)`}
                                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No curing logs yet</p>
              <p className="text-sm text-gray-400 mt-2">Add the first curing log to track this batch's progress</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Curing Reminders Section - NOW SECOND */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Curing Reminders
          </h2>
          <Button onClick={() => setShowReminderForm(!showReminderForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Reminder
          </Button>
        </div>

        {showReminderForm && (
          <ReminderForm 
            batchId={batchId}
            onSuccess={() => setShowReminderForm(false)}
            onCancel={() => setShowReminderForm(false)}
          />
        )}

        {remindersLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : reminders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No reminders scheduled</p>
              <p className="text-sm text-gray-400">Set up reminders to track curing tasks and deadlines</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reminders.map((reminder) => (
              <Card key={reminder.id} className={`${isReminderOverdue(reminder.scheduledFor) && !reminder.completed ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getReminderTypeBadgeVariant(reminder.reminderType)}>
                          {getReminderTypeLabel(reminder.reminderType)}
                        </Badge>
                        {reminder.completed && (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <Check className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        {isReminderOverdue(reminder.scheduledFor) && !reminder.completed && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-lg mb-1">{reminder.reminderName}</h3>
                      <p className="text-sm text-muted-foreground mb-1">
                        Scheduled: {formatDateTime(reminder.scheduledFor)}
                      </p>
                      {reminder.notes && (
                        <p className="text-sm text-gray-600 mt-2">{reminder.notes}</p>
                      )}
                      {reminder.completedAt && (
                        <p className="text-sm text-green-600 mt-2">
                          ✓ Completed: {formatDateTime(reminder.completedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!reminder.completed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => completeReminder.mutate(reminder.id)}
                          disabled={completeReminder.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteReminder.mutate(reminder.id)}
                        disabled={deleteReminder.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}