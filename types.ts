
export enum GameState {
  IDLE = 'IDLE',
  REVEAL = 'REVEAL',
  SHUFFLING = 'SHUFFLING',
  PICKING = 'PICKING',
  RESULT = 'RESULT'
}

export interface CupData {
  id: number;
  positionIndex: number; // 0 (Left), 1 (Center), 2 (Right)
}

export const POSITIONS = [-2.2, 0, 2.2]; // X coordinates for the 3 slots
export const TABLE_Y = 0;
export const HOVER_HEIGHT = 0.5;
export const REVEAL_HEIGHT = 1.5;

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
