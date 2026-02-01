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
  type?: 'command';
  command: string;
  label: string;
  output?: string;
}

export interface FavoriteFolder {
  id: string;
  type: 'folder';
  name: string;
  isOpen: boolean;
  items: FavoriteItem[];
}

export type FavoriteItem = FavoriteCommand | FavoriteFolder;

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
