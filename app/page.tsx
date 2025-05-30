import { ConversationProvider } from '@/lib/context/ConversationContext';
import { ChatInterface } from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">AI Travel Planner</h1>
          <p className="mt-2 text-muted-foreground">
            Your personal travel planning assistant. Let's plan your perfect trip!
          </p>
        </div>
        
        <ConversationProvider>
          <ChatInterface />
        </ConversationProvider>
      </div>
    </main>
  );
}
