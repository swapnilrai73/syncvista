"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, RefreshCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerVectorSync } from "@/lib/actions/ai.actions";

interface Message {
  sender: "user" | "assistant";
  text: string;
}

const SUGGESTED_QUERIES = [
  "What is my net worth?",
  "Show Amazon transactions",
  "Analyze monthly cash flow",
];

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: "assistant", text: "Hello! I am your SyncVista Assistant. Ask me anything about your balances, spending habits, or investment portfolio." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSync = async () => {
    setSyncing(true);
    const res = await triggerVectorSync();
    setSyncing(false);
    if (res.success) {
      setMessages((prev) => [
        ...prev,
        { sender: "assistant", text: `Data synced successfully! Indexed ${res.count} financial records.` },
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

    const newMessages: Message[] = [...messages, { sender: "user", text: query }];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Map messages to array expected by multi-turn API route
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.sender,
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { sender: "assistant", text: data.reply || data.content }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "assistant", text: `Error: ${data.error || "Failed to get response."}` },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "assistant", text: "Something went wrong while contacting the AI server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-bankGradient shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Bot className="w-7 h-7 text-white" />
        </Button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-bankGradient p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold text-sm">SyncVista AI Advisor</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSync}
                disabled={syncing}
                title="Sync Financial Data to Pinecone"
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
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm whitespace-pre-wrap ${
                    m.sender === "user"
                      ? "bg-bank-gradient text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 border border-gray-100 rounded-2xl rounded-bl-none px-3.5 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing financial context...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Query Chips */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar">
  {SUGGESTED_QUERIES.map((chip, i) => {
    // Ensure chip is stringified safely so accessibility tree nodes never evaluate to empty/null
    const queryText = typeof chip === "string" ? chip : String(chip || "");

    return (
      <button
        key={i}
        type="button"
        onClick={() => handleSend(queryText)}
        aria-label={queryText}
        className="whitespace-nowrap text-[11px] bg-white border border-gray-200 px-2.5 py-1 rounded-full text-gray-600 hover:bg-blue-50 hover:border-blue-300 transition"
      >
        <span className="pointer-events-none">{queryText}</span>
      </button>
    );
  })}
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