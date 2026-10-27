/**
 * Catalog import CLI.
 *
 *   npm run catalog:import -- --dry-run          # analyse only, write the report
 *   npm run catalog:import                       # import new products, skip existing
 *   npm run catalog:import -- --update-existing  # also refresh prices/text of existing products
 *
 * Options:
 *   --source <dir>   source data folder (default: data/source)
 *   --no-report      do not write the report / redirect files (used by the test suite)
 *
 * Outputs:
 *   reports/catalog-import.md            human-readable report
 *   reports/catalog-import.json          machine-readable plan summary
 *   src/content/generated/legacy-redirects.json   301 map used by src/proxy.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createDb } from "../../src/lib/db/create";
import { loadScriptEnv } from "../lib/env";
import { applyPlan } from "./lib/apply";
import { buildPlan } from "./lib/plan";
import { renderReport } from "./lib/report";
import { loadSource } from "./lib/source";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const updateExisting = args.includes("--update-existing");
const writeFiles = !args.includes("--no-report");
const sourceDir = args[args.indexOf("--source") + 1] && args.includes("--source") ? args[args.indexOf("--source") + 1]! : "data/source";

const source = loadSource(sourceDir);
if (source.errors.length) {
  console.error("✗ Source validation failed:\n" + source.errors.map((e) => "  • " + e).join("\n"));
  process.exit(1);
}

const plan = buildPlan(source);
let applied;
if (!dryRun) {
  const { DATABASE_URL } = loadScriptEnv();
  const { db, client } = createDb(DATABASE_URL, { max: 1 });
  try {
    applied = await applyPlan(db, plan, { updateExisting });
  } finally {
    await client.end();
  }
}

if (writeFiles) {
  mkdirSync("reports", { recursive: true });
  mkdirSync("src/content/generated", { recursive: true });
  writeFileSync("reports/catalog-import.md", renderReport(plan, { dryRun, applied, generatedAt: new Date() }));
  writeFileSync(
    "reports/catalog-import.json",
    JSON.stringify(
      {
        stats: plan.stats,
        applied,
        products: plan.products.map((p) => ({ slug: p.slug, title: p.title, sources: p.sources.map((s) => ({ id: s.sourceProductId, handle: s.handle, resolution: s.resolution })), needsReview: p.needsReview, reviewNotes: p.reviewNotes })),
        findings: plan.findings,
        quality: plan.quality,
      },
      null,
      2,
    ),
  );
  writeFileSync("src/content/generated/legacy-redirects.json", JSON.stringify(Object.fromEntries(plan.redirects.map((r) => [r.from, r.to])), null, 2) + "\n");
}

const s = plan.stats;
console.info(`${dryRun ? "Dry run" : "Import"} complete
  source records:   ${s.sourceRecords} (${s.sourceVariants} variants)
  unique products:  ${s.uniqueProducts} (${s.variants} variants)
  merged variants:  ${s.mergedAsVariants}   duplicates merged: ${s.duplicatesMerged}
  needs review:     ${s.needsReview}
  redirects:        ${plan.redirects.length}${applied ? `\n  written:          created ${applied.created}, updated ${applied.updated}, skipped ${applied.skipped}` : ""}
  report:           reports/catalog-import.md`);
