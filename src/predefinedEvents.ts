import { GameEvent } from './types';

export const PREDEFINED_EVENTS: GameEvent[] = [
  {
    id: 'itaipu_crisis',
    title: 'Crise de Segurança em Itaipu',
    description: 'A Usina Hidrelétrica Binacional de Itaipu, fonte crucial de eletricidade para ambos os países, está operando sob tensão militar extrema. Setores de inteligência alertam sobre possíveis sabotagens que afetariam a rede elétrica e as indústrias petroquímicas.',
    choices: [
      {
        text: 'Militarizar Itaipu Totalmente',
        description: 'Impor controle militar estrito. Garante energia mas afasta apoio internacional por violar soberania de gerenciamento conjunto.',
        effects: {
          resources: { money: -15, steel: 10, oil: -5, food: 0 },
          popularity: 5,
          stability: -5
        }
      },
      {
        text: 'Diplomacia Internacional Coordenada',
        description: 'Solicitar observadores da ONU para patrulhamento conjunto neutro. Aumenta estabilidade e aprovação popular internacional, mas atrasa fluxos industriais imediatos.',
        effects: {
          resources: { money: -5, steel: -5, oil: 5, food: 10 },
          popularity: -10,
          stability: 15
        }
      }
    ]
  },
  {
    id: 'truck_strike',
    title: 'Greve Nacional dos Caminhoneiros',
    description: 'Com o estado de emergência e aumento do preço do combustível por conta do esforço de guerra na fronteira sul, cooperativas de transporte declaram paralisação nacional, bloqueando vias estratégicas de escoamento agrícola.',
    choices: [
      {
        text: 'Ceder às Demandas de Subsídios',
        description: 'Subsidiar pesadamente o diesel de carga. Resgata a popularidade e fluxo de alimentos, mas drena os cofres nacionais e o estoque de petróleo militar.',
        effects: {
          resources: { money: -40, steel: 0, oil: -20, food: 25 },
          popularity: 20,
          stability: 10
        }
      },
      {
        text: 'Intervenção de Força Federal',
        description: 'Usar as forças de segurança para liberar as rodovias principais. Preserva recursos econômicos e petroleiros, mas causa revoltas públicas e séria queda de popularidade.',
        effects: {
          resources: { money: 10, steel: 5, oil: 5, food: -5 },
          popularity: -25,
          stability: -10
        }
      }
    ]
  },
  {
    id: 'chaco_drought',
    title: 'Seca Severa na Bacia do Paraguai',
    description: 'Uma estiagem histórica atinge todo o Chaco e o Pantanal. O transporte fluvial de minérios pela hidrovia Paraguai-Paraná está interrompido e a produção agrícola está em colapso devido à falta de irrigação.',
    choices: [
      {
        text: 'Desviar Recursos de Combate para Ração Humanitária',
        description: 'Focalizar a infantaria no auxílio às populações agrícolas e importação de ração. Aumenta muito o prestígio público, mas limita reservas táticas.',
        effects: {
          resources: { money: -20, steel: -10, oil: 0, food: 40 },
          popularity: 15,
          stability: 10
        }
      },
      {
        text: 'Priorizar Indústrias Metálicas de Defesa',
        description: 'Deixar que os canais fluviais sequem e colocar suprimentos apenas nas áreas extrativistas e nas forjas de blindados.',
        effects: {
          resources: { money: 15, steel: 30, oil: -5, food: -20 },
          popularity: -15,
          stability: -10
        }
      }
    ]
  },
  {
    id: 'un_embargo',
    title: 'Pressão de Embargo Comercial',
    description: 'Organismos bilaterais apontam violações das divisas na guerra e ameaçam sancionar a venda de combustível refinado e componentes bélicos de aço se o conflito não arrefecer.',
    choices: [
      {
        text: 'Buscar Parcerias Alternativas (Mercado Paralelo)',
        description: 'Vender commodities abaixo do preço de mercado para contrabandistas ou nações não-alinhadas. Mantém o fornecimento industrial, mas destrói popularidade internacional.',
        effects: {
          resources: { money: 20, steel: -15, oil: 15, food: -10 },
          popularity: -5,
          stability: 5
        }
      },
      {
        text: 'Comprometer-se com Cessar-Fogo Temporário',
        description: 'Pausar ataques em grande escala e focar na infraestrutura civil própria por alguns meses. Eleva prestígio diplomático, mas irrita o alto comando militar.',
        effects: {
          resources: { money: -10, steel: 5, oil: 5, food: 15 },
          popularity: 10,
          stability: 15
        }
      }
    ]
  },
  {
    id: 'cyber_sabotage',
    title: 'Ataque de Guerra Cibernética',
    description: 'Sistemas eletrônicos das refinarias de petróleo sofrem invasão criminosa por hackers estrangeiros não identificados. Os medidores de fluxo foram alterados e bacias sofrem vazamento.',
    choices: [
      {
        text: 'Isolar Servidores Industriais',
        description: 'Cortar rede elétrica geral das refinarias. Reduz vazamentos de petróleo, mas paralisa a indústria mecânica pesada.',
        effects: {
          resources: { money: -10, steel: -20, oil: -5, food: 0 },
          popularity: -5,
          stability: 10
        }
      },
      {
        text: 'Pagar Equipes de Resgate em Criptoativos',
        description: 'Contratar especialistas mercenários para recuperar senhas. Drena muito capital urgente, mas reativa a planta quase que imediatamente.',
        effects: {
          resources: { money: -35, steel: 5, oil: 20, food: 5 },
          popularity: 10,
          stability: 5
        }
      }
    ]
  },
  {
    id: 'agrarian_revolt',
    title: 'Tensões Agrárias na Fronteira',
    description: 'Movimentos camponeses e trabalhadores rurais ocupam latifúndios de soja e milho alegando que a produção alimentar de emergência precisa ser confiscada pelo estado de guerra para controle de preços.',
    choices: [
      {
        text: 'Legalizar Confiscos Temporários de Alimento',
        description: 'Apoiar ocupações rurais para distribuição direta ao exército. Enche os silos alimentares, mas quebra a confiança do mercado investidor financeiro.',
        effects: {
          resources: { money: -30, steel: 0, oil: 0, food: 50 },
          popularity: 20,
          stability: -10
        }
      },
      {
        text: 'Assegurar Direitos dos Consórcios Exportadores',
        description: 'Usar comandos especiais militares para desocupar fazendas de grande porte. Traz estabilidade financeira e capital, mas gera desnutrição e revolta da classe popular.',
        effects: {
          resources: { money: 30, steel: 0, oil: 5, food: -20 },
          popularity: -20,
          stability: 15
        }
      }
    ]
  }
];
