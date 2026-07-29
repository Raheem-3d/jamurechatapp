"use client"
import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Permission } from "@/lib/permissions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import * as XLSX from "xlsx";

type Props = {
  title?: string
  description?: string
}

export default function OrgAddUserForm({ title = "Add Person", description = "Create a user in your organization" }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [deptLoading, setDeptLoading] = useState<boolean>(false)
  const [deptError, setDeptError] = useState<string | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])
  const [managers, setManagers] = useState<{ id: string; name: string; email: string }[]>([])
  const [managersLoading, setManagersLoading] = useState<boolean>(false)
  const [managersError, setManagersError] = useState<string | null>(null)
  const [selectedManager, setSelectedManager] = useState<string>("")

  // Excel upload state
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single")
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelData, setExcelData] = useState<any[]>([])
  const [excelError, setExcelError] = useState<string | null>(null)
  const [excelSuccess, setExcelSuccess] = useState<string | null>(null)
  const [isExcelUploading, setIsExcelUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ total: number; completed: number } | null>(null)

  // Use existing app permission definitions
  // Organization-scoped permissions only (exclude super-admin and cross-org)
  const PERMISSIONS: { key: Permission; label: string }[] = [
    { key: "TASK_CREATE", label: "Tasks: Create" },
    { key: "TASK_EDIT", label: "Tasks: Edit" },
    { key: "TASK_VIEW", label: "Tasks: View" },
    { key: "TASK_DELETE", label: "Tasks: Delete" },
    { key: "TASK_VIEW_ALL", label: "Tasks: View All" },
    { key: "CHANNEL_CREATE", label: "Channels: Create" },
    { key: "CHANNEL_VIEW_ALL", label: "Channels: View All" },
    { key: "CHANNEL_MANAGE", label: "Channels: Manage" },
    { key: "CHANNEL_DELETE", label: "Channels: Delete" },
  ]



  useEffect(() => {
    let abort = false
    async function loadDeps() {
      setDeptLoading(true)
      setDeptError(null)
      try {
        // Try a common endpoint; adjust if your API differs.
        const res = await fetch("/api/departments", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load departments")
        const data = await res.json()
        const list: any[] = Array.isArray(data?.departments) ? data.departments : Array.isArray(data) ? data : []
        if (!abort) {
          setDepartments(list.map(d => ({ id: d.id, name: d.name || "Unnamed" })))
        }
      } catch (e: any) {
        if (!abort) setDeptError(e.message || "Couldn't load departments")
      } finally {
        if (!abort) setDeptLoading(false)
      }
    }
    loadDeps()
    return () => { abort = true }
  }, [])

  // fetch managers list
  useEffect(() => {
    let abort = false
    async function loadManagers() {
      setManagersLoading(true)
      setManagersError(null)
      try {
        const res = await fetch("/api/org-admin/managers", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load managers")
        const data = await res.json()
        const list: any[] = Array.isArray(data?.managers) ? data.managers : Array.isArray(data) ? data : []
        if (!abort) {
          setManagers(list.map(m => ({ id: m.id, name: m.name || "Unnamed", email: m.email || "" })))
        }
      } catch (e: any) {
        if (!abort) setManagersError(e.message || "Couldn't load managers")
      } finally {
        if (!abort) setManagersLoading(false)
      }
    }
    loadManagers()
    return () => { abort = true }
  }, [])

  // Handle Excel file upload
  async function handleExcelFile(file: File) {
    setExcelError(null)
    setExcelSuccess(null)
    setExcelData([])

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]

      if (!worksheet) {
        throw new Error("No data found in Excel file")
      }

      // Convert to JSON with header
      const data = XLSX.utils.sheet_to_json(worksheet)

      if (data.length === 0) {
        throw new Error("Excel file is empty")
      }

      // Normalize data: trim and lowercase keys
      const normalizedData = data.map(row => {
        const normalized: any = {}
        Object.keys(row).forEach(key => {
          const lowerKey = key.trim().toLowerCase()
          normalized[lowerKey] = (row as any)[key]
        })
        return normalized
      })

      // Validate required columns
      const requiredColumns = ["name", "email", "role"]
      const firstRow = normalizedData[0]
      const availableColumns = Object.keys(firstRow)
      const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col))

      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(", ")}. Available columns: ${availableColumns.join(", ")}`)
      }

      setExcelData(normalizedData)
      setExcelFile(file)
      setExcelSuccess(`✓ ${normalizedData.length} users loaded successfully`)
    } catch (err: any) {
      setExcelError(err.message || "Failed to parse Excel file")
    }
  }

  // Upload Excel data to backend
  async function uploadExcelData() {
    if (excelData.length === 0) {
      setExcelError("No data to upload")
      return
    }

    setIsExcelUploading(true)
    setExcelError(null)
    setUploadProgress({ total: excelData.length, completed: 0 })

    console.log("Uploading data:", excelData)

    try {
      const res = await fetch("/api/org-admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: excelData })
      })

      const result = await res.json()
      console.log("API Response:", result)

      if (!res.ok) {
        throw new Error(result?.message || `Failed with ${res.status}`)
      }

      // Show results with error details if any
      let message = `✓ Successfully added ${result.created} users`
      if (result.failed > 0) {
        message += ` (${result.failed} failed)`
      }

      setExcelSuccess(message)

      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors.slice(0, 100).map((e: any) => `Row ${e.row}: ${e.email || '?'} - ${e.error}`).join('\n')
        setExcelError(`Some rows had issues:\n${errorMsg}${result.errors.length}`)
      }

      if (result.created > 0) {
        setExcelData([])
        setExcelFile(null)
        startTransition(() => router.refresh())
      }
    } catch (err: any) {
      console.error("Upload error:", err)
      setExcelError(err.message || "Failed to upload users")
    } finally {
      setIsExcelUploading(false)
      setUploadProgress(null)
    }
  }

  // Download template Excel file
  function downloadTemplate() {
    const templateData = [
      {
        name: "John Doe",
        email: "john@example.com",
        role: "EMPLOYEE",
        // departmentId: "(optional)",
        // managerId: "(optional)"
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        role: "MANAGER",
        // departmentId: "(optional)",
        // managerId: "(optional)"
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 }
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users")
    XLSX.writeFile(workbook, "users_template.xlsx")
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const form = e.currentTarget
    const fd = new FormData(form)

    // Attach selected manager if any
    if (selectedManager && selectedManager.trim() !== "") {
      fd.set("managerId", selectedManager)
    }

    // Attach selected permissions as repeated field permissions[]
    // Ensure we only send org-scoped permissions (defensive)
    selectedPermissions
      .filter(p => p !== "SUPER_ADMIN_ACCESS" && p !== "CROSS_ORG_ACCESS")
      .forEach(p => fd.append("permissions[]", p))

    // If departmentId is blank remove it so backend treats as unset
    const dept = fd.get("departmentId")
    if (!dept || String(dept).trim() === "") fd.delete("departmentId")

    try {
      const res = await fetch("/api/org-admin/users", {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || `Failed with ${res.status}`)
      }
      form.reset()
      setSelectedManager("")
      setSuccess("Person added successfully")
      startTransition(() => router.refresh())
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tabs for Single vs Bulk Upload */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === "single"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Add Single User
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === "bulk"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Bulk Upload (Excel)
          </button>
        </div>

        {/* Single User Form */}
        {activeTab === "single" && (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <Input name="name" placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <Input type="email" name="email" placeholder="user@example.com" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Password</label>
                <Input type="password" name="password" placeholder="Optional (auto if empty)" />
              </div>
              <div>
                <label className="block text-sm mb-1 ">Role</label>
                <select name="role" className="w-full h-10 rounded-md border border-input bg-background dark:bg-gray-900 dark:text-white px-3 text-sm">
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ORG_ADMIN">ORG_ADMIN</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Department (optional)</label>
              <select
                name="departmentId"
                disabled={deptLoading}
                className="w-full h-10 rounded-md border border-input bg-background dark:bg-gray-900 dark:text-white px-3 text-sm"
                defaultValue=""
              >
                <option value="">-- Select Department --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {deptLoading && <p className="text-xs text-gray-500 mt-1">Loading departments...</p>}
              {deptError && <p className="text-xs text-red-600 mt-1">{deptError}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Manager (optional)</label>
              <select
                disabled={managersLoading}
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background dark:bg-gray-900 dark:text-white px-3 text-sm"
              >
                <option value="">-- No Manager --</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
              {managersLoading && <p className="text-xs text-gray-500 mt-1">Loading managers...</p>}
              {managersError && <p className="text-xs text-red-600 mt-1">{managersError}</p>}
              <p className="text-xs text-gray-500 mt-1">Assign this user to a manager. Manager will only see users under them.</p>
            </div>
            {/* Permissions selector */}
            <div>
              <label className="block text-sm mb-1">Permissions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-3 dark:border-gray-700">
                {PERMISSIONS.map((perm) => {
                  const checked = selectedPermissions.includes(perm.key)
                  return (
                    <label key={perm.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={(e) => {
                          const isOn = e.target.checked
                          setSelectedPermissions((prev) => {
                            if (isOn) return [...prev, perm.key]
                            return prev.filter((p) => p !== perm.key)
                          })
                        }}
                      />
                      <span>{perm.label}</span>
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Grant only what this user needs. You can update permissions later.</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Person"}
            </Button>
          </form>
        )}

        {/* Excel Bulk Upload */}
        {activeTab === "bulk" && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-sm mb-2">Excel Format Guide</h3>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mb-3">
                    Your Excel file must have these columns:
                  </p>
                  <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 ml-4">
                    <li><strong>name</strong> - User's full name (required)</li>
                    <li><strong>email</strong> - User's email address (required)</li>
                    <li><strong>role</strong> - EMPLOYEE, MANAGER, or ORG_ADMIN (required)</li>
                    {/* <li><strong>departmentId</strong> (optional) - Department ID</li>
                    <li><strong>managerId</strong> (optional) - Manager's ID</li> */}
                  </ul>
                </div>
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="ml-2"
                  size="sm"
                >
                  📥 Template
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => document.getElementById("excel-file-input")?.click()}
            >
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0]
                  if (file) handleExcelFile(file)
                }}
                className="hidden"
              />
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload Excel file</p>
              <p className="text-xs text-gray-500 mt-1">Supports .xlsx, .xls, .csv</p>
              {excelFile && <p className="text-xs text-green-600 mt-2">✓ {excelFile.name}</p>}
            </div>

            {/* Preview Table */}
            {excelData.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-left font-medium">Email</th>
                      <th className="px-4 py-2 text-left font-medium">Role</th>
                      {/* <th className="px-4 py-2 text-left font-medium">Department</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-t dark:border-gray-700">
                        <td className="px-4 py-2">{row.name || "-"}</td>
                        <td className="px-4 py-2">{row.email || "-"}</td>
                        <td className="px-4 py-2">{row.role || "-"}</td>
                        {/* <td className="px-4 py-2">{row.departmentid || row.departmentId || "-"}</td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {excelData.length > 5 && (
                  <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
                    ... and {excelData.length - 10} more users
                  </div>
                )}
              </div>
            )}

            {/* Status Messages */}
            {excelError && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono text-xs">{excelError}</p>
              </div>
            )}
            {excelSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300">{excelSuccess}</p>
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Uploading...</span>
                  <span>{uploadProgress.completed}/{uploadProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={uploadExcelData}
                disabled={excelData.length === 0 || isExcelUploading}
                className="flex-1"
              >
                {isExcelUploading ? "Uploading..." : `Upload ${excelData.length} Users`}
              </Button>
              {excelData.length > 0 && (
                <Button
                  onClick={() => {
                    setExcelData([])
                    setExcelFile(null)
                    setExcelError(null)
                    setExcelSuccess(null)
                  }}
                  variant="outline"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
