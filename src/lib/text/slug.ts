/**
 * URL slugs. Hebrew letters are kept (Google indexes Hebrew URLs well and the
 * original store used Hebrew handles); everything else is lower-cased ASCII.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[֑-ׇ]/g, "") // Hebrew niqqud / cantillation
    .replace(/[׳'"״`]/g, "")
    .toLowerCase()
    .replace(/[\/\\|+&,.:;()[\]{}!?#%*=<>~^@$]+/g, " ")
    .replace(/[^\p{Script=Hebrew}a-z0-9\s-]/gu, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base || "item";
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  taken.add(slug);
  return slug;
}
