export enum GameStatus {
  START = 'START',
  SETUP = 'SETUP',
  CHALLENGE = 'CHALLENGE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  WIN = 'WIN',
}

export type CareerStage = '实习生' | '初级产品经理' | '高级产品经理' | '产品总监' | '首席产品官 (CPO)';

export interface CompanyType {
  id: string;
  name: string;
  description: string;
  cultureTrait: string;
  initialStats: Partial<GameStats>;
  difficulty: '简单' | '普通' | '困难';
}

export interface UserProfile {
  name: string;
  background: string;
  education: string;
  schoolTier: string;
  selectedCompanyId: string;
}

export interface GameStats {
  productQuality: number;
  teamTrust: number;
  stress: number;
  careerProgress: number;
  tenureWeeks: number;
  stage: CareerStage;
}

export interface Choice {
  text: string;
  impact: Partial<Omit<GameStats, 'stage' | 'tenureWeeks'>>;
  feedback: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  choices: Choice[];
}

export interface GameHistoryItem {
  scenario: Scenario;
  choice: Choice;
}
