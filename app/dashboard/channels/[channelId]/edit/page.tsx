"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
// import { toast } from "sonner";
import { toast } from "sonner"
import { json } from "stream/consumers";
import { useTeamUsers } from "@/hooks/use-team-users";



type ChannelHeaderProps = {
  channel: any;
};

export default function EditChannel({ params }: { params: any }) {
  const [image, setImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [data, setData] = useState<any>({});
  const [selectedMembers, setSelectedMembers] = useState<string[]>();
  const [assignee, setAssignee] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter()
  const { channelId } = use(params);
  const { users, loading: usersLoading } = useTeamUsers();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setImage(previewUrl);

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const uploadData = await res.json();
      const rawUrl = uploadData?.files?.[0]?.fileUrl;
      if (rawUrl) {
        const cleanUrl = rawUrl.includes("/u/")
          ? `/u/${rawUrl.split("/u/")[1]}`
          : rawUrl;
        setImage(cleanUrl);
        toast("Profile picture uploaded", {
          description: "Click Edit Channel to save changes.",
        });
      }
    } catch (err) {
      console.error(err);
      toast("Upload failed", {
        description: "Could not upload channel image.",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}`);
      const channelData = await res.json();
      setData(channelData);
      console.log(channelData, "channelData");
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDepartment = async () => {
    const response = await fetch("/api/departments");

    const departmentData = await response.json();
    setDepartment(departmentData);
  };

  useEffect(() => {
    fetchData();
    fetchDepartment();
  }, [channelId]);

  console.log(data, "data");

  useEffect(() => {
    if (data?.channel?.members && assignee.length === 0) {
      setAssignee(data.channel.members.map((m: any) => m.userId));
    }
  }, [data]);


  useEffect(() => {
    if (data.channel) {
      setName(data?.channel?.name || "");
      setDescription(data?.channel?.description || "");
      setDepartmentId(data?.channel?.department?.id || "none");
      setIsPublic(data?.channel?.isPublic ?? true);
      setImage(data?.channel?.image || null);
    }
  }, [data]);

  const toggleAssignee = (userId: string, checked: boolean) => {
    setAssignee((prev) => checked ? [...prev, userId] : prev.filter((id) => id !== userId)
    );
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const normalizedDept = !departmentId || departmentId === "none" ? null : departmentId;
      const response = await fetch(`/api/channels/${channelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          departmentId: normalizedDept,
          isPublic,
          image,
          members: assignee,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update channel");
      }

      toast("Channel updated successfully", {
        description: "Your changes have been saved.",
      });

      router.push(`/dashboard/channels/${channelId}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating channel:", error);
      toast("Error updating channel", {
        description: error.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card className="py-6">
        <CardTitle className="pt-6 text-center">Edit Channel</CardTitle>
        <CardDescription className="text-center">
          Edit channel if something is wrong.
        </CardDescription>
        <form onSubmit={handleEditSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Channel Profile Picture (DP)</Label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center overflow-hidden shrink-0">
                  {image ? (
                    <img src={image} alt="Channel DP" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">#</span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {isUploadingImage && (
                    <p className="text-[11px] text-indigo-500 font-medium">Uploading profile picture...</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name."
              />
            </div>

            <div className=" space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel about?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Select
                value={departmentId}
                onValueChange={setDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {department.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              ></Switch>
              <Label>Public Channel</Label>
            </div>

            <div className="space-y-2">
              <Label>Assignees</Label>
              <div className="space-y-2">
                {usersLoading ? (
                  <div className="flex items-center space-x-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">
                      Loading users...
                    </span>
                  </div>
                ) : (
                  <div className="border rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
                   {users.map((userItem) => (
  <div key={userItem.id} className="flex items-center space-x-2">
    <Checkbox
      id={`user-${userItem.id}`}
      checked={assignee.includes(userItem.id)}
      onCheckedChange={(checked) => {
        toggleAssignee(userItem.id, checked);
      }}
    />
    <Label
      htmlFor={`user-${userItem.id}`}
      className="text-sm cursor-pointer flex-1"
    >
      {userItem.name}
      <span className="text-gray-500">({userItem.email})</span>
    </Label>
  </div>
))}

                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Editing...": "Edit Channel"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


