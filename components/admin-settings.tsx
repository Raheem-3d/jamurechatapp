"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

type Department = {
  id: string
  name: string
}

type User = {
  id: string
  name: string
  email: string
  role: string
  departmentId: string | null
  department: {
    name: string
  } | null
}

export default function AdminSettings() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [newDepartmentName, setNewDepartmentName] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [selectedManager, setSelectedManager] = useState("")
  const [searchUser, setSearchUser] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [editedDepartmentName, setEditedDepartmentName] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [departmentsRes, usersRes] = await Promise.all([fetch("/api/departments"), fetch("/api/users")])

        if (departmentsRes.ok && usersRes.ok) {
          const departmentsData = await departmentsRes.json()
          const usersData = await usersRes.json()
          setDepartments(departmentsData)
          setUsers(usersData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [toast])

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDepartmentName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newDepartmentName,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create department")
      }

      const newDepartment = await response.json()
      setDepartments([...departments, newDepartment])
      setNewDepartmentName("")
      toast({
        title: "Department Created",
        description: "The department has been created successfully",
      })
    } catch (error) {
      console.error("Error creating department:", error)
      toast({
        title: "Error",
        description: "Failed to create department",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUsers.length === 0 || (!selectedRole && !selectedDepartment && !selectedManager)) return

    setIsLoading(true)
    try {
      const updateData = {
        role: selectedRole || undefined,
        departmentId: selectedDepartment || undefined,
        managerId: selectedManager === "unassigned" ? null : (selectedManager || undefined),
      }

      // Update all selected users
      const updatePromises = selectedUsers.map((userId) =>
        fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        })
      )

      const responses = await Promise.all(updatePromises)
      const allSuccess = responses.every((res) => res.ok)

      if (!allSuccess) {
        throw new Error("Failed to update one or more users")
      }

      const updatedUsers = await Promise.all(responses.map((res) => res.json()))
      
      // Update the users list with the updated users
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          const updated = updatedUsers.find((u) => u.id === user.id)
          return updated || user
        })
      )

      setSelectedUsers([])
      setSelectedRole("")
      setSelectedDepartment("")
      setSelectedManager("")
      setSearchUser("")
      toast({
        title: "Users Updated",
        description: `${selectedUsers.length} user(s) have been updated successfully`,
      })
      router.refresh()
    } catch (error) {
      console.error("Error updating users:", error)
      toast({
        title: "Error",
        description: "Failed to update users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department)
    setEditedDepartmentName(department.name)
    setIsEditDialogOpen(true)
  }

  const handleSaveDepartment = async () => {
    if (!editingDepartment || !editedDepartmentName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/departments/${editingDepartment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editedDepartmentName,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update department")
      }

      const updatedDepartment = await response.json()
      setDepartments(departments.map((dept) => (dept.id === updatedDepartment.id ? updatedDepartment : dept)))

      setIsEditDialogOpen(false)
      setEditingDepartment(null)

      toast({
        title: "Department Updated",
        description: "The department has been updated successfully",
      })
    } catch (error) {
      console.error("Error updating department:", error)
      toast({
        title: "Error",
        description: "Failed to update department",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tabs defaultValue="departments">
      <TabsList>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="departments">
        <div className="space-y-6">
          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Create Department</CardTitle>
              <CardDescription>Add a new department to your organization</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateDepartment}>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="department-name">Department Name</Label>
                  <Input
                    id="department-name"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder="Enter department name"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Department"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Existing Departments</CardTitle>
              <CardDescription>Manage your organization's departments</CardDescription>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? (
                <p className="text-sm text-gray-500">No departments yet</p>
              ) : (
                <div className="space-y-4">
                  {departments.map((department) => (
                    <div key={department.id} className="flex items-center justify-between border p-3 rounded-md">
                      <span className="font-medium">{department.name}</span>
                      <Button variant="outline" size="sm" onClick={() => handleEditDepartment(department)}>
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="users">
        <Card className="dark:bg-gray-900">
          <CardHeader>
            <CardTitle>Manage Users</CardTitle>
            <CardDescription>Select multiple users to update their roles and departments</CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateUser}>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="search-user">Search Users</Label>
                  <Input
                    id="search-user"
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="dark:bg-gray-800"
                  />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <Label>Select Users</Label>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={() => {
                      const filteredUsers = users.filter((user) =>
                        user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchUser.toLowerCase())
                      )
                      if (selectedUsers.length === filteredUsers.length && filteredUsers.length > 0) {
                        setSelectedUsers(selectedUsers.filter(
                          (id) => !filteredUsers.find((u) => u.id === id)
                        ))
                      } else {
                        setSelectedUsers([
                          ...selectedUsers.filter(
                            (id) => !filteredUsers.find((u) => u.id === id)
                          ),
                          ...filteredUsers.map((u) => u.id),
                        ])
                      }
                    }}
                  >
                    {(() => {
                      const filteredUsers = users.filter((user) =>
                        user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchUser.toLowerCase())
                      )
                      const allFiltered = filteredUsers.every((u) => selectedUsers.includes(u.id))
                      return allFiltered && filteredUsers.length > 0 ? "Deselect All" : "Select All"
                    })()}
                  </button>
                </div>
                <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto dark:border-gray-700">
                  {(() => {
                    const filteredUsers = users.filter((user) =>
                      user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchUser.toLowerCase())
                    )
                    return filteredUsers.length === 0 ? (
                      <p className="text-sm text-gray-500">No users found</p>
                    ) : (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`user-${user.id}`}
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id])
                              } else {
                                setSelectedUsers(selectedUsers.filter((id) => id !== user.id))
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer flex-1">
                            {user.name} ({user.email})
                          </label>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {user.role}
                          </span>
                        </div>
                      ))
                    )
                  })()}
                </div>
                {selectedUsers.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedUsers.length} user(s) selected
                  </p>
                )}
              </div>

              {selectedUsers.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORG_ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                        
                  <div className="space-y-2">
                    <Label htmlFor="manager">Assigned Manager</Label>
                    <Select value={selectedManager} onValueChange={setSelectedManager}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">None</SelectItem>
                        {users
                          .filter((user) => !selectedUsers.includes(user.id) && user.role === "MANAGER")
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || selectedUsers.length === 0 || (!selectedRole && !selectedDepartment && !selectedManager)}>
                {isLoading ? "Updating..." : `Update ${selectedUsers.length} User${selectedUsers.length !== 1 ? "s" : ""}`}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      <TabsContent value="analytics">
        <Card className="dark:bg-gray-900">
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>View organization analytics and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Analytics feature coming soon</p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update the department name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-department-name">Department Name</Label>
              <Input
                id="edit-department-name"
                value={editedDepartmentName}
                onChange={(e) => setEditedDepartmentName(e.target.value)}
                placeholder="Enter department name"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDepartment} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
