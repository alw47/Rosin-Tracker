import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UnitsProvider } from "@/contexts/units-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import NewPress from "@/pages/new-press";
import AllBatches from "@/pages/all-batches";
import BatchDetails from "@/pages/batch-details";
import Analytics from "@/pages/analytics";
import CuringLogs from "@/pages/curing-logs";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, authEnabled } = useAuth();

  // Show loading while checking auth status
  if (authEnabled && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if auth is enabled and user is not authenticated
  if (authEnabled && !isAuthenticated) {
    return <Login />;
  }

  // Show main app if auth is disabled or user is authenticated
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <div className="p-6 overflow-y-auto h-screen bg-background text-foreground">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/new-press" component={NewPress} />
            <Route path="/batches" component={AllBatches} />
            <Route path="/batch/:id" component={BatchDetails} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/curing-logs" component={CuringLogs} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <UnitsProvider>
            <AuthProvider>
              <Router />
              <Toaster />
            </AuthProvider>
          </UnitsProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
