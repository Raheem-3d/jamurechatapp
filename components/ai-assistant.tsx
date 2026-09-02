// AI Hub — Advanced AI Assistant Interface with Multi-Mode Tabs & Streaming
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  Lightbulb,
  Info,
  ArrowLeft,
  Cpu,
  Trash2,
  User,
  Clock,
  TrendingUp,
  ListTodo,
  Users,
  FileText,
  AlertCircle,
  ChevronRight,
  PlusCircle,
  Download,
  BarChart3,
  PenLine,
  Brain,
  Zap,
  Copy,
  CheckCheck,
  Rocket,
  Target,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  mode?: string;
  timestamp?: Date;
}

interface QueryCategory {
  title: string;
  queries: Array<{
    text: string;
    icon: any;
    description: string;
  }>;
}

type AssistantMode = "analyst" | "writer" | "planner";

const MODES: Record<AssistantMode, { label: string; icon: any; color: string; description: string; prompt: string }> = {
  analyst: {
    label: "Analyst",
    icon: BarChart3,
    color: "indigo",
    description: "Insights, reports & team analytics",
    prompt: "You are an expert project analytics assistant. Provide clear data-driven insights, performance analysis, and actionable recommendations based on the workspace context.",
  },
  writer: {
    label: "Writer",
    icon: PenLine,
    color: "violet",
    description: "Draft content, messages & docs",
    prompt: "You are a professional business writer. Help draft clear, concise, and professional messages, reports, project descriptions, and any written content the user needs.",
  },
  planner: {
    label: "Planner",
    icon: Brain,
    color: "emerald",
    description: "Sprint planning & prioritization",
    prompt: "You are a certified project manager and agile coach. Help with sprint planning, task prioritization, workload balancing, risk identification, and strategic project decisions.",
  },
};

