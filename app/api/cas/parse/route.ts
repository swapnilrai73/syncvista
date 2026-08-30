import { NextRequest, NextResponse } from "next/server";
import { saveInvestmentData } from "@/lib/actions/investment.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    // AUTH CHECK: derive the user from the session, never from the form
    // field — otherwise any caller can overwrite another user's portfolio.
    const loggedIn = await getLoggedInUser();
    if (!loggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = loggedIn.$id;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const password = formData.get("password") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "No password provided" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No userId provided" },
        { status: 400 }
      );
    }

    // Save the uploaded file to a temporary location
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    const tempFilePath = join(tmpdir(), `cas-${Date.now()}.pdf`);
    await writeFile(tempFilePath, buffer);

    try {
      // Import casparser dynamically (it's a Node.js package)
      const casparser = require("casparser");

      // Parse the CAS PDF file
      const portfolioData = await new Promise((resolve, reject) => {
        casparser.parse(
          tempFilePath,
          password,
          (err: any, data: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          }
        );
      });

      // Save the parsed data to Firestore
      const summary = await saveInvestmentData({
        userId,
        portfolioData,
      });

      return NextResponse.json({
        success: true,
        summary,
      });

    } catch (parseError) {
      console.error("CAS parsing error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse CAS file. Please check your password and try again." },
        { status: 400 }
      );
    } finally {
      // Clean up the temporary file
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        console.error("Error deleting temp file:", unlinkError);
      }
    }

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}