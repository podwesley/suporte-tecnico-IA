export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
