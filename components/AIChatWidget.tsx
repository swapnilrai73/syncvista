"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Send, RefreshCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerVectorSync } from "@/lib/actions/ai.actions";

interface Message {
  sender: "user" | "assistant";
  text: string;
}

interface AIChatWidgetProps {
  userId: string;
}

const SUGGESTED_QUERIES = [
  "What is my net worth?",
  "Show Amazon transactions",
  "Analyze monthly cash flow",
];

const AUTH_ROUTES = ["/sign-in", "/sign-up", "/login", "/register", "/auth"];

export default function AIChatWidget({ userId }: AIChatWidgetProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "assistant",
      text: "Hello! I am your SyncVista Assistant. Ask me anything about your balances, spending habits, or financial performance.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Dynamic resizing state
  const [dimensions, setDimensions] = useState({ width: 400, height: 540 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number }>({
    startX: 0,
    startY: 0,
    startW: 400,
    startH: 540,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname?.startsWith(route));

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Handle Drag Resizing from Top-Left Corner
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: dimensions.width,
      startH: dimensions.height,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaX = resizeRef.current.startX - e.clientX;
      const deltaY = resizeRef.current.startY - e.clientY;

      const newWidth = Math.min(Math.max(resizeRef.current.startW + deltaX, 340), 850);
      const newHeight = Math.min(Math.max(resizeRef.current.startH + deltaY, 420), 850);

      setDimensions({ width: newWidth, height: newHeight });
    },
    [isResizing]
  );

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, handleMouseMove, stopResizing]);

  if (isAuthRoute) return null;

  const handleSync = async () => {
    setSyncing(true);
    const res = await triggerVectorSync();
    setSyncing(false);

    if (res.success) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: `Financial context synced successfully! Indexed ${res.count} records.`,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { sender: "assistant", text: `Sync failed: ${res.error}` },
      ]);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    // 1. Append user message & clear input
    const updatedMessages: Message[] = [...messages, { sender: "user", text: query }];
    setMessages(updatedMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    // 2. Append empty assistant message placeholder for streaming
    setMessages((prev) => [...prev, { sender: "assistant", text: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          pathname,
          messages: updatedMessages.map((m) => ({
            role: m.sender,
            content: m.text,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received from server.");
      }

      // 3. Read stream and update response in real-time
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;

        setMessages((prev) => {
          const newArr = [...prev];
          newArr[newArr.length - 1] = {
            sender: "assistant",
            text: assistantText,
          };
          return newArr;
        });
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = {
          sender: "assistant",
          text: `Error: ${err.message || "Failed to generate analysis."}`,
        };
        return newArr;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-bankGradient shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Bot className="w-7 h-7 text-white" />
        </Button>
      )}

      {isOpen && (
        <div
          style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
          className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-shadow"
        >
          {/* Top-Left Corner Resize Hitbox (Invisible, Clean Cursor) */}
          <div
            onMouseDown={startResizing}
            className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-50 group flex items-center justify-center"
            title="Drag top-left corner to resize"
          >
            <div className="w-2 h-2 rounded-full bg-white/30 group-hover:bg-white/80 transition-colors" />
          </div>

          {/* Header */}
          <div className="bg-bankGradient p-4 text-white flex items-center justify-between pl-7">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="font-semibold text-sm leading-tight">SyncVista AI Advisor</span>
                <span className="text-[10px] text-white/80">Active Route: {pathname}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSync}
                disabled={syncing}
                title="Refresh Context"
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm whitespace-pre-wrap ${
                    m.sender === "user"
                      ? "bg-bank-gradient text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                  }`}
                >
                  {m.text || (loading && idx === messages.length - 1 ? "..." : "")}
                </div>
              </div>
            ))}
            {loading && !messages[messages.length - 1]?.text && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 border border-gray-100 rounded-2xl rounded-bl-none px-3.5 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Streaming financial analysis...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Query Chips */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar">
            {SUGGESTED_QUERIES.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(chip)}
                className="whitespace-nowrap text-[11px] bg-white border border-gray-200 px-2.5 py-1 rounded-full text-gray-600 hover:bg-blue-50 hover:border-blue-300 transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about spending, balance..."
              className="text-xs h-9 bg-gray-50 border-gray-200"
            />
            <Button
              onClick={() => handleSend()}
              disabled={loading}
              className="h-9 w-9 p-0 bg-bankGradient"
            >
              <Send className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}