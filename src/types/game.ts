export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  powerUps: PowerUps;
}

export interface PowerUps {
  timeBonus: number;
  revealLetter: number;
  clearCanvas: number;
}

export interface GameState {
  currentWord: string;
  timeLeft: number;
  roundNumber: number;
  totalRounds: number;
  drawer: string | null;
  isDrawing: boolean;
  isGameOver: boolean;
  finalScores: FinalScore[];
  wordHints: string[];
  powerUps: PowerUps;
  revealedLetters: Set<number>;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  players: Player[];
  gameState: GameState;
  host: string;
  settings: GameSettings;
  timer: NodeJS.Timeout | null;
}

export interface GameSettings {
  totalRounds: number;
}

export interface FinalScore {
  name: string;
  score: number;
}

export interface PlayerPowerUps {
  id: string;
  powerUps: PowerUps;
}

export interface GameStartData {
  word?: string;
  timeLeft?: number;
  roundNumber?: number;
  totalRounds?: number;
  drawer?: string;
  drawerName: string;
  players?: PlayerPowerUps[];
}

export interface RoundChangeData {
  roundNumber: number;
  totalRounds: number;
  players?: PlayerPowerUps[];
}

export interface GameOverData {
  winner: FinalScore;
  finalScores: FinalScore[];
  players?: PlayerPowerUps[];
}

export interface PowerUpUsedData {
  type: keyof PowerUps;
  playerId: string;
  powerUps: PowerUps;
}

export interface DrawData {
  x: number;
  y: number;
  color: string;
  brushSize: number;
  tool: string;
  type: 'start' | 'draw' | 'end';
  points?: { x: number; y: number }[];
} 