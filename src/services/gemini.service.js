import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/database.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const processGeminiMessage = async (chatroomId, messageId, content) => {
  try {
    // Get chat history
    const messages = await prisma.message.findMany({
      where: { chatroomId },
      orderBy: { createdAt: 'asc' },
      take: 10 // Last 10 messages for context
    });

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Build conversation history
    const history = messages.map(msg => ({
      role: msg.role === 'USER' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Start chat with history
    const chat = model.startChat({ history });

    // Send message and get response
    const result = await chat.sendMessage(content);
    const response = await result.response;
    const responseText = response.text();

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        chatroomId,
        content: responseText,
        role: 'ASSISTANT'
      }
    });

    // Update chatroom's updatedAt
    await prisma.chatroom.update({
      where: { id: chatroomId },
      data: { updatedAt: new Date() }
    });

    return assistantMessage;
  } catch (error ){
    console.error('Gemini processing error:', error);
    
    // Save error message
    await prisma.message.create({
      data: {
        chatroomId,
        content: 'Sorry, I encountered an error processing your message.',
        role: 'ASSISTANT'
      }
    });
    
    throw error;
  }
};
