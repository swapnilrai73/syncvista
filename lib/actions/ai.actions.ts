"use server";

import { getLoggedInUser } from "@/lib/actions/user.actions";
import { syncUserDataToVectorStore } from "@/lib/ai/rag";

export async function triggerVectorSync() {
  try {
    const user = await getLoggedInUser();
    if (!user) throw new Error("Unauthorized");

    const result = await syncUserDataToVectorStore(user.$id);
    return { success: true, count: result.count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}