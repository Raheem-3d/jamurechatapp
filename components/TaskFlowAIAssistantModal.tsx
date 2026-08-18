"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  Bot,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  Zap,
  RefreshCw,
  Rocket,
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

const TEMPLATE_PROMPTS = [
  {
    title: "🚀 Website Launch",
    prompt: "Create a Website Redesign project with tasks for UI/UX Design, Frontend Development, API Integration, Testing, and Production Deployment. Assign UI to design team and backend to dev team with High priority.",
  },
  {
    title: "⚡ Bug Fixing Sprint",
    prompt: "Create a 1-week Bug Fixing Sprint with tasks for Critical Authentication Bug, Database Optimization, Mobile Responsive Layout Fix, and API Error Logging.",
  },
  {
    title: "📊 Quarterly Audit",
    prompt: "Create a Quarterly Financial & Compliance Audit project with tasks for Expense Verification, Client Invoice Audit, Tax Preparation, and Executive Summary Report.",
  },
  {
    title: "📢 Marketing Campaign",
    prompt: "Create a Product Launch Marketing Campaign with Social Media Ads setup, Email Newsletter Copywriting, Influencer Outreach, and Analytics Setup.",
  },
];

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
      toast.error("Please enter a prompt or select a template!");
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
        throw new Error(data.error || "Failed to generate AI plan");
      }

      setPlan(data.plan);
      setTeamMembers(data.teamMembers || []);
      setStep("PREVIEW");
      toast.success("AI Blueprint generated! Review and customize before creating.");
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      toast.error(err.message || "Failed to generate plan");
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

      toast.success(`Success! Created project "${data.taskTitle}" with ${data.recordsCreated} assigned records!`);

      // Dispatch task assigned window event to update UI across views
      window.dispatchEvent(new CustomEvent("task:assigned"));

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

    // Update assignee name if id changed
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
      assignmentReason: "Manually added to plan",
    };
    setPlan({ ...plan, records: [...plan.records, newRecord] });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogContent className="max-w-3xl bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl overflow-hidden p-0 rounded-2xl">
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-blue-900/60 p-6 border-b border-purple-500/20 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-xl shadow-lg shadow-purple-500/25">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                TaskFlow AI Admin Co-Pilot
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs px-2.5 py-0.5">
                  1-Click AI Assistant
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-sm mt-0.5">
                Automatically generate complete project plans, stages, tasks, and team assignments in seconds.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {step === "PROMPT" ? (
            <div className="space-y-6">
              {/* Natural Language Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                  <span>Describe what you want to create (English / Urdu / Hindi):</span>
                  <span className="text-xs text-purple-400 font-normal">AI parses project, cards & auto-assigns team</span>
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Create a Mobile App Launch project with UI design, Auth API, Database setup, and QA tasks. Assign UI to Rahul and Backend to Priya with High priority."
                  className="bg-slate-900/90 border-slate-700/80 focus:border-purple-500 focus:ring-purple-500/20 min-h-[120px] text-slate-100 placeholder:text-slate-500 rounded-xl p-3.5"
                />
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Quick AI Prompt Templates
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {TEMPLATE_PROMPTS.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(t.prompt);
                        handleGenerate(t.prompt);
                      }}
                      disabled={isGenerating}
                      className="text-left p-3 rounded-xl bg-slate-900/60 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/40 transition-all duration-200 group"
                    >
                      <div className="font-semibold text-sm text-purple-300 group-hover:text-purple-200">
                        {t.title}
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1 mt-1">
                        {t.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW & EDIT STEP */
            <div className="space-y-6">
              {/* Project Blueprint Card */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-600/30 text-purple-300 border-purple-500/40">
                      Project Title
                    </Badge>
                    <Badge className={cn("text-xs font-semibold",
                      plan?.priority === 'HIGH' || plan?.priority === 'URGENT' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    )}>
                      {plan?.priority} Priority
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("PROMPT")}
                    className="text-slate-400 hover:text-white text-xs h-7 gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                </div>

                <Input
                  value={plan?.projectTitle || ""}
                  onChange={(e) => setPlan(plan ? { ...plan, projectTitle: e.target.value } : null)}
                  className="bg-slate-950 border-slate-700 font-bold text-lg text-purple-200"
                />

                <Textarea
                  value={plan?.projectDescription || ""}
                  onChange={(e) => setPlan(plan ? { ...plan, projectDescription: e.target.value } : null)}
                  className="bg-slate-950 border-slate-700 text-sm text-slate-300 min-h-[60px]"
                />
              </div>

              {/* Records / Subtasks List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Generated Task Cards ({plan?.records.length || 0})
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomRecord}
                    className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-xs text-slate-300 gap-1 h-7"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400" /> Add Item
                  </Button>
                </div>

                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {plan?.records.map((rec, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Input
                          value={rec.title}
                          onChange={(e) => handleUpdateRecord(index, "title", e.target.value)}
                          className="bg-slate-950 border-slate-700 text-slate-200 text-sm font-medium h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRecord(index)}
                          className="text-slate-500 hover:text-red-400 h-8 w-8 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <Textarea
                        value={rec.description}
                        onChange={(e) => handleUpdateRecord(index, "description", e.target.value)}
                        className="bg-slate-950 border-slate-800 text-slate-400 text-xs min-h-[44px]"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        {/* Stage Selector */}
                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block">Stage</label>
                          <Select
                            value={rec.stageName}
                            onValueChange={(val) => handleUpdateRecord(index, "stageName", val)}
                          >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-slate-300 h-8">
                              <SelectValue placeholder="Stage" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
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
                          <label className="text-[11px] text-slate-400 mb-1 block">Priority</label>
                          <Select
                            value={rec.priority}
                            onValueChange={(val) => handleUpdateRecord(index, "priority", val)}
                          >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-slate-300 h-8">
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                              <SelectItem value="HIGH">High</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="URGENT">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Assignee Selector */}
                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block flex items-center justify-between">
                            <span>Assignee</span>
                            {rec.assignmentReason && (
                              <span className="text-[10px] text-purple-400 truncate max-w-[80px]" title={rec.assignmentReason}>
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
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-slate-300 h-8">
                              <SelectValue placeholder="Assign User" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
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
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Cancel
          </Button>

          {step === "PROMPT" ? (
            <Button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium px-5 gap-2 rounded-xl shadow-lg shadow-purple-600/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing & Generating Plan...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate AI Blueprint
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("PROMPT")}
                className="bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Back to Prompt
              </Button>
              <Button
                onClick={handleExecute}
                disabled={isExecuting || !plan?.records?.length}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-6 gap-2 rounded-xl shadow-lg shadow-emerald-600/25"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Project & Assigning...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Create Project & Assign Tasks
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
