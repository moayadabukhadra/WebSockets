export interface User {
  username: string;
  socketId: string;
  score: number;
  isDrawing: boolean;
}

export interface GameState {
  currentWord: string | null;
  timeLeft: number;
  isDrawer: boolean;
  users: User[];
} 