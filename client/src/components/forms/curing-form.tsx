import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { insertCuringLogSchema, type InsertCuringLog } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

const formSchema = insertCuringLogSchema.extend({
  pictures: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CuringFormProps {
  onSuccess?: () => void;
  batchId?: number;
  initialData?: Partial<InsertCuringLog>;
}

export function CuringForm({ onSuccess, batchId, initialData }: CuringFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: batches } = useQuery({
    queryKey: ["/api/rosin-presses/recent"],
    enabled: !batchId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchId: batchId || initialData?.batchId || 0,
      visualColor: initialData?.visualColor || "",
      aromaNotes: initialData?.aromaNotes || "",
      consistency: initialData?.consistency || "",
      curingNotes: initialData?.curingNotes || "",
      pictures: initialData?.pictures || [],
    },
  });

  const createLog = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/curing-logs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/curing-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/statistics"] });
      if (batchId) {
        queryClient.invalidateQueries({ queryKey: ["/api/curing-logs/batch", batchId] });
      }
      toast({ title: "Success", description: "Curing log created successfully" });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create curing log",
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createLog.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <span>Curing Log Details</span>
              {batchId && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Batch #{batchId}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!batchId && (
              <FormField
                control={form.control}
                name="batchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a batch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {batches?.map((batch: any) => (
                          <SelectItem key={batch.id} value={batch.id.toString()}>
                            {batch.strain} - {new Date(batch.pressDate).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="visualColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visual Color</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light-amber">Light Amber</SelectItem>
                      <SelectItem value="amber">Amber</SelectItem>
                      <SelectItem value="dark-amber">Dark Amber</SelectItem>
                      <SelectItem value="golden">Golden</SelectItem>
                      <SelectItem value="brown">Brown</SelectItem>
                      <SelectItem value="dark-brown">Dark Brown</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consistency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consistency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select consistency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sap">Sap</SelectItem>
                      <SelectItem value="sauce">Sauce</SelectItem>
                      <SelectItem value="budder">Budder</SelectItem>
                      <SelectItem value="badder">Badder</SelectItem>
                      <SelectItem value="wax">Wax</SelectItem>
                      <SelectItem value="shatter">Shatter</SelectItem>
                      <SelectItem value="crumble">Crumble</SelectItem>
                      <SelectItem value="live-rosin">Live Rosin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aromaNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aroma Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the aroma and terpene profile..."
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
              name="curingNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Curing Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes about the curing process and observations..."
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
          <Button type="submit" disabled={createLog.isPending}>
            {createLog.isPending ? "Saving..." : "Save Curing Log"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
