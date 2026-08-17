import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { name, email } = await req.json()
    const sessionUser: any = (session as any).user || {}

    // Verify email uniqueness if changed
    if (email) {
      const currentUser = await db.user.findUnique({
        where: { id: sessionUser.id },
      })
      if (currentUser && email !== currentUser.email) {
        const existingUser = await db.user.findUnique({
          where: { email },
        })
        if (existingUser) {
          return NextResponse.json({ message: "Email is already in use" }, { status: 400 })
        }
      }
    }

    // Update user
    const updated = await db.user.update({
      where: {
        id: sessionUser.id,
      },
      data: {
        name,
        email,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
