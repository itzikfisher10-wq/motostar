"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/Button";
import type { ActionState } from "@/features/admin/forms";

/**
 * Admin form building blocks. Every input has a visible label, an error slot
 * wired with aria-describedby, and the same height/border as the storefront.
 */
export const inputCls =
  "mt-1 h-10 w-full rounded-[var(--radius-control)] border border-line bg-paper px-3 text-[0.95rem] outline-none transition-colors focus:border-ink aria-[invalid=true]:border-signal disabled:bg-mist";

type FieldProps = { label: string; name: string; error?: string; hint?: string; className?: string };

export function TextField({ label, name, error, hint, className = "", ...input }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const contextError = useContext(FieldErrorsContext)[name];
  error ??= contextError;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} name={name} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-d` : undefined} className={inputCls} {...input} />
      <Help id={`${id}-d`} error={error} hint={hint} />
    </div>
  );
}

export function TextArea({ label, name, error, hint, className = "", ...input }: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const contextError = useContext(FieldErrorsContext)[name];
  error ??= contextError;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea id={id} name={name} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-d` : undefined} className={`${inputCls} h-auto py-2 leading-relaxed`} {...input} />
      <Help id={`${id}-d`} error={error} hint={hint} />
    </div>
  );
}

export function SelectField({ label, name, error, hint, className = "", children, ...input }: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const id = useId();
  const contextError = useContext(FieldErrorsContext)[name];
  error ??= contextError;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select id={id} name={name} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-d` : undefined} className={inputCls} {...input}>
        {children}
      </select>
      <Help id={`${id}-d`} error={error} hint={hint} />
    </div>
  );
}

export function CheckboxField({ label, name, hint, ...input }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" name={name} className="mt-0.5 h-4 w-4 accent-ink" {...input} />
      <span>
        {label}
        {hint && <span className="block text-xs text-steel">{hint}</span>}
      </span>
    </label>
  );
}

function Help({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error)
    return (
      <p id={id} className="mt-1 text-xs text-signal">
        {error}
      </p>
    );
  if (hint)
    return (
      <p id={id} className="mt-1 text-xs text-steel">
        {hint}
      </p>
    );
  return null;
}

/** Field errors from the last submit of the surrounding <ActionForm>. Fields read their own entry by name. */
export const FieldErrorsContext = createContext<Record<string, string>>({});

/** Set by <ActionForm> (which submits through a transition, so useFormStatus does not see it). */
export const FormPendingContext = createContext(false);

/** Submit button that disables itself while its form is pending. */
export function SubmitButton({ children, pendingLabel = "שומר…", variant = "dark", className = "" }: { children: ReactNode; pendingLabel?: string; variant?: "dark" | "primary" | "outline"; className?: string }) {
  const status = useFormStatus();
  const pending = useContext(FormPendingContext) || status.pending;
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, "md", className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Success / error line for an ActionState. */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-ok" : "text-signal"}`}>
      {state.message}
    </p>
  );
}

/** A titled block inside an edit page. */
export function Panel({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-[var(--radius-panel)] border border-line bg-paper">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id={id} className="font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-steel">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
