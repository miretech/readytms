import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [location, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Get token and user type from URL query params
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get("token") || "";
  const userType = params.get("type") || "admin";
  const isDriver = userType === "driver";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1: Request password reset email
  const onRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Email is required");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      
      await apiRequest("POST", "/api/auth/request-password-reset", {
        email,
        userType: isDriver ? "driver" : "admin",
      });

      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Reset password with token
  const onResetPassword = async (e: React.FormEvent) => {
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
            <CardTitle className="text-2xl font-bold">
              {tokenFromUrl ? "Reset Password" : "Forgot Password"}
            </CardTitle>
            <CardDescription>
              {tokenFromUrl 
                ? `Enter your new password below ${isDriver ? "(Driver)" : "(Admin)"}`
                : `Enter your email to receive a password reset link ${isDriver ? "(Driver)" : "(Admin)"}`
              }
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
            ) : emailSent ? (
              <div className="space-y-4">
                <Alert data-testid="alert-email-sent">
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    If an account with that email exists, we've sent a password reset link. Please check your inbox.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation(isDriver ? "/driver-pod" : "/login")}
                  data-testid="button-back-to-login"
                >
                  Back to Login
                </Button>
              </div>
            ) : tokenFromUrl ? (
              <form onSubmit={onResetPassword} className="space-y-4">
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
                  data-testid="button-reset-password"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            ) : (
              <form onSubmit={onRequestReset} className="space-y-4">
                {error && (
                  <Alert variant="destructive" data-testid="alert-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={isDriver ? "driver@example.com" : "admin@example.com"}
                    data-testid="input-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-request-reset"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation(isDriver ? "/driver-pod" : "/login")}
                  data-testid="button-back-to-login"
                >
                  Back to Login
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
