"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { z } from "zod";

// Define the message schema
export const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.date(),
});

export type Message = z.infer<typeof MessageSchema>;

// Define the user information schema
export const UserInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  from: z.string().min(1, "Source location is required"),
  to: z.string().min(1, "Destination is required"),
  travelDates: z.object({
    start: z.date(),
    end: z.date(),
  }),
  duration: z.number().min(1, "Duration must be at least 1 day"),
  budget: z.number().min(0, "Budget must be positive"),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

interface ConversationContextType {
  messages: Message[];
  userInfo: Partial<UserInfo>;
  addMessage: (message: Omit<Message, "timestamp">) => void;
  updateUserInfo: (info: Partial<UserInfo>) => void;
  isComplete: boolean;
  setIsComplete: (complete: boolean) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined
);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInfo, setUserInfo] = useState<Partial<UserInfo>>({});
  const [isComplete, setIsComplete] = useState(false);

  const addMessage = (message: Omit<Message, "timestamp">) => {
    setMessages((prev) => [...prev, { ...message, timestamp: new Date() }]);
  };

  const updateUserInfo = (info: Partial<UserInfo>) => {
    setUserInfo((prev) => ({ ...prev, ...info }));
  };

  return (
    <ConversationContext.Provider
      value={{
        messages,
        userInfo,
        addMessage,
        updateUserInfo,
        isComplete,
        setIsComplete,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error(
      "useConversation must be used within a ConversationProvider"
    );
  }
  return context;
}
