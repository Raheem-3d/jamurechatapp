import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkOrgAdmin, requirePermission } from "@/lib/permissions"

// POST /api/org-admin/users/bulk - bulk create users from Excel
export async function POST(req: Request) {
  try {
    const user = await getSessionUserWithPermissions()
    checkOrgAdmin(user.role)
    requirePermission(user.role, 'ORG_USERS_MANAGE', user.isSuperAdmin)
    
    if (!user.organizationId) {
      const err: any = new Error('No organization bound to admin')
      err.status = 400
      throw err
    }

    const data = await req.json()
    const users = Array.isArray(data?.users) ? data.users : []

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ message: 'No users provided' }, { status: 400 })
    }

    if (users.length > 1000) {
      return NextResponse.json({ message: 'Maximum 1000 users per upload' }, { status: 400 })
    }

    const bcrypt = require('bcryptjs')
    const results = {
      created: 0,
      failed: 0,
      errors: [] as any[]
    }

    // Process each user
    for (let i = 0; i < users.length; i++) {
      try {
        const userData = users[i]
        
        // Extract and normalize fields
        const email = String(userData?.email || '').trim()
        const name = String(userData?.name || '').trim()
        const role = String(userData?.role || 'EMPLOYEE').trim().toUpperCase()
        const departmentId = userData?.departmentid || userData?.departmentId ? String(userData?.departmentid || userData?.departmentId).trim() : null
        const managerId = userData?.managerid || userData?.managerId ? String(userData?.managerid || userData?.managerId).trim() : null
        const password = userData?.password ? String(userData.password).trim() : null

        // Validate required fields
        if (!email) {
          results.failed++
          results.errors.push({
            row: i + 2,
            email: 'N/A',
            error: 'Email is required'
          })
          continue
        }

        if (!name) {
          results.failed++
          results.errors.push({
            row: i + 2,
            email,
            error: 'Name is required'
          })
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          results.failed++
          results.errors.push({
            row: i + 2,
            email,
            error: 'Invalid email format'
          })
          continue
        }

        // Validate role
        if (!['EMPLOYEE', 'MANAGER', 'ORG_ADMIN'].includes(role)) {
          results.failed++
          results.errors.push({
            row: i + 2,
            email,
            error: `Invalid role: ${role}. Must be EMPLOYEE, MANAGER, or ORG_ADMIN`
          })
          continue
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
          where: { email },
          select: { id: true, organizationId: true }
        })
        
        if (existingUser) {
          if (existingUser.organizationId === user.organizationId) {
            results.failed++
            results.errors.push({
              row: i + 2,
              email,
              error: 'Email already exists in your organization'
            })
          } else {
            results.failed++
            results.errors.push({
              row: i + 2,
              email,
              error: 'Email already exists in another organization'
            })
          }
          continue
        }

        // Validate and resolve department
        let validDeptId = null
        if (departmentId && departmentId !== '' && departmentId !== 'null') {
          try {
            const dept = await db.department.findUnique({
              where: { id: departmentId },
              select: { id: true }
            })
            if (dept) {
              validDeptId = dept.id
            }
          } catch (e) {
            // Department not found, continue without it
          }
        }

        // Validate and resolve manager
        let validMgrId = null
        if (managerId && managerId !== '' && managerId !== 'null') {
          try {
            const mgr = await db.user.findUnique({
              where: { id: managerId },
              select: { id: true, organizationId: true }
            })
            if (mgr && mgr.organizationId === user.organizationId) {
              validMgrId = mgr.id
            }
          } catch (e) {
            // Manager not found, continue without it
          }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password || 'ChangeMe123!', 10)

        // Create user
        const createdUser = await db.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role,
            organizationId: user.organizationId,
            permissions: null, // Default empty permissions
            ...(validDeptId && { departmentId: validDeptId }),
            ...(validMgrId && { managerId: validMgrId }),
          },
          select: { id: true, email: true, name: true }
        })

        results.created++
      } catch (error: any) {
        results.failed++
        const email = users[i]?.email || 'unknown'
        results.errors.push({
          row: i + 2,
          email,
          error: error.message || 'Unknown error during user creation'
        })
        console.error(`Error creating user at row ${i + 2}:`, error)
      }
    }

    console.log(`Bulk upload completed: ${results.created} created, ${results.failed} failed`)
    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    console.error('Bulk user creation error', error)
    return NextResponse.json({ message: error.message || 'Failed' }, { status: error.status || 500 })
  }
}
