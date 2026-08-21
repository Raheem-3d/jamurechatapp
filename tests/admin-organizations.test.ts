import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    organization: {
      update: vi.fn(async (args) => ({ id: args.where.id, suspended: args.data.suspended })),
      findMany: vi.fn(async () => []),
    },
  },
}))

vi.mock("@/lib/org", () => ({
  getSessionUserWithPermissions: vi.fn(async () => ({
    isSuperAdmin: process.env.SUPERADMINS === "owner@example.com",
    role: process.env.SUPERADMINS === "owner@example.com" ? "SUPER_ADMIN" : "EMPLOYEE",
  })),
}))

import { PATCH } from "@/app/api/superadmin/organizations/[orgId]/route"

beforeEach(() => {
  process.env.SUPERADMINS = "owner@example.com"
})

describe("admin organizations", () => {
  it("suspends organization when superadmin", async () => {
    const req = new Request("http://localhost/api/superadmin/organizations/org_1", {
      method: "PATCH",
      body: JSON.stringify({ suspended: true }),
    })
    const res = await PATCH(req, { params: { orgId: "org_1" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.suspended).toBe(true)
  })

  it("forbids non superadmin", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    process.env.SUPERADMINS = "someoneelse@example.com"
    const req = new Request("http://localhost/api/superadmin/organizations/org_1", {
      method: "PATCH",
      body: JSON.stringify({ suspended: true }),
    })
    const res = await PATCH(req, { params: { orgId: "org_1" } })
    expect(res.status).toBe(403)
    consoleSpy.mockRestore()
  })
})
