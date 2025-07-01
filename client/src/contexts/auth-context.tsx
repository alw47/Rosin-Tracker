import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  authEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authEnabled, setAuthEnabled] = useState(false);
  const queryClient = useQueryClient();

  // Check if auth is enabled
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("/api/auth/status");
        const data = await response.json();
        setAuthEnabled(data.enabled);
      } catch (error) {
        console.error("Failed to check auth status:", error);
        setAuthEnabled(false);
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
    mutationFn: async (password: string) => {
      await apiRequest("/api/auth/login", "POST", { password });
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
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        authEnabled,
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