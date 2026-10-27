"use client";

import { startTransition, useActionState, type ReactNode } from "react";
import { IDLE, type ActionState } from "@/features/admin/forms";
import { FieldErrorsContext, FormMessage, FormPendingContext } from "./form";

/**
 * Form bound to an admin server action returning ActionState.
 * Submits through a transition instead of a native form action, so React does not
 * reset the inputs — a failed validation keeps everything the admin typed.
 */
export function ActionForm({
  action,
  children,
  className,
  messagePlacement = "end",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  messagePlacement?: "start" | "end";
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <FormPendingContext.Provider value={pending}>
        <FieldErrorsContext.Provider value={state.fieldErrors ?? {}}>
          {messagePlacement === "start" && <FormMessage state={state} />}
          {children}
          {messagePlacement === "end" && <FormMessage state={state} />}
        </FieldErrorsContext.Provider>
      </FormPendingContext.Provider>
    </form>
  );
}
