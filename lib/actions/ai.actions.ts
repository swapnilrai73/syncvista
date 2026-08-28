"use server";

import { getLoggedInUser } from "@/lib/actions/user.actions";
import { syncUserDataToVectorStore } from "@/lib/ai/rag";

export async function triggerVectorSync() {
  try {
    const user = await getLoggedInUser();
    if (!user) throw new Error("Unauthorized");

    // Extract the exact ID used for indexing
    const targetUserId = user.$id;
    const result = await syncUserDataToVectorStore(targetUserId);

    return { 
      success: true, 
      count: result.count,
      userId: targetUserId // Return the exact namespace ID back to the client
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}