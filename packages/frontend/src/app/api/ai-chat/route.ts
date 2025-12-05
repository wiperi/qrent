/**
 * AI 聊天 API 路由
 * Next.js API 端点，接收用户消息和历史记录，调用 Google Gemini AI 生成回复，支持多个模型降级重试
 */
import { GoogleGenAI, ListModelsResponse, Models } from '@google/genai';
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
    const prompt = `You are a helpful AI assistant for QRent, a rental property platform for international students in Australia. Your role is to help students find suitable housing and give them guidence. 

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n\n` : ''}User: ${message}

Please provide a helpful and friendly response:`;

    const models = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite-001',
      'gemini-2.0-flash-exp',
      'learnlm-2.0-flash-experimental',
    ];

    for (const model of models) {
      try {
        const result = await genAI.models.generateContent({
          model: model,
          contents: prompt,
        });
        const aiResponse = result.text;
        if (aiResponse) {
          return NextResponse.json({ message: aiResponse });
        }
      } catch (error) {
        console.warn(`Model ${model} failed:`, error);
        // Try the next model
      }
    }
    throw new Error('All models failed to generate a response');
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
}
