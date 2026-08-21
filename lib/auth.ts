import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { isSuperAdmin } from "@/lib/org"
import { cacheGet, cacheSet } from "@/lib/redis"

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "jamurechat-secret-key-default-2026",
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { organization: { include: { subscription: true } } },
        })

        if (!user) {
          return null
        }

        if (!user.password) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.departmentId,
          organizationId: user.organizationId,
          isSuperAdmin: user.isSuperAdmin,
        }
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      const s: any = session as any
      if (token) {
        s.user = s.user || {}
        s.user.id = (token.id || token.sub) as string
        s.user.name = token.name
        s.user.email = token.email
        s.user.role = token.role as string
        s.user.permissions = (token as any).permissions || []
        s.user.departmentId = token.departmentId as string | null
        s.user.organizationId = (token as any).organizationId || null
        s.user.isSuperAdmin = (token as any).isSuperAdmin || false
        s.subscriptionStatus = (token as any).subscriptionStatus || "ACTIVE"
        s.subscriptionEnd = (token as any).subscriptionEnd || null
        s.organizationSuspended = (token as any).organizationSuspended || false
      }
      return s
    },
    async jwt({ token, user, trigger }: { token: any; user?: any; trigger?: string }) {
      if (!token.email) return token;

      // Fast path: if token is already fully populated and no update requested, return immediately
      if (token.id && token.role && trigger !== "update" && !user) {
        return token;
      }

      // 1. Try fetching cached user session from Redis
      try {
        const cacheKey = `user:${token.email}:jwt`;
        const cachedToken = await cacheGet(cacheKey);
        if (cachedToken && (cachedToken as any).id && trigger !== "update") {
          return { ...token, ...cachedToken };
        }
      } catch (e) {
        // non-fatal fallback
      }

      try {
        const dbUser = await db.user.findFirst({
          where: { email: token.email as string },
          include: { organization: { include: { subscription: true } } },
        })

        if (!dbUser) {
          if (user) {
            token.id = user.id
          }
          return token
        }

        // Check if user is super admin
        const userIsSuperAdmin = dbUser.isSuperAdmin || isSuperAdmin(dbUser.email)

        // Organization-level subscription snapshot
        const subscription = dbUser.organization?.subscription || null

        const tokenPayload = {
          ...token,
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          permissions: dbUser.permissions || [],
          departmentId: dbUser.departmentId,
          organizationId: dbUser.organizationId,
          isSuperAdmin: userIsSuperAdmin,
          subscriptionStatus: subscription?.status || "ACTIVE",
          subscriptionEnd: subscription?.status === "TRIAL" ? subscription.trialEnd : subscription?.currentPeriodEnd || null,
          organizationSuspended: (dbUser.organization as any)?.suspended === true,
        }

        // 2. Cache session token in Redis for 5 minutes (300 seconds)
        try {
          cacheSet(`user:${token.email}:jwt`, tokenPayload, 300).catch(() => { });
        } catch (e) {
          // non-fatal fallback
        }

        return tokenPayload;
      } catch (dbError) {
        console.error("NextAuth JWT DB lookup fallback:", dbError);
        return token;
      }
    },
  },
  debug: false,
}
