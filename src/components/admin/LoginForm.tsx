"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/features/auth/actions";
import { SubmitButton, TextField } from "./form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, { error: null });
  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField label="אימייל" name="email" type="email" autoComplete="username" dir="ltr" required />
      <TextField label="סיסמה" name="password" type="password" autoComplete="current-password" dir="ltr" required />
      {state.error && (
        <p role="alert" className="text-sm text-signal">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-full" pendingLabel="מתחבר…">
        כניסה
      </SubmitButton>
    </form>
  );
}
