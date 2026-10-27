"use server";

import { logAudit } from "@/features/admin/audit";
import { fail, fieldErrorsOf, success, type ActionState } from "@/features/admin/forms";
import { revalidateStorefront } from "@/lib/cache/revalidate";
import { requireUser } from "@/features/auth/guard";
import { BLOCKS, type BlockKey } from "@/features/content/blocks";
import { db } from "@/lib/db/client";
import { contentBlocks } from "@/lib/db/schema";

const readers: { [K in BlockKey]: (fd: FormData) => unknown } = {
  announcement: (fd) => ({ enabled: fd.get("enabled") === "on", text: fd.get("text"), href: fd.get("href") ?? "" }),
  araiHero: (fd) => ({ title: fd.get("title"), body: fd.get("body") ?? "" }),
};

export async function saveContentAction(key: BlockKey, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("content:write");
  if (!(key in BLOCKS)) return fail("בלוק תוכן לא מוכר.");
  const parsed = BLOCKS[key].schema.safeParse(readers[key](fd));
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים.", fieldErrorsOf(parsed.error));
  await db.insert(contentBlocks).values({ key, value: parsed.data }).onConflictDoUpdate({ target: contentBlocks.key, set: { value: parsed.data } });
  await logAudit(user.id, "update", "content", key);
  revalidateStorefront();
  return success("נשמר ופורסם באתר.");
}
