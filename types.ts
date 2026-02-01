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

export interface CommandHistoryItem {
  id: string;
  command: string;
  timestamp: number;
  output?: string;
}

export interface FavoriteCommand {
  id: string;
  command: string;
  label: string;
  output?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
  commandQueue?: CommandHistoryItem[];
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
