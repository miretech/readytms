import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, LogIn, Eye, EyeOff, AlertCircle, ArrowLeft, UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

export default function DivisionLogin() {
  const params = useParams<{ divisionId: string }>();
  const divisionId = params.divisionId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [requested, setRequested] = useState(false);

  const { data: division, isLoading } = useQuery<any>({
    queryKey: ["/api/divisions", divisionId],
    queryFn: async () => {
      const res = await fetch(`/api/divisions/${divisionId}`);
      if (!res.ok) throw new Error("Division not found");
      return res.json();
    },
    enabled: !!divisionId,
    retry: false,
  });

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      return await apiRequest("POST", "/api/admin/login", { ...values, expectedRole: "admin" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome!", description: `Signed in to ${division?.companyName || "your account"}.` });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({ title: "Sign In Failed", description: error.message || "Invalid email or password.", variant: "destructive" });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (values: SignupFormValues) => {
      const res = await fetch(`/api/divisions/${divisionId}/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }
      return res.json();
    },
    onSuccess: () => setRequested(true),
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!division) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Company Not Found</h3>
            <p className="text-muted-foreground mb-6">This company portal does not exist.</p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requested) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              {division.logoUrl ? (
                <img src={division.logoUrl} alt={division.companyName} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold">{division.companyName}</h1>
          </div>
          <Card>
            <CardContent className="p-10 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
              <p className="text-muted-foreground mb-6">
                Your access request for <strong>{division.companyName}</strong> has been submitted. A {division.companyName} administrator will review and approve your account. You'll receive an email once approved.
              </p>
              <Button onClick={() => setRequested(false)}>
                <LogIn className="mr-2 h-4 w-4" /> Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">

        <div className="text-center space-y-2">
          <div className="flex justify-center">
            {division.logoUrl ? (
              <img src={division.logoUrl} alt={division.companyName} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold">{division.companyName}</h1>
          <p className="text-muted-foreground text-sm">Powered by Ready TMS</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="signin">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="signin" className="flex-1" data-testid="tab-signin">
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </TabsTrigger>
                <TabsTrigger value="request" className="flex-1" data-testid="tab-request-access">
                  <UserPlus className="mr-2 h-4 w-4" /> Request Access
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Sign in to your <strong>{division.companyName}</strong> account.
                  </p>
                </div>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((v) => loginMutation.mutate(v))} className="space-y-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="you@company.com" data-testid="input-division-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} type={showPassword ? "text" : "password"} placeholder="Your password" className="pr-10" data-testid="input-division-password" />
                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {loginMutation.isError && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {(loginMutation.error as Error).message}
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-division-login-submit">
                      <LogIn className="mr-2 h-4 w-4" />
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="request">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    New to <strong>{division.companyName}</strong>? Request access and an administrator will approve your account.
                  </p>
                </div>
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit((v) => signupMutation.mutate(v))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={signupForm.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl><Input {...field} placeholder="John" data-testid="input-request-firstname" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={signupForm.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl><Input {...field} placeholder="Doe" data-testid="input-request-lastname" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={signupForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input {...field} type="email" placeholder="you@company.com" data-testid="input-request-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} type={showSignupPassword ? "text" : "password"} placeholder="Min. 8 characters" className="pr-10" data-testid="input-request-password" />
                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowSignupPassword(!showSignupPassword)}>
                              {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl><Input {...field} type="password" placeholder="Re-enter password" data-testid="input-request-confirm-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {signupMutation.isError && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {(signupMutation.error as Error).message}
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={signupMutation.isPending} data-testid="button-request-access-submit">
                      <UserPlus className="mr-2 h-4 w-4" />
                      {signupMutation.isPending ? "Submitting..." : "Request Access"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center">
          <button onClick={() => setLocation("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-home">
            <ArrowLeft className="inline h-3 w-3 mr-1" /> Back to Ready TMS
          </button>
        </div>
      </div>
    </div>
  );
}
