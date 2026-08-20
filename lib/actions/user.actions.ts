"use server";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";

import { auth, db } from "../firebase";

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

    cookies().set("firebase-session", credential.user.uid, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    const user = await getUserInfo({ userId: credential.user.uid });

    return parseStringify(user);
  } catch (error) {
    console.error('Error', error);
    throw error;
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

    cookies().set("firebase-session", credential.user.uid, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return parseStringify({ $id: credential.user.uid, ...profile });
  } catch (error) {
    console.error('Error', error);
    throw error;
  }
}

export async function getLoggedInUser() {
  try {
    const userId = cookies().get("firebase-session")?.value;
    if (!userId) return null;

    const user = await getUserInfo({ userId });

    return parseStringify(user);
  } catch (error) {
    console.log(error)
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    await signOut(auth);
    cookies().delete('firebase-session');
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