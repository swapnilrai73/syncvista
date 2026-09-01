"use server";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";

import { auth, db } from "../firebase";
import { adminAuth } from "../firebase-admin";

const SESSION_COOKIE_NAME = "session";
const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

// Mints a signed, tamper-proof session cookie from a real Firebase ID token
// and sets it. Unlike the old raw-UID cookie, this cannot be forged: it's a
// signed JWT that Firebase itself verifies on every request.
async function createSessionCookieForUser(idToken: string) {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRES_IN_MS,
  });

  cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
  });
}

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const user = await getDoc(doc(db, "users", userId));
    return user.exists() ? parseStringify({ $id: user.id, ...user.data() }) : null;
  } catch (error) {
    console.log(error)
  }
}

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();

    await createSessionCookieForUser(idToken);

    const user = await getUserInfo({ userId: credential.user.uid });

    return parseStringify(user);
  } catch (error) {
    console.error("SignIn Server Error:", error);
    return {
      error: error instanceof Error
        ? error.message
        : "Unable to sign in.",
    };
  }
}

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, userData.email, password);
    const profile = {
      ...userData,
      userId: credential.user.uid,
      name: `${userData.firstName} ${userData.lastName}`,
    };

    await setDoc(doc(db, "users", credential.user.uid), profile);

    const idToken = await credential.user.getIdToken();
    await createSessionCookieForUser(idToken);

    return parseStringify({ $id: credential.user.uid, ...profile });
  } catch (error) {
    console.error('Error', error);
    throw error;
  }
}

export async function getLoggedInUser() {
  try {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return null;

    // This is the real fix: verifies the cookie's cryptographic signature,
    // expiry, and (with the `true` flag) revocation status against Firebase.
    // A forged, tampered, or expired cookie throws here and is treated as
    // logged out — unlike the old code, which trusted the cookie blindly.
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);

    const user = await getUserInfo({ userId: decodedClaims.uid });

    return parseStringify(user);
  } catch (error) {
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;

    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
        // Revoke refresh tokens so this session can't be replayed even if
        // the cookie value were somehow captured before deletion.
        await adminAuth.revokeRefreshTokens(decodedClaims.uid);
      } catch {
        // Cookie was already invalid/expired — nothing to revoke.
      }
    }

    await signOut(auth);
    cookies().delete(SESSION_COOKIE_NAME);
  } catch (error) {
    return null;
  }
}

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const banks = await getDocs(query(collection(db, "banks"), where("userId", "==", userId)));

    return parseStringify(banks.docs.map((bank) => ({ $id: bank.id, ...bank.data() })));
  } catch (error) {
    console.log(error)
  }
}

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const bank = await getDoc(doc(db, "banks", documentId));

    return bank.exists() ? parseStringify({ $id: bank.id, ...bank.data() }) : null;
  } catch (error) {
    console.log(error)
  }
}

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    const bank = await getDocs(query(collection(db, "banks"), where("accountId", "==", accountId)));

    if (bank.size !== 1) return null;

    const result = bank.docs[0];
    return parseStringify({ $id: result.id, ...result.data() });
  } catch (error) {
    console.log(error)
  }
}