import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Clock, AlertCircle, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDateTime } from "@/lib/utils";
import { CuringReminder } from "@shared/schema";

interface NotificationsDropdownProps {
  className?: string;
}

export function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch overdue reminders
  const { data: overdueReminders = [], isLoading } = useQuery({
    queryKey: ["/api/curing-reminders/overdue"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch active reminders (for the count)
  const { data: activeReminders = [] } = useQuery({
    queryKey: ["/api/curing-reminders/active"],
    refetchInterval: 30000,
  });

  // Complete reminder mutation
  const completeMutation = useMutation({
    mutationFn: async (reminderId: number) => {
      await apiRequest("POST", `/api/curing-reminders/${reminderId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/curing-reminders"] });
    },
  });

  const totalNotifications = (overdueReminders as CuringReminder[]).length;
  const hasNotifications = totalNotifications > 0;

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

  const handleCompleteReminder = (reminderId: number) => {
    completeMutation.mutate(reminderId);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className={`relative ${className}`}>
          <Bell className="h-4 w-4" />
          {hasNotifications && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Curing Reminders</span>
          {hasNotifications && (
            <Badge variant="secondary" className="text-xs">
              {totalNotifications} overdue
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading reminders...
          </div>
        ) : !hasNotifications ? (
          <div className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No overdue reminders</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(activeReminders as CuringReminder[]).length > 0 
                ? `${(activeReminders as CuringReminder[]).length} upcoming reminder${(activeReminders as CuringReminder[]).length === 1 ? '' : 's'}`
                : 'All caught up!'
              }
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {(overdueReminders as CuringReminder[]).map((reminder: CuringReminder) => (
              <div key={reminder.id} className="p-3 border-b last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <Badge 
                        variant={getReminderTypeBadgeVariant(reminder.reminderType)}
                        className="text-xs"
                      >
                        {getReminderTypeLabel(reminder.reminderType)}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {reminder.reminderName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {formatDateTime(reminder.scheduledFor)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Batch #{reminder.batchId}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCompleteReminder(reminder.id)}
                    disabled={completeMutation.isPending}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        

      </DropdownMenuContent>
    </DropdownMenu>
  );
}