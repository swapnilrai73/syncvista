import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getPrivateKey(): string {
  const raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!raw) {
    throw new Error("Missing FIREBASE_ADMIN_PRIVATE_KEY environment variable");
  }

  // Defensive cleanup:
  // 1. Strip a stray pair of surrounding double quotes — Vercel's env var
  //    UI stores the value literally and does NOT strip quotes the way
  //    .env files do, so a value pasted as "-----BEGIN...-----" would
  //    otherwise keep the quote characters as part of the key.
  // 2. Convert literal backslash-n sequences (how the key is escaped
  //    inside the downloaded JSON / env var text) into real newlines,
  //    which the PEM parser requires.
  return raw
    .replace(/^"(.*)"$/s, "$1")
    .replace(/\\n/g, "\n");
}

function getAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length) return existingApps[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail) {
    throw new Error(
      "Missing Firebase Admin credentials: check FIREBASE_ADMIN_PROJECT_ID and FIREBASE_ADMIN_CLIENT_EMAIL"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export const adminAuth = getAuth(getAdminApp());