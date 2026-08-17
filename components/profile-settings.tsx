"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import ProfilePictureUpload from "@/components/profile-picture-upload"

type ProfileSettingsProps = {
  user: any
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name || "")
  const [email, setEmail] = useState(user.email || "")
  const [department, setDepartment] = useState(user.departmentId || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)

    try {
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          departmentId: department,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to update profile")
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      })
      router.refresh()
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }




  return (
    <div className="space-y-6 dark:bg-gray-900">
      <ProfilePictureUpload user={user} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <p className="text-[11px] text-slate-500">
            Update your email address to change your login credentials.
          </p>
        </div>
       
        {
          user.role == "ADMIN" ? (
            <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Select value={department} onValueChange={setDepartment} >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={user.departmentId}>{user.department?.name || "Unknown"}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Department cannot be changed. Contact an admin if you need to update your department.
          </p>
        </div>

          ):
          <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Select value={department} onValueChange={setDepartment} disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={user.departmentId}>{user.department?.name || "Unknown"}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Department cannot be changed. Contact an admin if you need to update your department.
          </p>
        </div>
        }
        
        <Button type="submit" disabled={isUpdating}>
          {isUpdating ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </div>
  )
}
