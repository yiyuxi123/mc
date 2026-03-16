import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const chatWithGuide = async (message: string, history: { text: string; sender: 'user' | 'ai' }[]) => {
  try {
    const contents = history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: contents,
      config: {
        systemInstruction: 'You are an AI Guide in a Minecraft-like voxel game called AI Craft. Help the player with crafting recipes, building ideas, or survival tips. Keep responses concise and helpful.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });

    return response.text || 'I am not sure how to answer that.';
  } catch (error) {
    console.error('Chat error:', error);
    return 'Sorry, I am having trouble connecting to my knowledge base right now.';
  }
};

export const analyzeImage = async (base64Image: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType,
              },
            },
            {
              text: 'Analyze this image and suggest how I can build something similar in a voxel game like Minecraft. What blocks should I use? Give me a step-by-step blueprint.',
            },
          ],
        }
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      }
    });
    return response.text || 'I could not analyze this image.';
  } catch (error) {
    console.error('Image analysis error:', error);
    return 'Sorry, I encountered an error while analyzing the image.';
  }
};
