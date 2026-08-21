"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Folder,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Music,
  Search,
  X,
  Download,
  ExternalLink,
  Copy,
  Check,
  Play,
  Film,
  File,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Loader2,
  Calendar,
  User,
  Eye,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SharedContentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  channelId?: string;
  receiverId?: string;
  recipientName?: string;
  channelName?: string;
  onItemClick?: (messageId: string) => void;
}

export function SharedContentPanel({
  isOpen,
  onClose,
  channelId,
  receiverId,
  recipientName,
  channelName,
  onItemClick,
}: SharedContentPanelProps) {
  const [activeTab, setActiveTab] = useState<"media" | "docs" | "links" | "audio">("media");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({
    counts: { media: 0, docs: 0, links: 0, audio: 0, total: 0 },
    media: [],
    docs: [],
    links: [],
    audio: [],
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<any | null>(null);

  // Fetch shared media content when panel opens or filter changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchSharedContent() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (channelId) queryParams.set("channelId", channelId);
        if (receiverId) queryParams.set("receiverId", receiverId);
        if (searchQuery.trim()) queryParams.set("q", searchQuery.trim());

        const res = await fetch(`/api/messages/shared?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch shared content");
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        console.error("Error fetching shared media:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchSharedContent();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, channelId, receiverId, searchQuery]);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFileIcon = (fileName: string = "", fileType: string = "") => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const type = fileType.toLowerCase();

    if (ext === "pdf" || type.includes("pdf")) {
      return <FileText className="h-6 w-6 text-rose-500" />;
    }
    if (["xls", "xlsx", "csv"].includes(ext) || type.includes("spreadsheet") || type.includes("excel")) {
      return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || type.includes("zip") || type.includes("compressed")) {
      return <FileArchive className="h-6 w-6 text-amber-500" />;
    }
    if (["js", "ts", "json", "html", "css", "py"].includes(ext) || type.includes("code")) {
      return <FileCode className="h-6 w-6 text-indigo-500" />;
    }
    return <File className="h-6 w-6 text-blue-500" />;
  };

  const isVideo = (fileType: string = "", fileName: string = "") => {
    return (
      fileType.toLowerCase().startsWith("video/") ||
      /\.(mp4|webm|mov|mkv|avi)$/i.test(fileName.toLowerCase())
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden max-w-2xl sm:max-w-3xl w-[95vw] [&>button]:hidden">
          {/* Header */}
          <DialogHeader className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  Media, Docs & Links
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {channelName ? `#${channelName}` : recipientName ? recipientName : "Shared Conversation Content"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search file name, link..."
                  className="h-9 pl-9 pr-8 rounded-2xl text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Explicit Header Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors shrink-0"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          {/* Main Content Tabs */}
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
              <TabsList className="grid grid-cols-4 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <TabsTrigger
                  value="media"
                  className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 shadow-2xs transition-all flex items-center justify-center gap-1.5"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Media
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 rounded-full font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {data.counts?.media || 0}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="docs"
                  className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 shadow-2xs transition-all flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Docs
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 rounded-full font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {data.counts?.docs || 0}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="links"
                  className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 shadow-2xs transition-all flex items-center justify-center gap-1.5"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Links
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 rounded-full font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {data.counts?.links || 0}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="audio"
                  className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 shadow-2xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Music className="h-3.5 w-3.5" />
                  Audio
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 rounded-full font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {data.counts?.audio || 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Loader */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Loading shared content...
                  </p>
                </div>
              ) : (
                <>
                  {/* MEDIA TAB CONTENT */}
                  <TabsContent value="media" className="mt-4">
                    {data.media?.length === 0 ? (
                      <EmptyState
                        icon={ImageIcon}
                        title="No Shared Media"
                        description="Photos and videos shared in this chat will appear here."
                      />
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {data.media.map((item: any) => {
                          const isVid = isVideo(item.fileType, item.fileName);
                          return (
                            <div
                              key={item.id}
                              onClick={() => setPreviewMedia(item)}
                              className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-900 cursor-pointer shadow-xs hover:shadow-md transition-all"
                            >
                              {isVid ? (
                                <video
                                  src={item.fileUrl}
                                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <img
                                  src={item.fileUrl}
                                  alt={item.fileName}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              )}

                              {/* Play badge for video */}
                              {isVid && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div className="p-2.5 rounded-full bg-white/90 text-indigo-600 shadow-lg backdrop-blur-xs">
                                    <Play className="h-5 w-5 fill-current ml-0.5" />
                                  </div>
                                </div>
                              )}

                              {/* Hover Gradient Overlay with Info */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                                <p className="text-xs font-bold truncate">{item.fileName}</p>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-300">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={item.sender?.image} />
                                    <AvatarFallback className="text-[8px] bg-indigo-600 text-white">
                                      {item.sender?.name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate">{item.sender?.name}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* DOCUMENTS TAB CONTENT */}
                  <TabsContent value="docs" className="mt-4 space-y-2.5">
                    {data.docs?.length === 0 ? (
                      <EmptyState
                        icon={FileText}
                        title="No Shared Documents"
                        description="PDFs, Word documents, spreadsheets, and ZIP files will appear here."
                      />
                    ) : (
                      data.docs.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs shrink-0">
                              {getFileIcon(doc.fileName, doc.fileType)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                {doc.fileName}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                {doc.fileSize && (
                                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 h-4">
                                    {doc.fileSize}
                                  </Badge>
                                )}
                                <span className="flex items-center gap-1 font-medium">
                                  <User className="h-3 w-3" />
                                  {doc.sender?.name}
                                </span>
                                <span>•</span>
                                <span className="font-medium">
                                  {format(new Date(doc.createdAt), "MMM d, yyyy h:mm a")}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={doc.fileName}
                            >
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 shadow-2xs gap-1"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* LINKS TAB CONTENT */}
                  <TabsContent value="links" className="mt-4 space-y-2.5">
                    {data.links?.length === 0 ? (
                      <EmptyState
                        icon={LinkIcon}
                        title="No Shared Links"
                        description="URLs and web links shared in text messages will appear here."
                      />
                    ) : (
                      data.links.map((link: any) => (
                        <div
                          key={link.id}
                          className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs shrink-0 mt-0.5">
                              <LinkIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold px-2 py-0.5 border border-indigo-200 dark:border-indigo-800">
                                  {link.domain}
                                </Badge>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {format(new Date(link.createdAt), "MMM d, h:mm a")}
                                </span>
                              </div>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline break-all block"
                              >
                                {link.url}
                              </a>
                              {link.context && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 italic bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                  "{link.context}"
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={link.sender?.image} />
                                  <AvatarFallback className="text-[8px] bg-indigo-600 text-white">
                                    {link.sender?.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>Shared by {link.sender?.name}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleCopyLink(link.url, link.id)}
                              className="h-8 w-8 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                              title="Copy link"
                            >
                              {copiedId === link.id ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <a href={link.url} target="_blank" rel="noreferrer">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* AUDIO TAB CONTENT */}
                  <TabsContent value="audio" className="mt-4 space-y-2.5">
                    {data.audio?.length === 0 ? (
                      <EmptyState
                        icon={Music}
                        title="No Shared Audio"
                        description="Voice notes and audio files shared in this chat will appear here."
                      />
                    ) : (
                      data.audio.map((aud: any) => (
                        <div
                          key={aud.id}
                          className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <Music className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                                  {aud.fileName || "Audio File"}
                                </h4>
                                <p className="text-[10px] text-slate-500">
                                  Shared by {aud.sender?.name} • {format(new Date(aud.createdAt), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>

                            <a href={aud.fileUrl} download={aud.fileName} target="_blank" rel="noreferrer">
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          </div>

                          <audio controls className="w-full h-8 rounded-lg text-xs" src={aud.fileUrl} />
                        </div>
                      ))
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox / Preview Modal for Media */}
      {previewMedia && (
        <Dialog open={Boolean(previewMedia)} onOpenChange={() => setPreviewMedia(null)}>
          <DialogContent className="rounded-3xl bg-black/95 text-white border-slate-800 p-0 overflow-hidden max-w-4xl w-[95vw]">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={previewMedia.sender?.image} />
                  <AvatarFallback className="text-[9px] bg-indigo-600 text-white">
                    {previewMedia.sender?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-bold">{previewMedia.sender?.name}</span>
                <span className="text-[11px] text-slate-400">•</span>
                <span className="text-[11px] text-slate-400">
                  {format(new Date(previewMedia.createdAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a href={previewMedia.fileUrl} target="_blank" rel="noreferrer" download={previewMedia.fileName}>
                  <Button size="sm" variant="secondary" className="h-8 rounded-xl text-xs gap-1 bg-white/10 hover:bg-white/20 text-white border-0">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </a>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-hidden bg-black">
              {isVideo(previewMedia.fileType, previewMedia.fileName) ? (
                <video src={previewMedia.fileUrl} controls autoPlay className="max-h-[70vh] max-w-full rounded-2xl shadow-2xl" />
              ) : (
                <img src={previewMedia.fileUrl} alt={previewMedia.fileName} className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
      <div className="p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3 shadow-2xs">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">{description}</p>
    </div>
  );
}
