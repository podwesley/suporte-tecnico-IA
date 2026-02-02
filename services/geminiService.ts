import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SYSTEM_PROMPT_AGENT_SUPPORT } from "../agents";
import { Message, Role } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  private currentSystemPrompt: string = SYSTEM_PROMPT_AGENT_SUPPORT;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY está ausente nas variáveis de ambiente.");
      throw new Error("API_KEY está ausente nas variáveis de ambiente.");
    }
    // Initialize with the API key from environment variables
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  public initializeChat(systemPrompt: string = SYSTEM_PROMPT_AGENT_SUPPORT): void {
    this.currentSystemPrompt = systemPrompt;
    try {
      this.chatSession = this.ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: this.currentSystemPrompt,
          temperature: 0.2, 
        },
      });
    } catch (error) {
      console.error("Falhou em iniciar a sessão de chat:", error);
      throw `Falhou em iniciar a sessão de chat: ${error}`;
    }
  }

  public resetSession(systemPrompt: string = SYSTEM_PROMPT_AGENT_SUPPORT): void {
    this.chatSession = null;
    this.initializeChat(systemPrompt);
  }

  public async resumeSession(previousMessages: Message[], systemPrompt: string = SYSTEM_PROMPT_AGENT_SUPPORT): Promise<void> {
    this.currentSystemPrompt = systemPrompt;
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
            systemInstruction: this.currentSystemPrompt,
            temperature: 0.2,
        },
        history: history as any // Type assertion needed sometimes depending on exact SDK version types
      });
    } catch (error) {
       console.error("Não retomou a sessão:", error);
       // Fallback to fresh session if history fails
       this.initializeChat(this.currentSystemPrompt);
      throw `Não retomou a sessão: ${error}`;
    }
  }

  public async sendMessageStream(
    message: string, 
    onChunk: (text: string) => void
  ): Promise<string> {
    if (!this.chatSession) {
      this.initializeChat(this.currentSystemPrompt);
    }

    if (!this.chatSession) {
        throw new Error("A sessão de chat não pôde ser iniciada.");
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
      console.error("Mensagem de erro enviando para Gêmeos:", error);
      throw `Mensagem de erro enviando para Gemini: ${error}`;
    }
  }
}

export const geminiService = new GeminiService();
