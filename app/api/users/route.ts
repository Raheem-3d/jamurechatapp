import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTenantWhereClause } from "@/lib/org"
import { getSessionOrMobileUser } from "@/lib/mobile-auth"
import { cacheGet, cacheSet } from "@/lib/redis"

export async function GET(req: Request) {
  try {
    const user = await getSessionOrMobileUser(req as any)

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const orgKey = user.organizationId || "all";
    const cacheKey = `org:${orgKey}:user:${user.id}:users_list`;

    // 🚀 Check Redis Cache
    const cachedUsers = await cacheGet(cacheKey);
    if (cachedUsers) {
      return NextResponse.json(cachedUsers);
    }
    
    // Apply tenant isolation - super admins can see all users
    // Regular users only see users from their organization
    const whereClause = await getTenantWhereClause({
      id: { not: user.id }, // Exclude current user
    }, req as any)

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        organizationId: true,
        department: {
          select: {
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    // Cache user list for 60 seconds
    await cacheSet(cacheKey, users, 60);

    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
