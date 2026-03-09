import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, CheckCircle, AlertCircle, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const signupSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function DivisionSignup() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [, setLocation] = useLocation();
  const [registered, setRegistered] = useState(false);

  const { data, isLoading, error } = useQuery<{ invitation: any; division: any }>({
    queryKey: ["/api/division-invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/division-invite/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invalid invitation");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: data?.invitation?.email || "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (values: SignupFormValues) => {
      const res = await fetch("/api/division-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setRegistered(true);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center text-muted-foreground">
            Validating invitation...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Invalid Invitation</h3>
            <p className="text-muted-foreground">
              {(error as Error)?.message || "This invitation link is invalid or has expired."}
            </p>
            <Button variant="outline" className="mt-6" onClick={() => setLocation("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const divisionName = data.division?.companyName || "Your Company";

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
            <p className="text-muted-foreground mb-2">
              Your account for <strong>{divisionName}</strong> has been submitted for approval.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              An administrator will review your request. You'll receive an email notification once your account is approved.
            </p>
            <Button onClick={() => setLocation("/login")}>
              <LogIn className="mr-2 h-4 w-4" />
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">

        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">{divisionName}</h1>
          <p className="text-muted-foreground text-sm">Powered by Ready TMS</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Request Access
            </CardTitle>
            <CardDescription>
              You've been invited to join <strong>{divisionName}</strong>. Fill out the form below — an administrator will approve your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => signupMutation.mutate(values))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John" data-testid="input-signup-firstname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Doe" data-testid="input-signup-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="you@company.com" data-testid="input-signup-email" />
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
                        <Input {...field} type="password" placeholder="Min. 8 characters" data-testid="input-signup-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Re-enter password" data-testid="input-signup-confirm-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {signupMutation.isError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {(signupMutation.error as Error).message}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signupMutation.isPending}
                  data-testid="button-signup-submit"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {signupMutation.isPending ? "Submitting Request..." : "Request Access"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex-col gap-2 pt-0">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/login")}
              data-testid="button-goto-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Already have an account? Sign In
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ready TMS &mdash; Transportation Management System
        </p>
      </div>
    </div>
  );
}
