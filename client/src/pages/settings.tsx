import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useUnits } from "@/contexts/units-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { QRCodeComponent } from "@/components/ui/qr-code";
import { Settings, Shield, Smartphone, Key, Save, AlertTriangle, Moon, Sun, Palette, Ruler, Download, Database, Upload, FileJson } from "lucide-react";

interface SecuritySettings {
  authEnabled: boolean;
  hasUsers: boolean;
  needsSetup: boolean;
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  currentUser: {
    id: number;
    email: string;
    username: string;
    isEmailVerified: boolean;
  } | null;
}

interface Setup2FAResponse {
  secret: string;
  qrCodeUrl: string;
}

export default function SettingsPage() {
  const { authEnabled } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unitSystem, toggleUnits } = useUnits();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorQRCodeUrl, setTwoFactorQRCodeUrl] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'setup' | 'verify'>('setup');
  const [clearExistingData, setClearExistingData] = useState(false);
  
  // User setup states
  const [setupEmail, setSetupEmail] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  
  // User management states
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  // Fetch current security settings
  const { data: settings, isLoading } = useQuery<SecuritySettings>({
    queryKey: ["/api/settings/security"],
    retry: false,
  });

  // Update authentication settings
  const updateAuthMutation = useMutation({
    mutationFn: async (data: { 
      enableAuth?: boolean; 
      password?: string; 
      currentPassword?: string;
    }) => {
      await apiRequest("/api/settings/auth", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Authentication Updated",
        description: "Security settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/security"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update security settings.",
        variant: "destructive",
      });
    },
  });

  // Setup 2FA
  const setup2FAMutation = useMutation({
    mutationFn: async (): Promise<Setup2FAResponse> => {
      const response = await apiRequest("POST", "/api/settings/2fa/setup");
      return await response.json();
    },
    onSuccess: (data: Setup2FAResponse) => {
      console.log("2FA Setup Response:", data); // Debug log
      setTwoFactorSecret(data.secret);
      setTwoFactorQRCodeUrl(data.qrCodeUrl);
      setTwoFactorStep('setup');
      setShow2FAModal(true);
      toast({
        title: "2FA Setup Ready",
        description: "Scan the QR code with your authenticator app.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "2FA Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify 2FA code (test before enabling)
  const verify2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/settings/2fa/verify", { 
        code, 
        secret: twoFactorSecret 
      });
      return response;
    },
    onSuccess: () => {
      setTwoFactorStep('verify');
      toast({
        title: "Code Verified",
        description: "Your authenticator is working correctly. Click Enable 2FA to complete setup.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enable 2FA (final step)
  const enable2FAMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/settings/2fa/enable", { 
        secret: twoFactorSecret 
      });
    },
    onSuccess: () => {
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/security"] });
      setTwoFactorCode("");
      setTwoFactorSecret("");
      setTwoFactorQRCodeUrl("");
      setShow2FAModal(false);
      setTwoFactorStep('setup');
    },
    onError: (error: Error) => {
      toast({
        title: "2FA Enable Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disable 2FA
  const disable2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      await apiRequest("POST", "/api/settings/2fa/disable", { code });
    },
    onSuccess: () => {
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/security"] });
    },
  });

  // Backup export mutation
  const exportBackupMutation = useMutation({
    mutationFn: async () => {
      // Make the API request to get backup data
      const response = await fetch('/api/backup/export', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export backup');
      }
      
      // Get the filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'rosin-tracker-backup.json';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Get the backup data as blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { filename };
    },
    onSuccess: (data) => {
      toast({
        title: "Backup Exported",
        description: `Backup file ${data.filename} has been downloaded successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export backup",
        variant: "destructive",
      });
    },
  });

  // Backup import mutation
  const importBackupMutation = useMutation({
    mutationFn: async ({ backup, clearExisting }: { backup: any; clearExisting: boolean }) => {
      const response = await apiRequest('/api/backup/import', 'POST', {
        backup,
        clearExisting
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Backup Imported",
        description: `Successfully imported ${data.imported?.rosinPresses || 0} batches, ${data.imported?.curingLogs || 0} curing logs, and ${data.imported?.curingReminders || 0} reminders.`,
      });
      // Invalidate all queries to refresh the data
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import backup",
        variant: "destructive",
      });
    },
  });

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      toast({
        title: "Invalid File",
        description: "Please select a JSON backup file.",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        importBackupMutation.mutate({ backup, clearExisting: clearExistingData });
      } catch (error) {
        toast({
          title: "Invalid File",
          description: "The selected file is not a valid JSON backup.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset the input value to allow selecting the same file again
    event.target.value = '';
  };

  // User setup mutation (when no users exist)
  const setupUserMutation = useMutation({
    mutationFn: async (data: { email: string; username: string; password: string }) => {
      return await apiRequest("POST", "/api/settings/setup", data);
    },
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "Your user account has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/security"] });
      setSetupEmail("");
      setSetupUsername("");
      setSetupPassword("");
      setSetupConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("POST", "/api/settings/change-password", data);
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change email mutation
  const changeEmailMutation = useMutation({
    mutationFn: async (data: { newEmail: string; password: string }) => {
      return await apiRequest("POST", "/api/settings/change-email", data);
    },
    onSuccess: () => {
      toast({
        title: "Email Updated",
        description: "Your email address has been changed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/security"] });
      setNewEmail("");
      setEmailPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Email Change Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUserSetup = async () => {
    if (!setupEmail || !setupUsername || !setupPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }

    if (setupPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setupUserMutation.mutate({
      email: setupEmail,
      username: setupUsername,
      password: setupPassword,
    });
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleEmailChange = async () => {
    if (!newEmail || !emailPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    changeEmailMutation.mutate({
      newEmail,
      password: emailPassword,
    });
  };

  const handleEnableAuth = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    await updateAuthMutation.mutateAsync({
      enableAuth: true,
      password: newPassword,
    });
  };

  const handleDisableAuth = async () => {
    if (!currentPassword) {
      toast({
        title: "Current Password Required",
        description: "Please enter your current password to disable authentication.",
        variant: "destructive",
      });
      return;
    }

    await updateAuthMutation.mutateAsync({
      enableAuth: false,
      currentPassword,
    });
  };

  const handleSetup2FA = async () => {
    await setup2FAMutation.mutateAsync();
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }
    verify2FAMutation.mutate(twoFactorCode);
  };

  const handleEnable2FA = async () => {
    await enable2FAMutation.mutateAsync();
  };

  const handleClose2FAModal = () => {
    setShow2FAModal(false);
    setTwoFactorStep('setup');
    setTwoFactorCode("");
    setTwoFactorSecret("");
    setTwoFactorQRCodeUrl("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">Settings</h1>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize the look and feel of your Rosin Tracker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <div className="flex items-center space-x-3 min-w-[200px]">
              <div className="flex items-center space-x-2 min-w-[60px]">
                <Sun className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Light</span>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-slate-800"
              />
              <div className="flex items-center space-x-2 min-w-[60px]">
                <Moon className="h-4 w-4 text-slate-700" />
                <span className="text-sm font-medium">Dark</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium">Unit System</Label>
              <p className="text-sm text-muted-foreground">
                Choose between metric and imperial measurements
              </p>
            </div>
            <div className="flex items-center space-x-3 min-w-[200px]">
              <div className="flex items-center space-x-2 min-w-[60px]">
                <Ruler className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Metric</span>
              </div>
              <Switch
                checked={unitSystem === "imperial"}
                onCheckedChange={toggleUnits}
                className="data-[state=checked]:bg-orange-500"
              />
              <div className="flex items-center space-x-2 min-w-[70px]">
                <Ruler className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Imperial</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Authentication</CardTitle>
          </div>
          <CardDescription>
            Manage user accounts and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Password Protection</Label>
              <p className="text-sm text-muted-foreground">
                Require login to access the application
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={authEnabled ? "default" : "secondary"}>
                {authEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>

          <Separator />

          {!authEnabled ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Authentication is disabled. Set the AUTH_PASSWORD environment variable to enable login protection.
                </AlertDescription>
              </Alert>
            </div>
          ) : settings?.needsSetup ? (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Authentication is enabled but no user accounts exist. Create your account below.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="setupEmail">Email Address</Label>
                  <Input
                    id="setupEmail"
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setupUsername">Username</Label>
                  <Input
                    id="setupUsername"
                    type="text"
                    value={setupUsername}
                    onChange={(e) => setSetupUsername(e.target.value)}
                    placeholder="Choose a username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setupPassword">Password</Label>
                  <Input
                    id="setupPassword"
                    type="password"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="Create a strong password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setupConfirmPassword">Confirm Password</Label>
                  <Input
                    id="setupConfirmPassword"
                    type="password"
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleUserSetup}
                disabled={setupUserMutation.isPending || !setupEmail || !setupUsername || !setupPassword || !setupConfirmPassword}
                className="w-full"
              >
                <Shield className="mr-2 h-4 w-4" />
                {setupUserMutation.isPending ? "Creating Account..." : "Create Your Account"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current User Info */}
              {settings?.currentUser && (
                <div className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Logged in as {settings.currentUser.username} ({settings.currentUser.email})
                      {!settings.currentUser.isEmailVerified && " - Email not verified"}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Password Change */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Change Password</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  <Key className="mr-2 h-4 w-4" />
                  {changePasswordMutation.isPending ? "Updating..." : "Change Password"}
                </Button>
              </div>

              <Separator />

              {/* Email Change */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Change Email Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">New Email Address</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailPassword">Confirm Password</Label>
                    <Input
                      id="emailPassword"
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleEmailChange}
                  disabled={changeEmailMutation.isPending || !newEmail || !emailPassword}
                  className="w-full"
                >
                  {changeEmailMutation.isPending ? "Updating..." : "Change Email"}
                </Button>
              </div>

              <Separator />

              {/* Recovery Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Account Recovery</h4>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> If you forget your password or lose 2FA access, you'll need server-side access to reset your account. 
                    Keep your login credentials and 2FA backup codes secure. For emergency recovery, access the server console and use the database management tools.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      {authEnabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            <CardDescription>
              Add an extra layer of security with 2FA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">2FA Status</Label>
                <p className="text-sm text-muted-foreground">
                  {settings?.twoFactorEnabled ? "Protected with authenticator app" : "Not configured"}
                </p>
              </div>
              <Badge variant={settings?.twoFactorEnabled ? "default" : "secondary"}>
                {settings?.twoFactorEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            <Separator />

            {!settings?.twoFactorEnabled ? (
              <Button 
                onClick={handleSetup2FA}
                disabled={setup2FAMutation.isPending}
                className="w-full"
              >
                <Key className="mr-2 h-4 w-4" />
                {setup2FAMutation.isPending ? "Setting up..." : "Setup Two-Factor Authentication"}
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication is active. You'll need your authenticator app to log in.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="disable2FACode">Verification Code</Label>
                  <Input
                    id="disable2FACode"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="Enter code to disable 2FA"
                    maxLength={6}
                  />
                </div>

                <Button 
                  onClick={() => disable2FAMutation.mutateAsync(twoFactorCode)}
                  disabled={disable2FAMutation.isPending || twoFactorCode.length !== 6}
                  variant="destructive"
                  className="w-full"
                >
                  {disable2FAMutation.isPending ? "Disabling..." : "Disable 2FA"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session Settings */}
      {authEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Session Management</CardTitle>
            <CardDescription>
              Configure session timeout and security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Currently set to 24 hours
                  </p>
                </div>
                <Badge variant="outline">24h</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Backup Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <CardTitle>Data Backup</CardTitle>
          </div>
          <CardDescription>
            Export all your rosin press data and images for backup or migration purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Section */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="font-medium">Export Complete Backup</p>
              <p className="text-sm text-muted-foreground">
                Downloads a JSON file containing all batches, curing logs, reminders, and embedded images.
              </p>
            </div>
            <Button 
              onClick={() => exportBackupMutation.mutate()}
              disabled={exportBackupMutation.isPending}
              size="sm"
              className="ml-4"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportBackupMutation.isPending ? "Exporting..." : "Export"}
            </Button>
          </div>

          <Separator />
          
          {/* Import Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FileJson className="h-4 w-4" />
              <p className="font-medium">Import Backup</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="clearExisting"
                  checked={clearExistingData}
                  onChange={(e) => setClearExistingData(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="clearExisting" className="text-sm">
                  Clear existing data before import (recommended for full restore)
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  disabled={importBackupMutation.isPending}
                  className="hidden"
                  id="backup-file-input"
                />
                <Button
                  onClick={() => document.getElementById('backup-file-input')?.click()}
                  disabled={importBackupMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importBackupMutation.isPending ? "Importing..." : "Select Backup File"}
                </Button>
                {clearExistingData && (
                  <Badge variant="destructive" className="text-xs">
                    Will clear existing data
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Importing a backup will add or replace data in your system. Use "Clear existing data" for a complete restore from backup.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 2FA Setup Modal */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Setup Two-Factor Authentication</span>
            </DialogTitle>
            <DialogDescription>
              {twoFactorStep === 'setup' 
                ? "Scan the QR code with your authenticator app to get started."
                : "Verify your authenticator app is working correctly."
              }
            </DialogDescription>
          </DialogHeader>

          {twoFactorStep === 'setup' ? (
            <div className="space-y-4">
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  Scan this QR code with your authenticator app (like Google Authenticator, Authy, or 1Password).
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                {twoFactorQRCodeUrl && (
                  <QRCodeComponent 
                    value={twoFactorQRCodeUrl} 
                    size={200}
                    className="flex justify-center p-4 bg-muted rounded-lg"
                  />
                )}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Manual entry key:</p>
                  <p className="font-mono text-xs bg-muted p-2 rounded break-all">{twoFactorSecret}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="modalTwoFactorCode">Enter code from your authenticator app</Label>
                <Input
                  id="modalTwoFactorCode"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={handleClose2FAModal}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleVerify2FA}
                  disabled={verify2FAMutation.isPending || twoFactorCode.length !== 6}
                  className="flex-1"
                >
                  {verify2FAMutation.isPending ? "Verifying..." : "Test Code"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Great! Your authenticator app is working correctly. Click "Enable 2FA" to complete the setup.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-3">
                <Button 
                  onClick={handleClose2FAModal}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleEnable2FA}
                  disabled={enable2FAMutation.isPending}
                  className="flex-1"
                >
                  {enable2FAMutation.isPending ? "Enabling..." : "Enable 2FA"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}