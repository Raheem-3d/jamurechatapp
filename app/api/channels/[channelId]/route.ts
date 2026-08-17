import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";



import { ensureDbSchema } from "@/lib/db-init"

export async function GET( request: NextRequest,  { params }: { params: { channelId: string } } ) {
  try {
    await ensureDbSchema().catch(() => {})
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId } = await params;

    const user: any = (session as any).user
    const channelData = await db.channel.findFirst({
      where: {
        id: channelId,
      },
      include: {
        members: {
        include: {
          user: true,
        },
      },
        department: true,
      },
    });

    if (channelData) {
      try {
        const rows: any[] = await db.$queryRawUnsafe(`SELECT image FROM \`Channel\` WHERE id = ?`, channelId);
        if (rows && rows[0]) {
          (channelData as any).image = rows[0].image || null;
        }
      } catch (e) {
        console.error("Error fetching single channel image:", e);
      }
    }

    return NextResponse.json({ channel: channelData });
  } catch (error) {
    console.error("Error fetching channel:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { channelId } = await params;
    const user: any = (session as any).user

    if (!channelId) {
      return NextResponse.json(
        { message: "Channel ID not provided" },
        { status: 400 }
      );
    }

    // Ensure the channel belongs to the organization
    const existing = await db.channel.findFirst({ where: { id: channelId, organizationId: user?.organizationId || undefined } })
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    const deleteChannel = await db.channel.delete({ where: { id: channelId } });

    return NextResponse.json(
      { message: "Channel deleted", data: deleteChannel },
      { status: 200 }
    );
  } catch (error) {
    console.error("Channel Delete Error:", error);
    return NextResponse.json(
      { message: "Server error deleting channel", error: String(error) },
      { status: 500 }
    );
  }
}




export async function PUT(req: Request, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  const body = await req.json();
  const session = await getServerSession(authOptions as any)
  const user: any = (session as any)?.user

  const {
    name,
    description,
    departmentId,
    isPublic,
    image,
    members, // userIds
  } = body;

  try {
    await ensureDbSchema().catch(() => {});
    // Ensure the channel belongs to the org
    const existing = await db.channel.findFirst({ where: { id: channelId } })
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    // Normalize and validate department id
    let depId: string | null = null
    if (departmentId && typeof departmentId === 'string' && departmentId !== 'none') {
      const dept = await db.department.findUnique({ where: { id: departmentId }, select: { id: true } })
      depId = dept ? departmentId : null
    }

    const updatedChannel = await db.channel.update({
      where: { id: channelId },
      data: {
        name,
        description,
        departmentId: depId,
        isPublic,
        updatedAt: new Date(),
        members: {
          deleteMany: {}, // remove existing
        },
      },
    });

    if (image !== undefined) {
      await db.$executeRawUnsafe(
        "UPDATE `Channel` SET `image` = ? WHERE `id` = ?",
        image,
        channelId
      ).catch((e) => console.error("Error updating channel image via raw SQL:", e));
      (updatedChannel as any).image = image;
    }

    // Re-add members with admin status for creator and current user
    const newMembers = (members || []).map((userId: string) => ({
      userId,
      channelId: updatedChannel.id,
      isAdmin: userId === existing.creatorId || userId === user.id,
    }));

    await db.channelMember.createMany({
      data: newMembers,
      skipDuplicates: true,
    });

    return NextResponse.json({ channel: updatedChannel }, { status: 200 });
  } catch (error) {
    console.error("[CHANNEL_UPDATE_ERROR]", error);
    return NextResponse.json(
      { message: "Failed to update channel" },
      { status: 500 }
    );
  }
}