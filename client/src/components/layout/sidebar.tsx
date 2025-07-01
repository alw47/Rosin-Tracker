import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Plus, List, TrendingUp, History, Settings, LogOut, FileText, Target, TestTube } from "lucide-react";
import logoImage from "@assets/Rosin Logger Logo Cropped transparent_1751361491826.png";

export function Sidebar() {
  const [location] = useLocation();
  const { authEnabled, logout } = useAuth();
  const { toast } = useToast();

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
    <aside className="lg:w-64 bg-card shadow-sm border-r border-border lg:min-h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="Rosin Logger" 
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rosin Tracker</h1>
          </div>
        </div>
        
        {/* Settings */}
        <div className="mb-6 space-y-4">




          {/* Logout Button - Only show if auth is enabled */}
          {authEnabled && (
            <div className="p-3 bg-muted rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.name} href={item.href}>
                <a className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "text-primary bg-primary/10 border border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}>
                  <Icon className="mr-3 h-4 w-4" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
