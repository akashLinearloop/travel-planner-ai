import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { z } from 'zod';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Define the system prompt that enforces travel domain focus
const SYSTEM_PROMPT = `You are a travel planning assistant. Your role is to help users plan their trips by:
1. Collecting necessary information (name, email, source, destination, dates, duration, budget)
2. Maintaining conversation context
3. Staying strictly within the travel domain
4. Refusing to answer non-travel related queries
5. Generating detailed travel itineraries

If asked about anything not related to travel, respond with: "I'm here to help only with travel planning."

Current conversation context:
`;

// Schema for the request body
const RequestSchema = z.object({
  message: z.string(),
  context: z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })),
    userInfo: z.record(z.any()).optional(),
  }).optional(),
});

export async function POST(req: Request) {
  try {
    // Validate API key
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate request schema
    let validatedData;
    try {
      validatedData = RequestSchema.parse(body);
    } catch (e) {
      console.error('Request validation error:', e);
      return NextResponse.json(
        { error: 'Invalid request format', details: e },
        { status: 400 }
      );
    }

    const { message, context } = validatedData;

    // Prepare conversation history with proper typing
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(context?.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })) || []),
      { role: 'user', content: message },
    ];

    // Call Groq API with error handling
    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      });
    } catch (e: any) {
      console.error('Groq API error:', {
        status: e.status,
        message: e.message,
        type: e.type,
        code: e.code,
      });
      
      // Handle specific Groq API errors
      if (e.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      if (e.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'AI service error', details: e.message },
        { status: 500 }
      );
    }

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      console.error('No response content from Groq API');
      return NextResponse.json(
        { error: 'Empty response from AI service' },
        { status: 500 }
      );
    }

    // Check if the response is out of domain
    if (response.toLowerCase().includes("i'm here to help only with travel planning")) {
      return NextResponse.json({ message: response });
    }

    // Extract and validate any user information from the response
    const userInfoMatch = response.match(/User Information:\s*([\s\S]*?)(?=\n\n|$)/);
    if (userInfoMatch) {
      console.log('Extracted user info:', userInfoMatch[1]);
    }

    return NextResponse.json({ message: response });
  } catch (error: any) {
    // Log unexpected errors
    console.error('Unexpected error in chat route:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
} 