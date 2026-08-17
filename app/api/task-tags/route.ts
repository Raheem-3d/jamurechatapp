import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const tags = await db.tag.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tags, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    let tag = await db.tag.findFirst({
      where: { name: trimmedName },
    });

    if (!tag) {
      tag = await db.tag.create({
        data: {
          name: trimmedName,
        },
      });
    }

    return NextResponse.json(tag, { status: 201 });
  } catch (error: any) {
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: error.message || "Failed to create tag" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name } = await request.json();
    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: "Tag ID and new name are required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const tag = await db.tag.update({
      where: { id },
      data: { name: trimmedName },
    });

    return NextResponse.json(tag, { status: 200 });
  } catch (error: any) {
    console.error("Error updating tag:", error);
    return NextResponse.json({ error: error.message || "Failed to update tag" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    await db.tag.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Tag deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: error.message || "Failed to delete tag" }, { status: 500 });
  }
}
