import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authApi } from "../../api/auth";
import { keys } from "../../api/queries";
import type { Me } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { applyServerErrors } from "../../lib/forms";
import { toast } from "../../lib/toast";

const email = z.string().trim().min(1, "Enter your email").email("That email doesn't look right").max(160);

const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password") });
const registerSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(80, "Keep it under 80 characters"),
  email,
  password: z.string().min(8, "Use 8 to 72 characters").max(72, "Use 8 to 72 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function useSignedIn() {
  const qc = useQueryClient();
  return (me: Me) => {
    qc.setQueryData(keys.me, me);
    toast(`Signed in as ${me.name}.`);
  };
}

export function SignInForm() {
  const signedIn = useSignedIn();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;
  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: signedIn,
    onError: (e) => applyServerErrors(e, form.setError, ["email", "password"]),
  });
  return (
    <form className="auth-form" noValidate onSubmit={form.handleSubmit((v) => login.mutate(v))} aria-label="Sign in">
      <Field label="Email" error={errors.email?.message}>
        {(p) => <input {...p} className="input" type="email" autoComplete="email" inputMode="email" {...form.register("email")} />}
      </Field>
      <Field label="Password" error={errors.password?.message}>
        {(p) => <input {...p} className="input" type="password" autoComplete="current-password" {...form.register("password")} />}
      </Field>
      <Button type="submit" wide pending={login.isPending} pendingLabel="Signing in">
        Sign in
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const signedIn = useSignedIn();
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "" } });
  const { errors } = form.formState;
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: signedIn,
    onError: (e) => applyServerErrors(e, form.setError, ["name", "email", "password"]),
  });
  return (
    <form className="auth-form" noValidate onSubmit={form.handleSubmit((v) => register.mutate(v))} aria-label="Create account">
      <Field label="Your name" error={errors.name?.message}>
        {(p) => <input {...p} className="input" autoComplete="name" {...form.register("name")} />}
      </Field>
      <Field label="Email" error={errors.email?.message}>
        {(p) => <input {...p} className="input" type="email" autoComplete="email" inputMode="email" {...form.register("email")} />}
      </Field>
      <Field label="Password" hint="8 characters or more" error={errors.password?.message}>
        {(p) => <input {...p} className="input" type="password" autoComplete="new-password" {...form.register("password")} />}
      </Field>
      <Button type="submit" wide pending={register.isPending} pendingLabel="Creating account">
        Create account
      </Button>
      <p className="auth-form__fine">Next you join your hostel with the code from your warden, or set up a new one.</p>
    </form>
  );
}
