import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (emailOrUsername: string, password: string, twoFactorCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  authEnabled: boolean;
  needsSetup: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authEnabled, setAuthEnabled] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const queryClient = useQueryClient();

  // Check if auth is enabled and if setup is needed
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("/api/auth/status");
        const data = await response.json();
        setAuthEnabled(data.enabled);
        setNeedsSetup(data.needsSetup || false);
      } catch (error) {
        console.error("Failed to check auth status:", error);
        setAuthEnabled(false);
        setNeedsSetup(false);
      }
    };
    checkAuthStatus();
  }, []);

  // Get current user if auth is enabled
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: authEnabled,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ emailOrUsername, password, twoFactorCode }: { 
      emailOrUsername: string; 
      password: string; 
      twoFactorCode?: string; 
    }) => {
      await apiRequest("/api/auth/login", "POST", { 
        emailOrUsername, 
        password, 
        twoFactorCode 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/auth/logout", "POST");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  const isAuthenticated = authEnabled ? !!user : true; // If auth disabled, consider authenticated

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: authEnabled ? isLoading : false,
        user,
        login: async (emailOrUsername: string, password: string, twoFactorCode?: string) => {
          await loginMutation.mutateAsync({ emailOrUsername, password, twoFactorCode });
        },
        logout: logoutMutation.mutateAsync,
        authEnabled,
        needsSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}