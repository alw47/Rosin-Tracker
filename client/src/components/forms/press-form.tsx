import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertRosinPressSchema, type InsertRosinPress, type RosinPress } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUnits } from "@/contexts/units-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { MicronBagInput } from "@/components/ui/micron-bag-input";
import { MultiStrainInput } from "@/components/ui/multi-strain-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

const formSchema = insertRosinPressSchema.extend({
  pictures: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PressFormProps {
  onSuccess?: () => void;
  initialData?: Partial<InsertRosinPress>;
  editingBatch?: RosinPress;
}

export function PressForm({ onSuccess, initialData, editingBatch }: PressFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { convertTemperature, convertWeight, convertPressure, getTemperatureUnit, getWeightUnit, getPressureUnit } = useUnits();
  
  const isEditMode = !!editingBatch;
  const formData = editingBatch || initialData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      strain: Array.isArray(formData?.strain) ? formData.strain : (formData?.strain ? [formData.strain] : []),
      startMaterial: formData?.startMaterial || "",
      startAmount: formData?.startAmount || 0,
      yieldAmount: formData?.yieldAmount || 0,
      yieldPercentage: formData?.yieldPercentage || 0,
      temperature: formData?.temperature || 90,
      pressure: formData?.pressure || undefined,
      pressSize: formData?.pressSize || undefined,
      micronBags: formData?.micronBags || [],
      numberOfPresses: formData?.numberOfPresses || undefined,
      humidity: formData?.humidity || undefined,
      pressDuration: initialData?.pressDuration || undefined,
      notes: initialData?.notes || "",
      pictures: initialData?.pictures || [],
    },
  });

  const savePress = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditMode && editingBatch) {
        const response = await apiRequest("PUT", `/api/rosin-presses/${editingBatch.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/rosin-presses", data);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rosin-presses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rosin-presses/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/statistics"] });
      if (isEditMode && editingBatch) {
        queryClient.invalidateQueries({ queryKey: [`/api/rosin-presses/${editingBatch.id}`] });
      }
      toast({ 
        title: "Success", 
        description: isEditMode ? "Batch updated successfully" : "Rosin press created successfully" 
      });
      if (!isEditMode) {
        form.reset();
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || (isEditMode ? "Failed to update batch" : "Failed to create rosin press"),
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("Form submission data:", data);
    console.log("Form errors:", form.formState.errors);
    
    // Calculate yield percentage
    const yieldPercentage = data.startAmount > 0 ? (data.yieldAmount / data.startAmount) * 100 : 0;
    const submissionData = {
      ...data,
      yieldPercentage: parseFloat(yieldPercentage.toFixed(2)),
    };
    
    console.log("Submitting data:", submissionData);
    savePress.mutate(submissionData);
  };

  // Watch start amount and yield amount to calculate percentage
  const startAmount = form.watch("startAmount");
  const yieldAmount = form.watch("yieldAmount");
  const yieldPercentage = startAmount > 0 ? ((yieldAmount / startAmount) * 100).toFixed(1) : "0.0";

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">
            {isEditMode ? `Edit Batch #${editingBatch?.id}` : "Create New Rosin Press"}
          </h2>
          <p className="text-gray-600 mt-2">
            {isEditMode ? "Update the details for this batch" : "Record a new rosin pressing session"}
          </p>
        </div>
        
        <form onSubmit={(e) => {
          console.log("Form submit event triggered");
          form.handleSubmit(onSubmit)(e);
        }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="strain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strains</FormLabel>
                    <FormControl>
                      <MultiStrainInput
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder="e.g., Blue Dream"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startMaterial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Material</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="flower">Flower</SelectItem>
                        <SelectItem value="hash">Hash</SelectItem>
                        <SelectItem value="kief">Kief</SelectItem>
                        <SelectItem value="trim">Trim</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Amount ({getWeightUnit()})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pressSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Press Size (Tons)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        placeholder="e.g., 10.0" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Press Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Press Settings</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                💡 Tip: Enter 0 for any measurement you don't have equipment to measure (pressure, humidity, etc.) - this indicates N/A
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature ({getTemperatureUnit()})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="90" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pressure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pressure ({getPressureUnit()})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1000" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="humidity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Humidity (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="62" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pressDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Press Duration (seconds)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="120" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preheatingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preheating Time (seconds)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="300" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberOfPresses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Presses</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="3" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Micron Bags */}
        <Card>
          <CardHeader>
            <CardTitle>Micron Bags</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="micronBags"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MicronBagInput
                      value={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="yieldAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yield Amount ({getWeightUnit()})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Yield Percentage (%)
                </Label>
                <Input 
                  type="text" 
                  value={`${yieldPercentage}%`}
                  readOnly 
                  className="cursor-default focus:ring-0 focus:ring-offset-0" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this press..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pictures"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pictures</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || []}
                      onChange={field.onChange}
                      maxImages={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button 
            type="submit" 
            disabled={savePress.isPending}
            onClick={() => {
              console.log("Submit button clicked");
              console.log("Form valid:", form.formState.isValid);
              console.log("Form errors:", form.formState.errors);
            }}
          >
            {savePress.isPending ? "Saving..." : (isEditMode ? "Update Batch" : "Save Press")}
          </Button>
        </div>
        </form>
      </div>
    </Form>
  );
}
