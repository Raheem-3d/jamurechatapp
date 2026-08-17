


import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProfileSettings from "@/components/profile-settings"
import { Badge } from "@/components/ui/badge"
import AdminSettings from "@/components/admin-settings"
import NotificationSettings from "@/components/notification-settings"
import { 
  User, 
  Settings, 
  Shield, 
  Bell,
  ChevronRight,
  Mail,
  Lock,
  Palette
} from "lucide-react"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Get user with role
  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      department: true,
    },
  })

  const isAdmin = user?.role === "ADMIN" || user?.role === "ORG_ADMIN"

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Control Header Bar */}
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md shrink-0">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Settings
              <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2 py-0.5">
                Preferences
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Manage your personal profile, credentials, and organizational settings.
            </p>
          </div>
        </div>

        {/* Settings Content Card */}
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full h-14 bg-slate-50 dark:bg-slate-800/40 p-1 border-b border-slate-100 dark:border-slate-800 gap-1 flex justify-start rounded-none">
                <TabsTrigger
                  value="profile"
                  className="rounded-xl text-xs font-bold gap-2 px-6 h-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs transition-all"
                >
                  <User className="h-4 w-4 text-indigo-500" />
                  <span>Profile Settings</span>
                </TabsTrigger>

                {isAdmin && (
                  <TabsTrigger
                    value="admin"
                    className="rounded-xl text-xs font-bold gap-2 px-6 h-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs transition-all"
                  >
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span>Admin Settings</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="p-6">
                <TabsContent value="profile" className="mt-0 space-y-6">
                  <div className="space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Personal Information</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Update your avatar, name, and email address to manage your login credentials.
                    </p>
                  </div>
                  <ProfileSettings user={user} />
                </TabsContent>

                {isAdmin && (
                  <TabsContent value="admin" className="mt-0 space-y-6">
                    <div className="space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Admin Panel</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Manage organization-wide permissions, rules, and configurations.
                      </p>
                    </div>
                    <AdminSettings />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* User Info Footer */}
        <div className="text-center py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Signed in as <span className="font-bold text-slate-800 dark:text-slate-200">{user?.email}</span>
          </p>
          {user?.department && (
            <p className="text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              {user.department.name} • {user.role}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}