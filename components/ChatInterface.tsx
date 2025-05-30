"use client";

import { useState, useRef, useEffect } from "react";
import { useConversation, Message } from "@/lib/context/ConversationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ApiError {
  error: string;
  message?: string;
  details?: any;
}

export function ChatInterface() {
  const { messages, addMessage, userInfo } = useConversation();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Add user message
    addMessage({ role: "user", content: input });
    setInput("");

    try {
      // Prepare context for the API
      const context = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        userInfo,
      };

      // Call API to get AI response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to get response");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      addMessage({ role: "assistant", content: data.message });
    } catch (error: any) {
      console.error("Chat error:", error);

      // Handle specific error cases
      let errorMessage =
        "I apologize, but I encountered an error. Please try again.";
      let errorDetails: ApiError = {
        error: "Unknown error",
      };

      if (error.message) {
        if (error.message.includes("API key")) {
          errorMessage =
            "There's an issue with the AI service configuration. Please contact support.";
          errorDetails = {
            error: "Configuration Error",
            message: "API key is not properly configured",
          };
        } else if (error.message.includes("Rate limit")) {
          errorMessage =
            "The AI service is currently busy. Please try again in a few moments.";
          errorDetails = {
            error: "Rate Limit Exceeded",
            message: "Too many requests, please wait before trying again",
          };
        } else {
          errorDetails = {
            error: "Service Error",
            message: error.message,
          };
        }
      }

      setError(errorDetails);
      addMessage({
        role: "assistant",
        content: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message || error.error}</AlertDescription>
        </Alert>
      )}

      <Card className="flex flex-col h-[calc(100vh_-_200px)] w-full max-w-2xl mx-auto">
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex items-start gap-2 max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="w-8 h-8">
                    <div className="bg-primary text-primary-foreground w-full h-full flex items-center justify-center">
                      {message.role === "user" ? "U" : "AI"}
                    </div>
                  </Avatar>
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {format(message.timestamp, "HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
