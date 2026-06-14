/**
 * Types defining the state and models for the Brazil-Paraguay Grand Strategy game.
 */

export type Country = 'Brasil' | 'Paraguai';

export type ResourceType = 'money' | 'steel' | 'oil' | 'food';

export interface ResourceState {
  money: number;  // em bilhões de R$ / Gs.
  steel: number;  // em megatoneladas
  oil: number;    // em barris/fluxo
  food: number;   // suprimento alimentar
}

export type MilitaryUnitType = 'infantry' | 'artillery' | 'tanks';

export interface UnitState {
  infantry: number;
  artillery: number;
  tanks: number;
}

export type BuildingType = 'industrial' | 'refinery' | 'fortress' | 'logistics';

export interface Province {
  id: string;
  name: string;
  country: Country;
  controller: Country;
  resources: ResourceState;
  buildings: {
    industrial: number; // Gera Dinheiro e Aço
    refinery: number;   // Gera Petróleo
    fortress: number;   // Defesa de Combate
    logistics: number;  // Reduz desgaste e aumenta suprimentos
  };
  armies: UnitState;
  connections: string[]; // IDs das províncias conectadas para movimento/ataque
  coordinates: { x: number; y: number }; // Centro da província para renderização
  points?: string; // Coordenadas poligonais simplificadas para o mapa SVG
}

export interface EventChoice {
  text: string;
  description: string;
  effects: {
    resources?: Partial<ResourceState>;
    popularity?: number; // impacto na popularidade do presidente (-100 a 100)
    stability?: number;  // estabilidade da nação
    spawnTroops?: { provinceId: string; unit: MilitaryUnitType; count: number }[];
  };
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

export interface GameState {
  turn: number;
  selectedProvinceId: string | null;
  targetProvinceId: string | null;
  playerCountry: Country;
  popularity: number; // 0 - 100%
  stability: number;  // 0 - 100%
  allianceSupport: number; // Apoio externo diplomatico 0-100%
  resources: ResourceState;
  provinces: Record<string, Province>;
  activeEvent: GameEvent | null;
  logs: string[];
  gamePhase: 'start' | 'playing' | 'win' | 'loss';
  customEventLoading: boolean;
  // State for quality-of-life features
  isSoundMuted?: boolean;
  foreignAidCooldown?: number;
  autoTurnInterval?: boolean;
  previousDecisions?: string[];
  weather?: 'clear' | 'rain' | 'mud' | 'fog';
  customNames?: Record<string, string>;
  unlockedAchievements?: string[];
  warTaxRate?: 0 | 1 | 2 | 3; // 0=normal, 1=leve, 2=pesado, 3=guerra total
  aviation?: number;           // esquadrões de aviação (ativo nacional)
}

export const UNIT_COSTS: Record<MilitaryUnitType, ResourceState> = {
  infantry: { money: 10, steel: 2, oil: 1, food: 3 },
  artillery: { money: 20, steel: 8, oil: 2, food: 2 },
  tanks: { money: 40, steel: 15, oil: 6, food: 1 },
};

// Manutenção por turno (dinheiro) de edifícios e tropas
export const BUILDING_MAINTENANCE: Record<BuildingType, number> = {
  industrial: 5,   // por nível
  refinery:   4,
  fortress:   2,
  logistics:  3,
};

export const TROOP_MAINTENANCE = {
  infantry:  (n: number) => Math.floor(n / 3),       // 1 moeda a cada 3 soldados
  artillery: (n: number) => n * 2,
  tanks:     (n: number) => n * 3,
};

export const MAX_BUILDING_LEVEL = 3;

export const BUILDING_COSTS: Record<BuildingType, ResourceState> = {
  industrial: { money: 50, steel: 10, oil: 5, food: 5 },
  refinery: { money: 60, steel: 15, oil: 5, food: 2 },
  fortress: { money: 40, steel: 20, oil: 2, food: 2 },
  logistics: { money: 30, steel: 8, oil: 4, food: 6 },
};

export const UNIT_STATS = {
  infantry: { attack: 2, defense: 3, speed: 1, name: 'Infantaria' },
  artillery: { attack: 5, defense: 2, speed: 0.8, name: 'Artilharia' },
  tanks: { attack: 8, defense: 6, speed: 1.5, name: 'Blindados' },
};
