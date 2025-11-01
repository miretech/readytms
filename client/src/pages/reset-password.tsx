import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [location, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get token and user type from URL query params
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get("token") || "";
  const userType = params.get("type") || "admin";
  const isDriver = userType === "driver";

  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      
      await apiRequest("POST", "/api/auth/reset-password", {
        token: tokenFromUrl,
        password,
        userType: isDriver ? "driver" : "admin",
      });

      setSuccess(true);
      
      // Redirect to appropriate login page after 2 seconds
      setTimeout(() => {
        setLocation(isDriver ? "/driver-pod" : "/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Truck className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Ready TMS</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Transportation Management System
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>
              Enter your new password below {isDriver ? "(Driver Reset)" : "(Admin Reset)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <Alert data-testid="alert-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Password reset successful! Redirecting to login...
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" data-testid="alert-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    data-testid="input-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Must be at least 6 characters long
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Ready TMS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
