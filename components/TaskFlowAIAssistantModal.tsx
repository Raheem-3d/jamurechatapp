"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Wand2,
  Loader2,
  Plus,
  Trash2,
  Layers,
  RefreshCw,
  Rocket,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  activeTasksCount: number;
}

interface RecordPlan {
  title: string;
  description: string;
  priority: string;
  stageName: string;
  dueDateDays: number;
  suggestedAssigneeId: string | null;
  suggestedAssigneeName?: string;
  assignmentReason?: string;
}

interface GeneratedPlan {
  projectTitle: string;
  projectDescription: string;
  priority: string;
  deadlineDays: number;
  stages: Array<{ name: string; color: string }>;
  records: RecordPlan[];
}

interface TaskFlowAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  target?: "NEW_PROJECT" | "EXISTING_PROJECT";
  parentTaskId?: string;
  onSuccess?: () => void;
}

export function TaskFlowAIAssistantModal({
  isOpen,
  onClose,
  target = "NEW_PROJECT",
  parentTaskId,
  onSuccess,
}: TaskFlowAIAssistantModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [step, setStep] = useState<"PROMPT" | "PREVIEW">("PROMPT");

  const handleGenerate = async (promptText?: string) => {
    const textToUse = promptText || prompt;
    if (!textToUse.trim()) {
      toast.error("Please describe what project or tasks you want to create!");
      return;
    }

    try {
      setIsGenerating(true);
      const res = await fetch("/api/ai/admin-task-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToUse,
          mode: "preview",
          target,
          parentTaskId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate AI blueprint");
      }

      setPlan(data.plan);
      setTeamMembers(data.teamMembers || []);
      setStep("PREVIEW");
      toast.success("Jamure AI Blueprint generated! Review details before creating.");
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      toast.error(err.message || "Failed to generate project plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExecute = async () => {
    if (!plan) return;

    try {
      setIsExecuting(true);
      const res = await fetch("/api/ai/admin-task-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "execute",
          target,
          parentTaskId,
          customData: plan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project and tasks");
      }

      toast.success(`Success! Created "${data.taskTitle}" with ${data.recordsCreated} assigned task cards!`);

      window.dispatchEvent(new CustomEvent("task:assigned"));
      window.dispatchEvent(new CustomEvent("task:created"));
      window.dispatchEvent(new CustomEvent("project:created"));

      if (onSuccess) onSuccess();
      handleResetAndClose();
    } catch (err: any) {
      console.error("Execute Error:", err);
      toast.error(err.message || "Failed to execute creation");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleResetAndClose = () => {
    setPrompt("");
    setPlan(null);
    setStep("PROMPT");
    onClose();
  };

  const handleUpdateRecord = (index: number, field: keyof RecordPlan, value: any) => {
    if (!plan) return;
    const updatedRecords = [...plan.records];
    updatedRecords[index] = { ...updatedRecords[index], [field]: value };

    if (field === "suggestedAssigneeId") {
      const member = teamMembers.find((m) => m.id === value);
      updatedRecords[index].suggestedAssigneeName = member ? member.name : "Unassigned";
    }

    setPlan({ ...plan, records: updatedRecords });
  };

  const handleDeleteRecord = (index: number) => {
    if (!plan) return;
    const updatedRecords = plan.records.filter((_, i) => i !== index);
    setPlan({ ...plan, records: updatedRecords });
  };

  const handleAddCustomRecord = () => {
    if (!plan) return;
    const newRecord: RecordPlan = {
      title: "New Task Item",
      description: "Additional task item added manually.",
      priority: "MEDIUM",
      stageName: plan.stages[0]?.name || "To Do",
      dueDateDays: 3,
      suggestedAssigneeId: teamMembers[0]?.id || null,
      suggestedAssigneeName: teamMembers[0]?.name || "Unassigned",
      assignmentReason: "Manually added item",
    };
    setPlan({ ...plan, records: [...plan.records, newRecord] });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogContent className="max-w-3xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-0 rounded-2xl">
        {/* Top Header - AI Hub Style */}
        <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-slate-50 dark:from-indigo-950/60 dark:via-purple-950/40 dark:to-slate-900 p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md shadow-indigo-500/20 text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Jamure AI
                <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-0 text-[9px] font-extrabold px-1.5 py-0.5">
                  PROJECT GENERATOR
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Describe your requirements in English, Urdu, or Hindi. Jamure AI will generate tasks, stages & team assignments automatically.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5">
          {step === "PROMPT" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Project & Tasks Prompt</span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">
                    AI parses project title, task cards & team assignees
                  </span>
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your project, e.g. Create a Mobile App Redesign project with UI Design, Auth API, Database setup, and QA Testing tasks. Assign UI to Rahul and Dev tasks to Priya with High priority."
                  className="bg-slate-50/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[140px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl p-3.5 text-xs leading-relaxed"
                />
              </div>
            </div>
          ) : (
            /* PREVIEW & EDIT STEP */
            <div className="space-y-5">
              {/* Project Blueprint Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-0 text-[10px] font-bold">
                      Project Title
                    </Badge>
                    <Badge className={cn("text-[10px] font-bold px-2 py-0.5 border-0",
                      plan?.priority === 'HIGH' || plan?.priority === 'URGENT' 
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' 
                        : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    )}>
                      {plan?.priority} Priority
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("PROMPT")}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs h-7 gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Edit Prompt
                  </Button>
                </div>

                <Input
                  value={plan?.projectTitle || ""}
                  onChange={(e) => setPlan(plan ? { ...plan, projectTitle: e.target.value } : null)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-base text-slate-900 dark:text-slate-100"
                />

                <Textarea
                  value={plan?.projectDescription || ""}
                  onChange={(e) => setPlan(plan ? { ...plan, projectDescription: e.target.value } : null)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 min-h-[55px]"
                />
              </div>

              {/* Records / Subtasks List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Generated Task Cards ({plan?.records.length || 0})
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomRecord}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 gap-1 h-7 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-500" /> Add Task
                  </Button>
                </div>

                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {plan?.records.map((rec, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Input
                          value={rec.title}
                          onChange={(e) => handleUpdateRecord(index, "title", e.target.value)}
                          className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRecord(index)}
                          className="text-slate-400 hover:text-rose-500 h-8 w-8 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <Textarea
                        value={rec.description}
                        onChange={(e) => handleUpdateRecord(index, "description", e.target.value)}
                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs min-h-[44px]"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {/* Stage Selector */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Stage</label>
                          <Select
                            value={rec.stageName}
                            onValueChange={(val) => handleUpdateRecord(index, "stageName", val)}
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 h-8">
                              <SelectValue placeholder="Stage" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                              {plan.stages.map((st, i) => (
                                <SelectItem key={i} value={st.name}>
                                  {st.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Priority Selector */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Priority</label>
                          <Select
                            value={rec.priority}
                            onValueChange={(val) => handleUpdateRecord(index, "priority", val)}
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 h-8">
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                              <SelectItem value="HIGH">High</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="URGENT">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Assignee Selector */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block flex items-center justify-between">
                            <span>Assignee</span>
                            {rec.assignmentReason && (
                              <span className="text-[9px] text-indigo-500 font-semibold truncate max-w-[80px]" title={rec.assignmentReason}>
                                AI Picked
                              </span>
                            )}
                          </label>
                          <Select
                            value={rec.suggestedAssigneeId || "unassigned"}
                            onValueChange={(val) =>
                              handleUpdateRecord(
                                index,
                                "suggestedAssigneeId",
                                val === "unassigned" ? null : val
                              )
                            }
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 h-8">
                              <SelectValue placeholder="Assign User" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name} ({member.activeTasksCount} active tasks)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleResetAndClose}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </Button>

          {step === "PROMPT" ? (
            <Button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 gap-2 rounded-xl shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Project Plan...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Jamure AI
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("PROMPT")}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              >
                Back to Prompt
              </Button>
              <Button
                onClick={handleExecute}
                disabled={isExecuting || !plan?.records?.length}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 gap-2 rounded-xl shadow-sm"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Project & Assigning...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Create Project & Tasks
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
