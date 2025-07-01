import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Plus, List, TrendingUp, History, Settings, LogOut, FileText, Target, TestTube, Menu, X } from "lucide-react";
import logoImage from "@assets/Rosin Logger Logo Cropped transparent_1751361491826.png";
import { useState } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const { authEnabled, logout } = useAuth();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "New Press", href: "/new-press", icon: Plus },
    { name: "All Batches", href: "/batches", icon: List },
    { name: "Curing Logs", href: "/curing-logs", icon: FileText },
    { name: "Analytics", href: "/analytics", icon: TrendingUp },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className={cn(
      "bg-card shadow-sm border-r border-border lg:min-h-screen transition-all duration-300 relative",
      isCollapsed ? "lg:w-16" : "lg:w-64"
    )}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full bg-background border border-border shadow-sm hover:shadow-md"
      >
        {isCollapsed ? <Menu className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </Button>

      <div className={cn("p-6", isCollapsed && "p-3")}>
        <div className={cn("flex items-center mb-8", isCollapsed ? "justify-center" : "space-x-3")}>
          <div className="w-10 h-10 flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="Rosin Logger" 
              className="w-10 h-10 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-2xl font-bold text-foreground">Rosin Tracker</h1>
            </div>
          )}
        </div>
        
        {/* Logout Button - Only show if auth is enabled */}
        {authEnabled && (
          <div className={cn("mb-6", isCollapsed ? "px-0" : "p-3 bg-muted rounded-lg")}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={cn(
                "text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent",
                isCollapsed 
                  ? "w-10 h-10 p-0 justify-center" 
                  : "w-full justify-start"
              )}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && "Logout"}
            </Button>
          </div>
        )}

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.name} href={item.href}>
                <a 
                  className={cn(
                    "flex items-center text-sm font-medium rounded-md transition-colors",
                    isCollapsed ? "px-2 py-3 justify-center" : "px-3 py-2",
                    isActive 
                      ? "text-primary bg-primary/10 border border-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                  {!isCollapsed && item.name}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
