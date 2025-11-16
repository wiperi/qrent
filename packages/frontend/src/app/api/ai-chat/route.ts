import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body as {
      message: string;
      history: Message[];
    };

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json({ error: 'AI service is not configured' }, { status: 500 });
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Build conversation history
    const conversationHistory = history
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Create the prompt with system context and conversation history
    const prompt = `You are a helpful AI assistant for QRent, a rental property platform for international students in Australia. Your role is to help students find suitable housing by understanding their needs regarding commute time, budget, and location preferences.

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n\n` : ''}User: ${message}

Please provide a helpful and friendly response:`;

    // Generate response (using default model to avoid rate limits)
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const aiResponse = result.text;

    if (!aiResponse) {
      console.error('No response generated from Gemini');
      return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
    }

    return NextResponse.json({ message: aiResponse });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
}
