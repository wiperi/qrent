import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body as {
      message: string;
      history: Message[];
    };

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // TODO: Replace this with your actual AI model API call
    // Example with OpenAI:
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [
    //     { role: "system", content: "You are a helpful assistant for a rental property platform." },
    //     ...history.map(msg => ({ role: msg.role, content: msg.content })),
    //     { role: "user", content: message }
    //   ],
    // });
    // const aiResponse = completion.choices[0].message.content;

    // For now, using a mock response
    const aiResponse = await getMockAIResponse(message);

    return NextResponse.json({ message: aiResponse });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Mock AI response function - replace with actual AI integration
async function getMockAIResponse(message: string): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm here to help you find the perfect rental property. What are you looking for?";
  }

  if (lowerMessage.includes('rent') || lowerMessage.includes('property')) {
    return 'I can help you find rental properties. Could you tell me more about your preferences? For example, what area are you interested in, your budget, and any specific requirements?';
  }

  if (lowerMessage.includes('price') || lowerMessage.includes('budget')) {
    return "Understanding your budget is important. What's your weekly or monthly rental budget? I can help you find properties within your price range.";
  }

  if (lowerMessage.includes('location') || lowerMessage.includes('area')) {
    return 'Location is key! Which suburbs or areas are you interested in? I can help you find properties near universities, public transport, or other amenities.';
  }

  return "Thank you for your message. I'm an AI assistant here to help you with your rental property search. Could you provide more details about what you're looking for?";
}
