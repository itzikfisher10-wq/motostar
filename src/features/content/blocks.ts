import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { araiHero } from "@/content/arai";
import { db } from "@/lib/db/client";
import { contentBlocks } from "@/lib/db/schema";

/**
 * Site texts the owner can edit in Admin → Site content. Each block has a schema and
 * a default (used until it is edited, or if the stored value is invalid).
 * To add a block: add it to BLOCKS, read it with getContent(), add a form in
 * src/app/(admin)/admin/(panel)/content/page.tsx.
 */
export const BLOCKS = {
  announcement: {
    schema: z.object({
      enabled: z.boolean(),
      text: z.string().trim().min(1).max(120),
      href: z.union([z.string().trim().regex(/^\/(?!\/)[\w\-/֐-׿?=&%.]*$/, "קישור פנימי בלבד, שמתחיל ב-/"), z.literal("")]),
    }),
    defaults: { enabled: true, text: "ייעוץ טלפוני ממוסכניקים", href: "" },
  },
  araiHero: {
    schema: z.object({
      title: z.string().trim().min(2).max(60),
      body: z.string().trim().max(300),
    }),
    defaults: { title: araiHero.title, body: araiHero.body },
  },
} as const;

export type BlockKey = keyof typeof BLOCKS;
export type BlockValue<K extends BlockKey> = z.infer<(typeof BLOCKS)[K]["schema"]>;

export const getContent = cache(async <K extends BlockKey>(key: K): Promise<BlockValue<K>> => {
  const row = await db.query.contentBlocks.findFirst({ where: eq(contentBlocks.key, key) });
  const parsed = BLOCKS[key].schema.safeParse(row?.value);
  return (parsed.success ? parsed.data : BLOCKS[key].defaults) as BlockValue<K>;
});
