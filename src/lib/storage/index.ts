import "server-only";
import { env } from "@/config/env";
import { LocalStorage } from "./local";
import type { StorageAdapter } from "./types";
import { VercelBlobStorage } from "./vercel-blob";

/**
 * Where admin-uploaded files go (STORAGE_PROVIDER):
 *  - "local"       → files on disk in UPLOAD_DIR, served by src/app/uploads/[...path]/route.ts.
 *                    Use on a VPS / Docker with a persistent volume, and in development.
 *  - "vercel-blob" → Vercel Blob (required on Vercel: its file system is not persistent).
 * To add another (S3, R2…), implement StorageAdapter and register it here. See docs/deployment.md.
 */
let instance: StorageAdapter | undefined;

export function getStorage(): StorageAdapter {
  if (instance) return instance;
  const e = env();
  instance = e.STORAGE_PROVIDER === "vercel-blob" ? new VercelBlobStorage(e.BLOB_READ_WRITE_TOKEN!) : new LocalStorage(e.UPLOAD_DIR);
  return instance;
}

export type { StorageAdapter } from "./types";
