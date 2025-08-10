import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "test", password: "test" },
  });

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE ?? ""}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("token", data.token);
      window.location.href = "/";
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
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
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}