export default function AIAssistant() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AssistantMode>("analyst");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const userRole = (session?.user as any)?.role || "EMPLOYEE";
  const userName = session?.user?.name || "Team Member";
  const userEmail = session?.user?.email || "";
  const userAvatar = session?.user?.image || "";
  const isEmployee = userRole === "EMPLOYEE";

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Load chat history from localStorage
  useEffect(() => {
    const savedChat = localStorage.getItem("ai_assistant_history_v2");
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (e) {
        console.error("Failed to restore chat history", e);
      }
    }
  }, []);

  const saveChatHistory = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
    localStorage.setItem("ai_assistant_history_v2", JSON.stringify(newMessages));
  }, []);

  const handleClearHistory = () => {
    if (messages.length === 0) return;
    saveChatHistory([]);
    toast.success("Conversation cleared");
  };

  const handleCopyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const md = messages
      .map((m) => `## ${m.role === "user" ? `You (${m.mode || mode})` : "AI Assistant"}\n\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([`# AI Assistant Chat Export\n\n${md}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported as Markdown");
  };

  // Streaming simulation on top of existing API
  const simulateStream = async (text: string): Promise<void> => {
    setIsStreaming(true);
    setStreamingContent("");
    const words = text.split(" ");
    for (let i = 0; i <= words.length; i++) {
      await new Promise((r) => setTimeout(r, 18 + Math.random() * 22));
      setStreamingContent(words.slice(0, i).join(" ") + (i < words.length ? "▋" : ""));
    }
    setIsStreaming(false);
    setStreamingContent("");
  };

  const handleSubmit = async (query?: string) => {
    const userQuery = query || input.trim();
    if (!userQuery || loading) return;

    const userMsg: Message = {
      role: "user",
      content: userQuery,
      mode,
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMsg];
    saveChatHistory(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userQuery,
          mode,
          systemPromptOverride: MODES[mode].prompt,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      // Simulate streaming effect
      await simulateStream(data.response);

      const assistantMsg: Message = {
        role: "assistant",
        content: data.response,
        mode,
        timestamp: new Date(),
      };
      saveChatHistory([...updatedMessages, assistantMsg]);
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      toast.error(error.message || "Failed to get AI response");
      const errMsg: Message = {
        role: "assistant",
        content: "I encountered an error. Please check your AI configuration and try again.",
        mode,
        timestamp: new Date(),
      };
      saveChatHistory([...updatedMessages, errMsg]);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingContent("");
      textareaRef.current?.focus();
    }
  };

  // Query suggestions by mode and role
  const modeQueries: Record<AssistantMode, QueryCategory[]> = {
    analyst: isEmployee
      ? [
        {
          title: "My Work & Tasks",
          queries: [
            { text: "What are my current active tasks?", icon: ListTodo, description: "Your assigned task list" },
            { text: "What are my overdue tasks?", icon: Clock, description: "Check missed deadlines" },
            { text: "What should I prioritize today?", icon: Target, description: "Personal AI priority suggestions" },
          ],
        },
      ]
      : [
        {
          title: "My Projects & Performance",
          queries: [
            { text: "What is the status of my created/assigned projects?", icon: BarChart3, description: "Overview of your projects" },
            { text: "Which of my project tasks are overdue?", icon: Clock, description: "Late tasks in your projects" },
            { text: "Show priority breakdown for my projects", icon: TrendingUp, description: "Priority analysis of your work" },
          ],
        },
      ],
    writer: isEmployee
      ? [
        {
          title: "My Drafts & Updates",
          queries: [
            { text: "Draft a progress update for my current task", icon: FileText, description: "Personal status update for lead" },
            { text: "Help me draft a clear project question", icon: MessageSquare, description: "Ask lead/team for clarification" },
            { text: "Write a summary of my completed work", icon: Sparkles, description: "Summarize your achievements" },
          ],
        },
      ]
      : [
        {
          title: "Project Reports & Docs",
          queries: [
            { text: "Generate a status report for my project", icon: FileText, description: "Project progress overview" },
            { text: "Draft a project update for stakeholders", icon: MessageSquare, description: "Update message for team/client" },
            { text: "Write a kickoff description for my task", icon: Rocket, description: "Clear project scope description" },
          ],
        },
      ],
    planner: isEmployee
      ? [
        {
          title: "My Daily Schedule",
          queries: [
            { text: "How should I structure my work schedule today?", icon: Brain, description: "Personal time-blocking advice" },
            { text: "Break down my assigned task into smaller steps", icon: Target, description: "Subtask breakdown" },
            { text: "Identify potential risks or delays for my tasks", icon: AlertCircle, description: "Personal risk analysis" },
          ],
        },
      ]
      : [
        {
          title: "Project Milestones & Planning",
          queries: [
            { text: "Help me plan milestones for my project", icon: Target, description: "Project milestone planning" },
            { text: "Suggest priority sequence for my project tasks", icon: Brain, description: "Optimize task sequence" },
            { text: "Identify timeline risks in my project", icon: AlertCircle, description: "Risk analysis for your projects" },
          ],
        },
      ],
  };

  const categories = modeQueries[mode] || [];

  // Markdown parser (same as before, slightly enhanced)
  const parseAssistantMessage = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : "";
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <div key={index} className="my-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden font-mono text-xs shadow-sm bg-slate-950 text-slate-100 max-w-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900 text-slate-400 text-[10px]">
              <span>{language.toUpperCase() || "CODE"}</span>
              <button onClick={() => { navigator.clipboard.writeText(code.trim()); toast.success("Code copied!"); }} className="hover:text-white transition-colors">Copy</button>
            </div>
            <pre className="p-4 overflow-x-auto leading-relaxed"><code>{code.trim()}</code></pre>
          </div>
        );
      }
      return <div key={index} className="space-y-1">{formatTextParagraphs(part)}</div>;
    });
  };

  const renderMarkdownTable = (lines: string[], keyPrefix: number) => {
    if (lines.length < 2) return null;

    const parseRow = (line: string) => {
      const cells = line.split("|").map((c) => c.trim());
      if (cells.length > 0 && cells[0] === "") cells.shift();
      if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      return cells;
    };

    const headerRow = parseRow(lines[0]);
    // Skip separator lines like |---|---|
    const contentLines = lines.slice(1).filter((l) => l.replace(/[\s\:\-\|]/g, "").length > 0);
    const bodyRows = contentLines.map(parseRow);

    return (
      <div key={keyPrefix} className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              {headerRow.map((cell, idx) => (
                <th key={idx} className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300">
                  {parseInlineStyles(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                    {parseInlineStyles(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const formatTextParagraphs = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Detect table block (starts with |)
      if (line.trim().startsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableLines.push(lines[i].trim());
          i++;
        }
        elements.push(renderMarkdownTable(tableLines, elements.length));
        continue;
      }

      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        elements.push(
          <li key={elements.length} className="ml-5 list-disc text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-1">
            {parseInlineStyles(line.trim().substring(2))}
          </li>
        );
      } else {
        const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          elements.push(
            <li key={elements.length} className="ml-5 list-decimal text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-1">
              {parseInlineStyles(numMatch[2])}
            </li>
          );
        } else if (line.trim().startsWith("###")) {
          elements.push(
            <h4 key={elements.length} className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-1">
              {parseInlineStyles(line.trim().substring(3))}
            </h4>
          );
        } else if (line.trim().startsWith("##")) {
          elements.push(
            <h3 key={elements.length} className="text-base font-bold text-slate-950 dark:text-slate-50 mt-5 mb-2">
              {parseInlineStyles(line.trim().substring(2))}
            </h3>
          );
        } else if (line.trim().startsWith("#")) {
          elements.push(
            <h2 key={elements.length} className="text-lg font-bold text-slate-950 dark:text-slate-50 mt-6 mb-3">
              {parseInlineStyles(line.trim().substring(1))}
            </h2>
          );
        } else if (!line.trim()) {
          elements.push(<div key={elements.length} className="h-2" />);
        } else {
          elements.push(
            <p key={elements.length} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-1">
              {parseInlineStyles(line)}
            </p>
          );
        }
      }
      i++;
    }

    return elements;
  };

  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      const codeParts = part.split(/(`.*?`)/g);
      return codeParts.map((subPart, j) => {
        if (subPart.startsWith("`") && subPart.endsWith("`")) {
          return <code key={j} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-mono text-[11px] border border-slate-200/50 dark:border-slate-800">{subPart.slice(1, -1)}</code>;
        }
        return subPart;
      });
    });
  };

  const modeColors: Record<AssistantMode, string> = {
    analyst: "indigo",
    writer: "violet",
    planner: "emerald",
  };
  const currentColor = modeColors[mode];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-100px)] max-h-[900px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 select-none">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              AI Hub
              <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-0 text-[9px] font-extrabold px-1.5">
                ADVANCED
              </Badge>
              <Badge variant="outline" className="text-[9px] font-semibold text-slate-500 border-slate-200 dark:border-slate-800">
                {userRole.replace("_", " ")}
              </Badge>
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {MODES[mode].description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg" onClick={handleExportChat} title="Export chat as Markdown">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500 rounded-lg" onClick={handleClearHistory} title="Clear history">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/65 dark:border-slate-800 text-[10px] text-slate-500">
            <Cpu className="h-3 w-3 text-indigo-500" />
            <span className="font-mono font-medium">{process.env.OLLAMA_MODEL || "AI"}</span>
          </div>
        </div>
      </div>

      {/* ── Mode Tabs ── */}
      <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/40">
        <div className="flex items-center gap-1">
          {(Object.keys(MODES) as AssistantMode[]).map((m) => {
            const ModeIcon = MODES[m].icon;
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                  isActive
                    ? m === "analyst"
                      ? "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300"
                      : m === "writer"
                        ? "bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300"
                        : "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <ModeIcon className="h-3.5 w-3.5" />
                {MODES[m].label}
              </button>
            );
          })}
          <div className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 italic hidden sm:block">
            {MODES[mode].description}
          </div>
        </div>
      </div>

      {/* ── Main Panel Split ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Sidebar */}
        <div className="hidden lg:flex flex-col w-72 lg:w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 overflow-y-auto">
          <div className="p-3.5 border-b border-slate-200/60 dark:border-slate-800/60">
            <Button
              variant="outline"
              onClick={handleClearHistory}
              disabled={messages.length === 0}
              className="w-full justify-start text-xs h-8 gap-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
            >
              <PlusCircle className="h-3.5 w-3.5 text-indigo-500" />
              New Session
            </Button>
          </div>

          <div className="p-3.5 space-y-5">
            {/* Recent Questions / History */}
            {messages.filter((m) => m.role === "user").length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">
                  Recent History
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {messages
                    .filter((m) => m.role === "user")
                    .slice(-6)
                    .reverse()
                    .map((msg, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSubmit(msg.content)}
                        disabled={loading}
                        className="w-full text-left px-2.5 py-2 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 transition-colors flex items-start gap-2 rounded-lg group text-xs text-slate-700 dark:text-slate-300 leading-snug break-words border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-normal break-words font-medium">
                          {msg.content}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Suggested Queries by Mode */}
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">
                  {cat.title}
                </span>
                <div className="space-y-1">
                  {cat.queries.map((q, qIdx) => {
                    const QueryIcon = q.icon;
                    return (
                      <button
                        key={qIdx}
                        onClick={() => handleSubmit(q.text)}
                        disabled={loading}
                        className="w-full text-left px-2.5 py-2 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 transition-colors flex items-start justify-between rounded-lg group disabled:opacity-50 border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                      >
                        <div className="flex items-start gap-2 min-w-0 pr-1">
                          <QueryIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug break-words font-medium group-hover:text-slate-900 dark:group-hover:text-white">
                            {q.text}
                          </span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Access info */}
          <div className="mt-auto p-3.5 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex gap-2">
              <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
                {isEmployee
                  ? "Showing only your assigned & created tasks."
                  : "Showing projects created by or assigned to you."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="flex-1 flex flex-col justify-between bg-white dark:bg-slate-950 overflow-hidden">

          {/* Messages */}
          <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {messages.length === 0 && !isStreaming ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12 space-y-6 select-none">
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center border",
                  mode === "analyst" ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                    : mode === "writer" ? "bg-violet-50 dark:bg-violet-950/50 border-violet-100 dark:border-violet-900/50 text-violet-600 dark:text-violet-400"
                      : "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                )}>
                  {(() => { const Icon = MODES[mode].icon; return <Icon className="h-6 w-6" />; })()}
                </div>
                <div className="space-y-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {mode === "analyst" ? "Workspace Analytics" : mode === "writer" ? "Content Writer" : "Project Planner"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {MODES[mode].description}. Ask me anything or pick a suggestion from the left.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 lg:hidden pt-2">
                  {(categories[0]?.queries || []).map((q, qIdx) => (
                    <button key={qIdx} onClick={() => handleSubmit(q.text)}
                      className="text-[10px] text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto w-full">
                {messages.map((msg, idx) => (
                  <div key={idx} className="flex items-start gap-4 pb-6 border-b border-slate-100/50 dark:border-slate-900/50 last:border-0 group">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {msg.role === "user" ? (
                        <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <AvatarImage src={userAvatar} />
                          <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                            {userName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center border",
                          msg.mode === "writer" ? "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-100/40 dark:border-violet-900/50"
                            : msg.mode === "planner" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/40 dark:border-emerald-900/50"
                              : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/40 dark:border-indigo-900/50"
                        )}>
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-grow space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {msg.role === "user" ? "You" : "AI Hub"}
                          {msg.mode && msg.role === "assistant" && (
                            <Badge className={cn(
                              "text-[8px] px-1 py-0.5 border-0 font-bold",
                              msg.mode === "analyst" ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                                : msg.mode === "writer" ? "bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400"
                                  : "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                            )}>
                              {msg.mode}
                            </Badge>
                          )}
                        </span>
                        {msg.role === "assistant" && (
                          <button
                            onClick={() => handleCopyMessage(msg.content, idx)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Copy response"
                          >
                            {copiedIdx === idx ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>

                      <div className="text-slate-800 dark:text-slate-250 leading-normal">
                        {msg.role === "user" ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        ) : (
                          <div className="space-y-1">{parseAssistantMessage(msg.content)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Streaming indicator */}
                {(loading || isStreaming) && (
                  <div className="flex items-start gap-4 pb-6">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center border flex-shrink-0",
                      mode === "writer" ? "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-100/40 dark:border-violet-900/50"
                        : mode === "planner" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/40 dark:border-emerald-900/50"
                          : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/40 dark:border-indigo-900/50"
                    )}>
                      {loading && !isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className="flex-grow space-y-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100">AI Hub</span>
                      {isStreaming && streamingContent ? (
                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {streamingContent}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-1">
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <div key={i} className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                mode === "analyst" ? "bg-indigo-400" : mode === "writer" ? "bg-violet-400" : "bg-emerald-400",
                                "animate-bounce"
                              )}
                                style={{ animationDelay: `${i * 0.15}s` }}
                              />
                            ))}
                          </div>
                          <span>
                            {mode === "analyst" ? "Analyzing data..." : mode === "writer" ? "Writing..." : "Planning..."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-6 pb-6 pt-2 bg-gradient-to-t from-white via-white dark:from-slate-950 dark:via-slate-950 to-transparent">
            <div className="max-w-3xl mx-auto w-full">
              <div className={cn(
                "rounded-2xl border bg-white dark:bg-slate-900 shadow-sm focus-within:ring-1 transition-all p-2.5 flex items-end gap-2",
                mode === "analyst" ? "border-slate-200 dark:border-slate-800 focus-within:ring-indigo-300 dark:focus-within:ring-indigo-800"
                  : mode === "writer" ? "border-slate-200 dark:border-slate-800 focus-within:ring-violet-300 dark:focus-within:ring-violet-800"
                    : "border-slate-200 dark:border-slate-800 focus-within:ring-emerald-300 dark:focus-within:ring-emerald-800"
              )}>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === "analyst"
                      ? "Ask about team performance, tasks, or insights..."
                      : mode === "writer"
                        ? "Ask me to write a report, email, or document..."
                        : "Ask about sprint planning, priorities, or risks..."
                  }
                  className="min-h-[44px] max-h-[160px] resize-none text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1 bg-transparent flex-grow text-slate-800 dark:text-slate-100"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                  }}
                  disabled={loading}
                />
                <Button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || loading}
                  className={cn(
                    "rounded-xl h-9 w-9 p-0 flex items-center justify-center flex-shrink-0",
                    mode === "analyst" ? "bg-indigo-600 hover:bg-indigo-700"
                      : mode === "writer" ? "bg-violet-600 hover:bg-violet-700"
                        : "bg-emerald-600 hover:bg-emerald-700",
                    "text-white"
                  )}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex justify-between items-center px-2.5 mt-2 text-[9px] text-slate-400 dark:text-slate-500 select-none">
                <span>Enter to send · Shift+Enter for newline</span>
                <span className="flex items-center gap-1 font-mono">
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    loading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                  )} />
                  {loading ? (isStreaming ? "Streaming..." : "Thinking...") : "Ready"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
