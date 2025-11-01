import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Lock, LogIn } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showRegister, setShowRegister] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      return await apiRequest("POST", "/api/admin/login", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome!",
        description: "You've successfully logged in.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      return await apiRequest("POST", "/api/admin/register", values);
    },
    onSuccess: (data: any) => {
      if (data.pendingApproval) {
        toast({
          title: "Registration Pending Approval",
          description: "Your registration has been submitted. An existing admin will review and approve your account. You'll be notified via email once approved.",
        });
      } else {
        toast({
          title: "Registration Successful",
          description: "You can now log in with your credentials.",
        });
      }
      setShowRegister(false);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    if (showRegister) {
      registerMutation.mutate(values);
    } else {
      loginMutation.mutate(values);
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-primary">Ready</span>
          <span className="text-blue-600">TMS</span>
        </h1>
        <p className="text-sm text-muted-foreground">Transportation Management System</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{showRegister ? "Create Admin Account" : "Admin Login"}</CardTitle>
          <CardDescription>
            {showRegister 
              ? "Register a new admin account to get started" 
              : "Welcome! Please log in to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="admin@example.com"
                          className="pl-10"
                          data-testid="input-email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          data-testid="input-password"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                data-testid="button-submit"
              >
                {isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {showRegister ? "Creating Account..." : "Logging in..."}
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    {showRegister ? "Create Account" : "Launch ReadyTMS"}
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowRegister(!showRegister)}
                  className="text-sm text-primary hover:underline"
                  data-testid="button-toggle-register"
                >
                  {showRegister 
                    ? "Already have an account? Log in" 
                    : "Need an account? Click here"}
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          For driver access, visit <a href="/driver-pod" className="text-primary hover:underline">/driver-pod</a>
        </p>
      </div>
    </div>
  );
}
