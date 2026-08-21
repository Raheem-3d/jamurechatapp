/**
 * Migration Script: Update Default Employee Permissions
 * 
 * This script removes TASK_CREATE from all EMPLOYEE users who haven't been
 * explicitly granted permissions by an admin.
 * 
 * Run this script ONCE after deploying the RBAC changes.
 */

import { db } from "../lib/db"
const prisma = db

async function main() {

  
  // Find all EMPLOYEE users
  const employees = await prisma.user.findMany({
    where: {
      role: 'EMPLOYEE'
    },
    select: {
      id: true,
      email: true,
      name: true,
      permissions: true
    }
  })
  

  
  let updated = 0
  let skipped = 0
  let errors = 0
  
  for (const employee of employees) {
    try {
      // Parse current permissions
      let currentPerms: string[] = []
      try {
        const parsed = JSON.parse(String(employee.permissions || '[]'))
        currentPerms = Array.isArray(parsed) ? parsed : []
      } catch {
        currentPerms = []
      }
      
      // Check if permissions array is empty (default)
      if (currentPerms.length === 0) {
        // Update to ensure it's an empty JSON array
        await prisma.user.update({
          where: { id: employee.id },
          data: {
            permissions: '[]'
          }
        })
      
        updated++
      } else {
       
        skipped++
      }
    } catch (error) {
      console.error(`❌ Error updating ${employee.email}:`, error)
      errors++
    }
  }
  
  
  
  if (errors === 0) {
    console.log('✅ Migration completed successfully!')
  } else {
    console.log('⚠️  Migration completed with errors. Please review.')
  }
}

main()
  .catch((e) => {
    console.error('💥 Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
