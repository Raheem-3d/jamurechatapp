import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST(req: Request) {
  try {
    const { folderPath } = await req.json();
    if (!folderPath || typeof folderPath !== "string") {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    let targetPath = folderPath.trim().replace(/^["'`]|["'`]$/g, "");
    if (targetPath.startsWith("file:///")) {
      targetPath = decodeURIComponent(targetPath.replace(/^file:\/\/\//i, ""));
    }

    const winPath = path.normalize(targetPath);

    return new Promise((resolve) => {
      // Windows command to open path in File Explorer
      exec(`explorer "${winPath}"`, (error) => {
        if (error) {
          console.error("Failed to open folder via explorer command:", error);
          return resolve(
            NextResponse.json(
              { success: false, error: error.message },
              { status: 500 }
            )
          );
        }
        return resolve(NextResponse.json({ success: true }));
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
