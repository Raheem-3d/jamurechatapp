import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TaskDetailLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-150">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 md:w-96" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-28 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Main Grid Content Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="flex gap-6 pt-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-28" />
              </div>
            </CardContent>
          </Card>

          {/* Comments/Activity Skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-10 w-48 rounded-md" />
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-24 w-full rounded-md" />
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar (1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 w-36" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
