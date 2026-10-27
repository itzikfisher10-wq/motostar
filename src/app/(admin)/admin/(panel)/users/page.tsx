import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { ActionForm } from "@/components/admin/ActionForm";
import { CheckboxField, Panel, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/admin/StatusBadge";
import { createUserAction, updateUserAction } from "@/features/admin/users/actions";
import { requireUser } from "@/features/auth/guard";
import { ROLE_LABEL, type Role } from "@/features/auth/permissions";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const metadata: Metadata = { title: "משתמשי ניהול" };

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });
const ROLES = Object.keys(ROLE_LABEL) as Role[];

function RoleOptions() {
  return (
    <>
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </>
  );
}

export default async function AdminUsersPage() {
  const me = await requireUser("users:manage");
  const list = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt }).from(users).orderBy(asc(users.createdAt));

  return (
    <>
      <PageHeader title="משתמשי ניהול">
        <p className="mt-2 max-w-2xl text-sm text-steel">בעלים: הכול כולל ניהול משתמשים. מנהל: קטלוג, הזמנות, תוכן והגדרות. צוות: צפייה ועדכון סטטוס הזמנות.</p>
      </PageHeader>
      <div className="grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {list.map((u) => (
            <Panel
              key={u.id}
              title={`${u.name}${u.id === me.id ? " (את/ה)" : ""}`}
              description={u.email}
              actions={
                <span className="flex gap-1.5">
                  <Badge tone="info">{ROLE_LABEL[u.role]}</Badge>
                  {!u.isActive && <Badge tone="muted">מושבת</Badge>}
                </span>
              }
            >
              <ActionForm action={updateUserAction.bind(null, u.id)} className="grid items-end gap-3 sm:grid-cols-3">
                <SelectField label="תפקיד" name="role" defaultValue={u.role}>
                  <RoleOptions />
                </SelectField>
                <TextField label="סיסמה חדשה (לא חובה)" name="password" type="password" autoComplete="new-password" dir="ltr" />
                <div className="space-y-2 pb-1">
                  <CheckboxField label="פעיל" name="isActive" defaultChecked={u.isActive} />
                </div>
                <div className="flex items-center gap-4 sm:col-span-3">
                  <SubmitButton variant="outline">שמירה</SubmitButton>
                  <span className="text-xs text-steel">כניסה אחרונה: {u.lastLoginAt ? dateFmt.format(u.lastLoginAt) : "אף פעם"}</span>
                </div>
              </ActionForm>
            </Panel>
          ))}
        </div>
        <Panel title="משתמש חדש">
          <ActionForm action={createUserAction} className="space-y-3">
            <TextField label="שם" name="name" required />
            <TextField label="אימייל" name="email" type="email" dir="ltr" required />
            <SelectField label="תפקיד" name="role" defaultValue="STAFF">
              <RoleOptions />
            </SelectField>
            <TextField label="סיסמה ראשונית" name="password" type="password" autoComplete="new-password" dir="ltr" required hint="12 תווים לפחות." />
            <SubmitButton>יצירת משתמש</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
