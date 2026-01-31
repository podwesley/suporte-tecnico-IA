import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { Message, Role } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is missing from environment variables.");
    }
    // Initialize with the API key from environment variables
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  public initializeChat(): void {
    try {
      this.chatSession = this.ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.2, 
        },
      });
    } catch (error) {
      console.error("Failed to initialize chat session:", error);
      throw error;
    }
  }

  public resetSession(): void {
    this.chatSession = null;
    this.initializeChat();
  }

  public async resumeSession(previousMessages: Message[]): Promise<void> {
    // Convert application messages to Gemini API history format
    // Filter out error messages or incomplete states if necessary
    const history = previousMessages
      .filter(m => !m.isStreaming)
      .map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    try {
      this.chatSession = this.ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.2,
        },
        history: history as any // Type assertion needed sometimes depending on exact SDK version types
      });
    } catch (error) {
       console.error("Failed to resume session:", error);
       // Fallback to fresh session if history fails
       this.initializeChat();
    }
  }

  public async sendMessageStream(
    message: string, 
    onChunk: (text: string) => void
  ): Promise<string> {
    if (!this.chatSession) {
      this.initializeChat();
    }

    if (!this.chatSession) {
        throw new Error("Chat session could not be initialized.");
    }

    try {
      const result = await this.chatSession.sendMessageStream({ message });
      let fullText = "";

      for await (const chunk of result) {
        const chunkContent = chunk as GenerateContentResponse;
        const text = chunkContent.text;
        if (text) {
          fullText += text;
          onChunk(text);
        }
      }
      return fullText;
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
