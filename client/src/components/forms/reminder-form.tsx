import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Clock, Repeat } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCuringReminderSchema, type InsertCuringReminder } from "@shared/schema";
import { z } from "zod";

const formSchema = insertCuringReminderSchema.omit({
  completed: true,
}).extend({
  scheduledFor: z.string().min(1, "Scheduled date is required"),
  recurringEndDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ReminderFormProps {
  batchId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReminderForm({ batchId, onSuccess, onCancel }: ReminderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchId: batchId || 0,
      reminderName: "",
      reminderType: "agitation",
      scheduledFor: "",
      notes: "",
      isRecurring: false,
      recurringInterval: undefined,
      recurringEndDate: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Convert string dates to proper format for server
      const processedData = {
        ...data,
        recurringEndDate: data.recurringEndDate ? data.recurringEndDate : undefined,
      };
      
      await apiRequest("POST", "/api/curing-reminders", processedData);
    },
    onSuccess: () => {
      toast({
        title: "Reminder Created",
        description: "Your curing reminder has been scheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/curing-reminders"] });
      if (batchId) {
        queryClient.invalidateQueries({ queryKey: [`/api/curing-reminders/batch/${batchId}`] });
      }
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reminder",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const reminderTypes = [
    { value: "agitation", label: "Agitation Needed", description: "Stir or mix the curing material" },
    { value: "temperature_check", label: "Temperature Check", description: "Monitor storage temperature" },
    { value: "moisture_check", label: "Moisture Check", description: "Check humidity levels" },
    { value: "harvest", label: "Ready to Harvest", description: "Product is ready for final processing" },
    { value: "custom", label: "Custom Reminder", description: "Custom task or note" },
  ];

  const selectedType = reminderTypes.find(type => type.value === form.watch("reminderType"));

  // Quick schedule options
  const quickScheduleOptions = [
    { label: "In 1 hour", hours: 1 },
    { label: "In 4 hours", hours: 4 },
    { label: "In 8 hours", hours: 8 },
    { label: "In 12 hours", hours: 12 },
    { label: "In 24 hours", hours: 24 },
    { label: "In 3 days", hours: 72 },
    { label: "In 1 week", hours: 168 },
  ];

  const setQuickSchedule = (hours: number) => {
    const scheduledDate = new Date();
    scheduledDate.setHours(scheduledDate.getHours() + hours);
    const isoString = scheduledDate.toISOString().slice(0, 16); // Format for datetime-local input
    form.setValue("scheduledFor", isoString);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Curing Reminder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!batchId && (
              <FormField
                control={form.control}
                name="batchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch ID</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter batch ID" 
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reminderType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reminder type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reminderTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{type.label}</span>
                            <span className="text-xs text-muted-foreground">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedType && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{selectedType.label}</Badge>
                      <span className="text-xs text-muted-foreground">{selectedType.description}</span>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a descriptive name..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduledFor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Scheduled For
                  </FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  
                  {/* Quick schedule buttons */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs text-muted-foreground mr-2">Quick schedule:</span>
                    {quickScheduleOptions.map((option) => (
                      <Button
                        key={option.hours}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickSchedule(option.hours)}
                        className="text-xs"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring Reminder Options */}
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      <Repeat className="h-4 w-4 inline mr-2" />
                      Make this a recurring reminder
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Automatically create follow-up reminders at regular intervals
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("isRecurring") && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <FormField
                  control={form.control}
                  name="recurringInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat every (hours)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="6">6 hours</SelectItem>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">Daily</SelectItem>
                          <SelectItem value="48">Every 2 days</SelectItem>
                          <SelectItem value="72">Every 3 days</SelectItem>
                          <SelectItem value="168">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recurringEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop recurring on (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Leave empty to continue indefinitely
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional instructions or notes..."
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                {mutation.isPending ? "Creating..." : "Create Reminder"}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}