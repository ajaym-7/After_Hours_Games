export type Audience = 'close-friends' | 'mixed-group' | 'new-people';
export type Spice = 'chill' | 'spicy' | 'wild';
export type DrinkMode = 'drink' | 'no-drink';
export type Ceiling = 'suggestive' | 'explicit';
export type Language = 'en' | 'hi';
export type CardType = 'confession' | 'story' | 'act' | 'dare' | 'drink' | 'group-challenge';

export interface SessionCard {
  type: CardType;
  promptEn: string;
  promptHi: string;
  skipPenaltyEn: string;
  skipPenaltyHi: string;
  durationSeconds: number;
}

export interface SessionSettings {
  audience: Audience;
  spice: Spice;
  drinkMode: DrinkMode;
  ceiling: Ceiling;
  playerCount: number;
  turnsPerPlayer: number;
  playerNames: string[];
}

export interface SessionPack {
  cards: SessionCard[];
  generatedAt: string;
  mode: DrinkMode;
}

export interface SavedSession {
  settings: SessionSettings;
  pack: SessionPack;
  turn: number;
  language: Language;
  completed: boolean[];
  skipped: boolean[];
  favoriteIndex: number | null;
  screen: 'playing' | 'vote' | 'result';
}
