import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db"; // Make sure you import your db client properly

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid tag name." }, { status: 400 });
    }

    // Check if tag already exists
    const existingTag = await db.tag.findFirst({
      where: { name },
    });

    if (existingTag) {
      return NextResponse.json(
        { tag: existingTag, message: "Tag already exists." },
        { status: 200 },
      );
    }

    // Create new tag
    const newTag = await db.tag.create({
      data: { name },
    });

    return NextResponse.json({ tag: newTag }, { status: 201 });
  } catch (error) {
    console.error("Tag creation error:", error);
    return NextResponse.json(
      { error: "Failed to create tag." },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { taskId } = params;
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required." }, { status: 400 });
    }

    const tags = await db.tag.find({
      where: { taskId },
    });

    if (!tags || tags.length === 0) {
      return NextResponse.json({ message: "No Tags Available" }, { status: 404 });
    }

    return NextResponse.json({ tags }, { status: 200 });

  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
