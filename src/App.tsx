import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Coins, 
  Flame, 
  ChevronRight, 
  Sparkles, 
  Plus, 
  TrendingUp, 
  MessageSquareCode, 
  Play, 
  RefreshCw, 
  Compass, 
  Skull, 
  Truck, 
  Briefcase, 
  AlertTriangle,
  Award,
  Vote,
  X,
  Zap,
  HardHat,
  Crosshair,
  UserCheck,
  Globe,
  Layers,
  RotateCcw,
  Volume2,
  VolumeX,
  Search,
  Download,
  Cloud,
  Edit3,
  Save,
  FolderOpen
} from 'lucide-react';
import { INITIAL_PROVINCES } from './provincesData';
import { GameState, Country, Province, GameEvent, EventChoice, UNIT_COSTS, BUILDING_COSTS, UNIT_STATS, BUILDING_MAINTENANCE, TROOP_MAINTENANCE, MAX_BUILDING_LEVEL, MilitaryUnitType, BuildingType, ResourceState } from './types';
import { simulateCombat } from './utils/combat';
import { PREDEFINED_EVENTS } from './predefinedEvents';
import { RealSatelliteMap } from './components/RealSatelliteMap';
import 'leaflet/dist/leaflet.css';

export default function App() {
  // Inicialização do estado de jogo
  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    selectedProvinceId: null,
    targetProvinceId: null,
    playerCountry: 'Brasil',
    popularity: 75,
    stability: 80,
    allianceSupport: 45,
    resources: {
      money: 120,
      steel: 45,
      oil: 30,
      food: 65,
    },
    provinces: JSON.parse(JSON.stringify(INITIAL_PROVINCES)),
    activeEvent: null,
    logs: [
      'Teatro de Operações da Bacia do Prata ativado.',
      'Sistemas logísticos e de inteligência militar online.',
      'Escolha seu país comandante no painel para iniciar as hostilidades estratégica!'
    ],
    gamePhase: 'start',
    customEventLoading: false,
    isSoundMuted: false,
    foreignAidCooldown: 0,
    autoTurnInterval: false,
    previousDecisions: [],
    weather: 'clear',
    customNames: {},
    unlockedAchievements: [],
    warTaxRate: 0,
    aviation: 0,
  });

  const SAVE_KEY = 'fronteira_prata_save';
  const [hasSave, setHasSave] = useState<boolean>(() => !!localStorage.getItem(SAVE_KEY));
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const saveGame = () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    setHasSave(true);
    setSaveNotification('Partida salva!');
    setTimeout(() => setSaveNotification(null), 2000);
  };

  const loadGame = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return;
    try {
      const state: GameState = JSON.parse(saved);
      setGameState(state);
      setSaveNotification('Partida carregada!');
      setTimeout(() => setSaveNotification(null), 2000);
    } catch {
      setSaveNotification('Erro ao carregar save.');
      setTimeout(() => setSaveNotification(null), 2000);
    }
  };

  // Auto-save ao final de cada turno
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && gameState.turn > 1) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
      setHasSave(true);
    }
  }, [gameState.turn]);

  // Som tático simulado via Web Audio API (Melhoria 3)
  const playSynthSound = (type: 'click' | 'success' | 'error' | 'combat' | 'nextTurn') => {
    if (gameState.isSoundMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Fecha o contexto após o som terminar para liberar recursos nativos de áudio
      osc.onended = () => { ctx.close().catch(() => {}); };
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'combat') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'nextTurn') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Ignorar erros de interação de áudio do navegador
    }
  };

  // Estado adicional para conselho do general de campo
  const [advisorAdvice, setAdvisorAdvice] = useState<string>(
    'Comandante, aguardando início do turno para gerar conselho tático via satélite de IA.'
  );
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [recruitingUnits, setRecruitingUnits] = useState({ infantry: 0, artillery: 0, tanks: 0 });
  const [activeTab, setActiveTab] = useState<'map' | 'diplomacy' | 'help'>('map');

  // Novas variáveis de estado para busca/filtros/favoritos/renomeação e autoclick (Melhorias 9, 10, 14)
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'own' | 'enemy' | 'frontline'>('all');
  const [logsCopied, setLogsCopied] = useState(false);
  const [renamingProvId, setRenamingProvId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  // Controles de Visão 3D e Mapa Satélite
  const [mapMode, setMapMode] = useState<'2d' | '3d' | 'satellite'>('3d');
  const [mapSkin, setMapSkin] = useState<'political' | 'satellite'>('political');
  const [pitch, setPitch] = useState<number>(45);
  const [yaw, setYaw] = useState<number>(-12);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMapMouseDown = (e: React.MouseEvent) => {
    if (mapMode !== '3d') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mapMode !== '3d') return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setYaw(prev => prev + dx * 0.45);
    setPitch(prev => Math.max(15, Math.min(80, prev - dy * 0.45)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMapMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetMapPosition = () => {
    setPitch(45);
    setYaw(-12);
    setZoom(1.0);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Autoclick de turno (Espectador / Autoturno) - Melhoria 14
  useEffect(() => {
    let interval: any = null;
    if (gameState.autoTurnInterval && gameState.gamePhase === 'playing') {
      interval = setInterval(() => {
        // Pausa automaticamente se houver evento ativo aguardando decisão
        if (gameState.activeEvent) return;
        handleEndTurn();
      }, 5000); // Avança a cada 5 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.autoTurnInterval, gameState.gamePhase]);
  const [combatDetailsModal, setCombatDetailsModal] = useState<{
    visible: boolean;
    attackerId: string;
    defenderId: string;
    combatLog: string[];
    attackerLosses: any;
    defenderLosses: any;
    winner: 'attacker' | 'defender';
    troopsUsed: any;
  } | null>(null);

  const [pendingAttack, setPendingAttack] = useState<{
    inf: number; tnk: number;
    originName: string; targetName: string;
  } | null>(null);

  const [battleHistory, setBattleHistory] = useState<Array<{
    turn: number;
    originName: string;
    targetName: string;
    winner: 'attacker' | 'defender';
    attackerLosses: { infantry: number; tanks: number };
    defenderLosses: { infantry: number; tanks: number };
  }>>([]);

  // Assistência para encontrar se as províncias estão supridas
  // Uma província está suprida se ela tem uma conexão direta de caminho
  // até a capital original do jogador (São Paulo / DF para Brasil, ou Asunción para Paraguai)
  // que passe somente por províncias controladas pelo jogador.
  const checkIsSupplied = (provinceId: string, controller: Country): boolean => {
    const capitalId = controller === 'Brasil' ? 'BR-DF' : 'PY-ASU';
    
    // BFS simplificado para rastrear rota
    const visited = new Set<string>();
    const queue = [provinceId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === capitalId) return true;
      
      visited.add(current);
      const prov = gameState.provinces[current];
      if (!prov) continue;
      
      // Conexões
      for (const neighborId of prov.connections) {
        if (!visited.has(neighborId)) {
          const neighbor = gameState.provinces[neighborId];
          if (neighbor && neighbor.controller === controller) {
            queue.push(neighborId);
          }
        }
      }
    }
    
    return false;
  };

  // Carrega conselho inicial do general de IA
  useEffect(() => {
    if (gameState.gamePhase === 'playing') {
      fetchAdvisorAdvice();
    }
  }, [gameState.gamePhase, gameState.turn, gameState.playerCountry]);

  // Carrega evento dinâmico a cada 2 turnos
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && gameState.turn > 1) {
      if (gameState.turn % 2 === 1) {
        fetchDynamicEvent();
      }
    }
  }, [gameState.turn]);

  // Obter conselho do general da IA
  const fetchAdvisorAdvice = async () => {
    setAdvisorLoading(true);
    const opponent = gameState.playerCountry === 'Brasil' ? 'Paraguai' : 'Brasil';
    
    // Contagem de exércitos militares do oponente
    let opponentTroops = { infantry: 0, artillery: 0, tanks: 0 };
    let opponentProvincesCount = 0;
    
    (Object.values(gameState.provinces) as Province[]).forEach(p => {
      if (p.controller === opponent) {
        opponentProvincesCount++;
        opponentTroops.infantry += p.armies.infantry;
        opponentTroops.artillery += p.armies.artillery;
        opponentTroops.tanks += p.armies.tanks;
      }
    });

    const body = {
      turn: gameState.turn,
      popularity: gameState.popularity,
      stability: gameState.stability,
      resources: gameState.resources,
      playerCountry: gameState.playerCountry,
      opponentDetails: `Inimigo ${opponent} possui ${opponentProvincesCount} províncias com forças combinadas de: Infantaria: ${opponentTroops.infantry}, Artilharia: ${opponentTroops.artillery}, Blindados: ${opponentTroops.tanks}.`,
      logSlice: gameState.logs.slice(-4),
    };

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        setAdvisorAdvice(data.advisor);
      } else {
        throw new Error('Falha HTTP');
      }
    } catch (e) {
      // Fallback manual inteligente
      const advice = gameState.playerCountry === 'Brasil' 
        ? 'Relatório de Inteligência do RS e MS: As províncias conexas ao Paraguai precisam de reforços táticos de blindados. Fortifique a infraestrutura industrial de São Paulo para estocar capital para o esforço bélico.'
        : 'Relatório do Estado Maior Paraguaio: Nossas refinarias no Chaco e Boqueron garantem combustível precioso. Use nossos tanques rápidos para contra-atacar o avanço no Mato Grosso do Sul antes que eles nos separem das capitanias de Itapúa.';
      setAdvisorAdvice(advice);
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Buscar evento tático com a IA
  const fetchDynamicEvent = async () => {
    setGameState(prev => ({ ...prev, customEventLoading: true }));
    
    // Cria resumo básico de mapa para enviar à IA
    const playerProvinces = (Object.values(gameState.provinces) as Province[])
      .filter(p => p.controller === gameState.playerCountry)
      .map(p => `${p.name} (Inf:${p.armies.infantry}, Blin:${p.armies.tanks})`);
      
    const body = {
      turn: gameState.turn,
      popularity: gameState.popularity,
      stability: gameState.stability,
      allianceSupport: gameState.allianceSupport,
      resources: gameState.resources,
      playerCountry: gameState.playerCountry,
      provincesSummary: playerProvinces.slice(0, 5).join(', ')
    };

    try {
      const res = await fetch('/api/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        const isValid = data && typeof data.title === 'string' && Array.isArray(data.choices) && data.choices.length > 0;
        if (!isValid) throw new Error('Resposta da API com estrutura inválida');
        setGameState(prev => ({
          ...prev,
          activeEvent: data,
          customEventLoading: false
        }));
      } else {
        throw new Error('Falha ao obter evento');
      }
    } catch (e) {
      // Fallback para seleção de evento pré-definido seguro
      const rIdx = Math.floor(Math.random() * PREDEFINED_EVENTS.length);
      const standardEvent = PREDEFINED_EVENTS[rIdx];
      setGameState(prev => ({
        ...prev,
        activeEvent: standardEvent,
        customEventLoading: false
      }));
    }
  };

  // Iniciar jogo escolhendo o país
  const startGame = (country: Country) => {
    // Configura os recursos dependendo da nação
    const isBrazil = country === 'Brasil';
    
    const startResources = isBrazil
      ? { money: 120, steel: 50, oil: 30, food: 70 }
      : { money: 100, steel: 35, oil: 55, food: 55 }; // Paraguai tem mais óleo no Chaco (Boquerón), menor renda inicial

    setGameState(prev => ({
      ...prev,
      playerCountry: country,
      resources: startResources,
      popularity: 80,
      stability: 85,
      allianceSupport: isBrazil ? 40 : 60, // Paraguai começa com apoio internacional geopolítico levemente superior defensivo
      gamePhase: 'playing',
      logs: [
        `Guerra Oficial Declarada! Você assumiu o comando do ${country}.`,
        `Fase preparatória iniciada. Desenvolva indústrias, recrute e proteja suas fronteiras.`,
        'Clique em uma de suas províncias para gerenciar construções e tropas.'
      ]
    }));
  };

  // Selecionar Província no Mapa
  const handleSelectProvince = (provId: string) => {
    const prov = gameState.provinces[provId];
    if (!prov) return;

    if (gameState.selectedProvinceId === provId) {
      // Deselecionar
      setGameState(prev => ({ ...prev, selectedProvinceId: null, targetProvinceId: null }));
      setRecruitingUnits({ infantry: 0, artillery: 0, tanks: 0 });
    } else if (gameState.selectedProvinceId) {
      const parentProv = gameState.provinces[gameState.selectedProvinceId];
      // Se for conexa e inimiga e a província de origem pertence ao jogador -> define alvo de ataque/movimento
      if (
        parentProv.controller === gameState.playerCountry && 
        parentProv.connections.includes(provId)
      ) {
        setGameState(prev => ({ ...prev, targetProvinceId: provId }));
      } else {
        // Selecionar nova
        setGameState(prev => ({ 
          ...prev, 
          selectedProvinceId: provId, 
          targetProvinceId: null 
        }));
        setRecruitingUnits({ infantry: 0, artillery: 0, tanks: 0 });
      }
    } else {
      setGameState(prev => ({ ...prev, selectedProvinceId: provId, targetProvinceId: null }));
      setRecruitingUnits({ infantry: 0, artillery: 0, tanks: 0 });
    }
  };

  // Alterar seleção de alvo de transfer/invasão diretamente
  const clearTargetProvince = () => {
    setGameState(prev => ({ ...prev, targetProvinceId: null }));
  };

  // Recrutar Tropas na Província Selecionada
  const recruitUnits = (type: MilitaryUnitType, count: number) => {
    const provId = gameState.selectedProvinceId;
    if (!provId) return;

    const prov = gameState.provinces[provId];
    if (prov.controller !== gameState.playerCountry) return;

    const cost = UNIT_COSTS[type];
    const totalCost = {
      money: cost.money * count,
      steel: cost.steel * count,
      oil: cost.oil * count,
      food: cost.food * count
    };

    // Verificar se recursos são suficientes
    if (
      gameState.resources.money < totalCost.money ||
      gameState.resources.steel < totalCost.steel ||
      gameState.resources.oil < totalCost.oil ||
      gameState.resources.food < totalCost.food
    ) {
      addLog(`[Erro Militar] Recursos insuficientes para recrutar ${count} divisões de ${UNIT_STATS[type].name}.`);
      playSynthSound('error');
      return;
    }

    // Deduzir recursos e incrementar tropas na província
    setGameState(prev => {
      const updatedProvinces = { ...prev.provinces };
      const targetProv = { ...updatedProvinces[provId] };
      
      targetProv.armies = {
        ...targetProv.armies,
        [type]: targetProv.armies[type] + count
      };
      
      updatedProvinces[provId] = targetProv;

      let nextState: GameState = {
        ...prev,
        resources: {
          money: prev.resources.money - totalCost.money,
          steel: prev.resources.steel - totalCost.steel,
          oil: prev.resources.oil - totalCost.oil,
          food: prev.resources.food - totalCost.food
        },
        provinces: updatedProvinces,
        logs: [
          `Recrutado: ${count} divisões de ${UNIT_STATS[type].name} em ${prov.name}.`,
          ...prev.logs
        ]
      };

      // Achievement: Mobilizador Supremo (10+ blindados em um território ou total militar expressivo)
      if (type === 'tanks' && targetProv.armies.tanks >= 10) {
        const achs = nextState.unlockedAchievements || [];
        if (!achs.includes('tank_lord')) {
          nextState.unlockedAchievements = [...achs, 'tank_lord'];
          nextState.logs = [`🏆 DESBLOQUEADO: [Divisões de Aço] Ter mais de 10 Divisões de Tanques em uma província!`, ...nextState.logs];
        }
      }

      return nextState;
    });

    playSynthSound('success');
    setRecruitingUnits(prev => ({ ...prev, [type]: 0 }));
  };

  // Construir Instalação Comercial ou Militar
  const buildFacility = (type: BuildingType) => {
    const provId = gameState.selectedProvinceId;
    if (!provId) return;

    const prov = gameState.provinces[provId];
    if (prov.controller !== gameState.playerCountry) return;

    const cost = BUILDING_COSTS[type];

    // Restrição geográfica: hidroelétrica exige rio
    if (type === 'hydroelectric' && !prov.hasRiver) {
      addLog(`[Construção] Hidroelétrica requer rio navegável. ${prov.name} não possui recursos hídricos suficientes.`);
      playSynthSound('error');
      return;
    }

    // Limite máximo por edifício
    const currentLevel = (prov.buildings[type] ?? 0);
    if (currentLevel >= MAX_BUILDING_LEVEL) {
      addLog(`[Construção] Nível máximo (${MAX_BUILDING_LEVEL}) de ${type.toUpperCase()} já atingido em ${prov.name}.`);
      playSynthSound('error');
      return;
    }

    // Verificar abundância
    if (
      gameState.resources.money < cost.money ||
      gameState.resources.steel < cost.steel ||
      gameState.resources.oil < cost.oil ||
      gameState.resources.food < cost.food
    ) {
      addLog(`[Erro Logístico] Recursos insuficientes para focar em infraestrutura de ${type} em ${prov.name}.`);
      playSynthSound('error');
      return;
    }

    setGameState(prev => {
      const updatedProvinces = { ...prev.provinces };
      const targetProv = { ...updatedProvinces[provId] };
      
      targetProv.buildings = {
        ...targetProv.buildings,
        [type]: (targetProv.buildings[type] ?? 0) + 1
      };
      
      updatedProvinces[provId] = targetProv;

      // Calcular estruturas de mesmo tipo para obtenção de conquista
      let totalThisType = 0;
      Object.values(updatedProvinces).forEach((p: any) => {
        if (p.controller === prev.playerCountry) {
          totalThisType += p.buildings[type];
        }
      });

      let nextState: GameState = {
        ...prev,
        resources: {
          money: prev.resources.money - cost.money,
          steel: prev.resources.steel - cost.steel,
          oil: prev.resources.oil - cost.oil,
          food: prev.resources.food - cost.food
        },
        provinces: updatedProvinces,
        logs: [
          `Infraestrutura expandida: Nível de ${type.toUpperCase()} aumentado em ${prov.name}.`,
          ...prev.logs
        ]
      };

      if (type === 'industrial' && totalThisType >= 6) {
        const achs = nextState.unlockedAchievements || [];
        if (!achs.includes('industrial_tycoon')) {
          nextState.unlockedAchievements = [...achs, 'industrial_tycoon'];
          nextState.logs = [`🏆 DESBLOQUEADO: [Magnata Industrial] Possuir mais de 5 Complexos Industriais ativos no império!`, ...nextState.logs];
        }
      }

      return nextState;
    });

    playSynthSound('success');
  };

  // Enviar tropas ou Executar Invasão de Combate
  const executeMilitaryOrder = (
    sendInfantry: number, 
    sendArtillery: number, 
    sendTanks: number
  ) => {
    const originId = gameState.selectedProvinceId;
    const destId = gameState.targetProvinceId;
    if (!originId || !destId) return;

    const origin = gameState.provinces[originId];
    const destination = gameState.provinces[destId];

    if (origin.controller !== gameState.playerCountry) return;

    const totalSending = sendInfantry + sendArtillery + sendTanks;
    if (totalSending <= 0) {
      addLog(`[Militar] Você deve selecionar pelo menos 1 divisão operacional para enviar.`);
      return;
    }

    if (
      sendInfantry > origin.armies.infantry ||
      sendArtillery > origin.armies.artillery ||
      sendTanks > origin.armies.tanks
    ) {
      addLog(`[Militar] Destacamento inválido. Número superior ao de tropas estacionadas em ${origin.name}.`);
      return;
    }

    // Determina se é Movimentação Amigável ou Combate Real
    const isHostile = destination.controller !== gameState.playerCountry;

    if (!isHostile) {
      // Movimentação pacífica / Reforço logístico
      setGameState(prev => {
        const updatedProvinces = { ...prev.provinces };
        
        // Remove da origem
        const updatedOrigin = { ...updatedProvinces[originId] };
        updatedOrigin.armies = {
          infantry: updatedOrigin.armies.infantry - sendInfantry,
          artillery: updatedOrigin.armies.artillery - sendArtillery,
          tanks: updatedOrigin.armies.tanks - sendTanks
        };
        updatedProvinces[originId] = updatedOrigin;

        // Adiciona no destino
        const updatedDest = { ...updatedProvinces[destId] };
        updatedDest.armies = {
          infantry: updatedDest.armies.infantry + sendInfantry,
          artillery: updatedDest.armies.artillery + sendArtillery,
          tanks: updatedDest.armies.tanks + sendTanks
        };
        updatedProvinces[destId] = updatedDest;

        return {
          ...prev,
          provinces: updatedProvinces,
          targetProvinceId: null,
          logs: [
            `Movimentação Tática: Implantadas ${totalSending} divisões de ${origin.name} para ${destination.name}.`,
            ...prev.logs
          ]
        };
      });
      playSynthSound('click');
    } else {
      // Combate estratégico militar
      const attackerSupplied = checkIsSupplied(originId, gameState.playerCountry);
      const defenderSupplied = checkIsSupplied(destId, destination.controller);

      const foodStarved = gameState.resources.food < 20;
      // Morale multiplier (food + stability)
      const morale = Math.max(20, Math.min(100, 50 + (gameState.resources.food - 30) * 1.2 + (gameState.stability - 50) * 0.4));
      const moraleMult = morale < 40 ? 0.75 : morale < 60 ? 0.9 : 1.0;
      const effectiveMult = foodStarved ? Math.min(moraleMult, 0.8) : moraleMult;
      const combatUnits = {
        infantry:  Math.round(sendInfantry  * effectiveMult),
        artillery: Math.round(sendArtillery * effectiveMult),
        tanks:     Math.round(sendTanks     * effectiveMult),
      };
      if (effectiveMult < 1.0) {
        addLog(`[Moral] Tropas combatem com ${Math.round(effectiveMult * 100)}% de eficácia (moral ${Math.round(morale)}%).`);
      }

      // Bônus de aviação: cada esquadrão reduz 6% da defesa inimiga (máx 30%)
      const aviationSquads = gameState.aviation ?? 0;
      const aviationDebuff = Math.min(0.30, aviationSquads * 0.06);
      if (aviationSquads > 0) {
        addLog(`[Aviação] ${aviationSquads} esquadrão(ões) de caça em suporte tático (-${Math.round(aviationDebuff * 100)}% defesa inimiga).`);
      }

      const result = simulateCombat(
        origin,
        destination,
        combatUnits,
        defenderSupplied,
        attackerSupplied,
        aviationDebuff
      );

      // Aplicar perdas e troca de controle se o atacante vencer
      setGameState(prev => {
        const updatedProvinces = { ...prev.provinces };
        
        // Atualiza exército remanescente na origem (exército atacante menos o que foi enviado para a batalha)
        const updatedOrigin = { ...updatedProvinces[originId] };
        updatedOrigin.armies = {
          infantry: updatedOrigin.armies.infantry - sendInfantry,
          artillery: updatedOrigin.armies.artillery - sendArtillery,
          tanks: updatedOrigin.armies.tanks - sendTanks
        };
        updatedProvinces[originId] = updatedOrigin;

        // Atualiza exército no destino
        const updatedDest = { ...updatedProvinces[destId] };

        if (result.winner === 'attacker') {
          // O atacante ganha o controle da província!
          updatedDest.controller = prev.playerCountry;
          
          // O exército vencedor remanescente é transferido para a província capturada
          updatedDest.armies = result.attackerRemainingBeforeLogistics;
          
          // Popularidade ganha — penalidade de overextension ao controlar muitas províncias
          const playerControlled = Object.values(updatedProvinces).filter((p: any) => p.controller === prev.playerCountry).length;
          const overextPenalty = playerControlled > 11 ? -10 : playerControlled > 8 ? -4 : 0;
          const popGain = Math.min(100, prev.popularity + 10);
          const stabGain = Math.min(100, Math.max(0, prev.stability + 5 + overextPenalty));
          if (overextPenalty < 0) {
            // log será adicionado pelo log existente
          }

          let nextState = {
            ...prev,
            provinces: updatedProvinces,
            popularity: popGain,
            stability: stabGain,
            selectedProvinceId: destId, // foca na província capturada
            targetProvinceId: null,
            logs: [
              `CONQUISTA! Nossas forças capturaram ${destination.name}. O general inimigo recuou com pesadas baixas.`,
              ...prev.logs,
              ...result.log.map(l => `[Combate] ${l}`)
            ]
          };

          // Achievement: Primeira Vitória de Muitas
          const achs = nextState.unlockedAchievements || [];
          if (!achs.includes('first_victory')) {
            nextState.unlockedAchievements = [...achs, 'first_victory'];
            nextState.logs = [`🏆 DESBLOQUEADO: [Tático do Prata] Vencer uma batalha de assalto ofensiva!`, ...nextState.logs];
          }

          return nextState;
        } else {
          // Defensor manteve a província
          updatedDest.armies = result.defenderRemainingBeforeLogistics;
          
          // Retorno de sobreviventes do atacante para a origem
          updatedOrigin.armies = {
            infantry: updatedOrigin.armies.infantry + result.attackerRemainingBeforeLogistics.infantry,
            artillery: updatedOrigin.armies.artillery + result.attackerRemainingBeforeLogistics.artillery,
            tanks: updatedOrigin.armies.tanks + result.attackerRemainingBeforeLogistics.tanks
          };
          updatedProvinces[originId] = updatedOrigin;

          // Perda de popularidade
          const popLoss = Math.max(0, prev.popularity - 12);
          const stabLoss = Math.max(0, prev.stability - 8);

          return {
            ...prev,
            provinces: updatedProvinces,
            popularity: popLoss,
            stability: stabLoss,
            targetProvinceId: null,
            logs: [
              `DERROTA! O assalto em ${destination.name} falhou. Linhas defensivas inimigas resistiram.`,
              ...prev.logs,
              ...result.log.map(l => `[Combate] ${l}`)
            ]
          };
        }
      });
      playSynthSound('combat');

      // Registra no histórico de batalhas
      setBattleHistory(prev => [{
        turn: gameState.turn,
        originName: origin.name,
        targetName: destination.name,
        winner: result.winner,
        attackerLosses: { infantry: result.attackerLosses.infantry, tanks: result.attackerLosses.tanks },
        defenderLosses: { infantry: result.defenderLosses.infantry, tanks: result.defenderLosses.tanks },
      }, ...prev].slice(0, 10));

      // Configura os detalhes para exibição no Modal animado de Combate
      setCombatDetailsModal({
        visible: true,
        attackerId: originId,
        defenderId: destId,
        combatLog: result.log,
        attackerLosses: result.attackerLosses,
        defenderLosses: result.defenderLosses,
        winner: result.winner,
        troopsUsed: combatUnits
      });
    }
  };

  // Adicionar Log de Jogo
  const addLog = (message: string) => {
    setGameState(prev => ({
      ...prev,
      logs: [message, ...prev.logs]
    }));
  };

  // Melhoria 9: Exportação de Logs para a área de transferência
  const handleExportLogs = () => {
    const fullLog = gameState.logs.join('\n');
    navigator.clipboard.writeText(fullLog).then(() => {
      setLogsCopied(true);
      setTimeout(() => setLogsCopied(false), 3000);
    }).catch(err => {
      console.error('Erro ao transferir logs: ', err);
    });
    playSynthSound('success');
  };

  // Tratar Escolha de Evento Geopolítico
  const handleSelectChoice = (choice: EventChoice) => {
    setGameState(prev => {
      // Modificações de recursos
      const newResources = { ...prev.resources };
      if (choice.effects.resources) {
        Object.keys(choice.effects.resources).forEach(key => {
          const resKey = key as keyof typeof newResources;
          newResources[resKey] = Math.max(0, newResources[resKey] + (choice.effects.resources?.[resKey] || 0));
        });
      }

      // Modificações de popularidade e estabilidade
      const newPopularity = Math.max(0, Math.min(100, prev.popularity + (choice.effects.popularity || 0)));
      const newStability = Math.max(0, Math.min(100, prev.stability + (choice.effects.stability || 0)));

      // Tropas spawndas (opcional)
      const updatedProvinces = { ...prev.provinces };
      if (choice.effects.spawnTroops) {
        choice.effects.spawnTroops.forEach(st => {
          if (updatedProvinces[st.provinceId]) {
            const curP = updatedProvinces[st.provinceId];
            curP.armies[st.unit] += st.count;
          }
        });
      }

      return {
        ...prev,
        resources: newResources,
        popularity: newPopularity,
        stability: newStability,
        activeEvent: null, // Fecha o card
        logs: [
          `RESOLVECRISE: Escolhido [${choice.text}]. Efeitos aplicados.`,
          ...prev.logs
        ],
        previousDecisions: [...(prev.previousDecisions || []), `${prev.activeEvent?.title || 'Conselho'}: ${choice.text}`]
      };
    });
  };

  // Melhoria 6: Desmobilização Militar (Reembolso de 50% dos recursos)
  const demobilizeUnit = (type: MilitaryUnitType) => {
    const provId = gameState.selectedProvinceId;
    if (!provId) return;
    const prov = gameState.provinces[provId];
    if (prov.controller !== gameState.playerCountry || prov.armies[type] <= 0) return;

    setGameState(prev => {
      const updatedProvinces = { ...prev.provinces };
      const targetProv = { ...updatedProvinces[provId] };
      targetProv.armies[type] = Math.max(0, targetProv.armies[type] - 1);
      
      const cost = UNIT_COSTS[type];
      const refund = {
        money: Math.round(cost.money * 0.5),
        steel: Math.round(cost.steel * 0.5),
        oil: Math.round(cost.oil * 0.5),
        food: Math.round(cost.food * 0.5)
      };

      updatedProvinces[provId] = targetProv;
      return {
        ...prev,
        resources: {
          money: prev.resources.money + refund.money,
          steel: prev.resources.steel + refund.steel,
          oil: prev.resources.oil + refund.oil,
          food: prev.resources.food + refund.food
        },
        provinces: updatedProvinces,
        logs: [`Desmobilização: 1 divisão de ${UNIT_STATS[type].name} desbandada em ${prov.name}. Reembolsado 50% do custo de fabricação.`, ...prev.logs]
      };
    });
    playSynthSound('click');
  };

  // Melhoria 8: Pedir ajuda diplomática unilateral estrangeira
  const requestForeignAid = () => {
    if ((gameState.foreignAidCooldown || 0) > 0) return;
    setGameState(prev => {
      return {
        ...prev,
        resources: {
          money: prev.resources.money + 25,
          steel: prev.resources.steel + 5,
          oil: prev.resources.oil + 5,
          food: prev.resources.food + 15
        },
        popularity: Math.max(0, prev.popularity - 12),
        foreignAidCooldown: 4,
        logs: [`[Aliança] Ajuda estrangeira militar requisitada! Coletados R$ 25B, +5 Aço, +5 Petróleo, e +15 Alimentos. Queda de -12% popularidade por intervencionismo.`, ...prev.logs]
      };
    });
    playSynthSound('success');
  };

  // Recrutar esquadrão de aviação (ativo nacional)
  const recruitAviation = () => {
    const COST = { money: 55, steel: 10, oil: 12 };
    // Requer ao menos uma base aérea construída
    const hasAirbase = Object.values(gameState.provinces).some(
      (p: any) => p.controller === gameState.playerCountry && (p.buildings.airbase ?? 0) > 0
    );
    if (!hasAirbase) {
      addLog('[Aviação] Pré-requisito não atingido: construa uma Base Aérea em qualquer província antes de recrutar esquadrões.');
      playSynthSound('error');
      return;
    }
    if (gameState.resources.money < COST.money || gameState.resources.steel < COST.steel || gameState.resources.oil < COST.oil) {
      addLog('[Aviação] Recursos insuficientes para recrutar esquadrão aéreo (R$55B, 10Aço, 12 Petróleo).');
      playSynthSound('error');
      return;
    }
    setGameState(prev => ({
      ...prev,
      aviation: (prev.aviation ?? 0) + 1,
      resources: {
        ...prev.resources,
        money: prev.resources.money - COST.money,
        steel: prev.resources.steel - COST.steel,
        oil: prev.resources.oil - COST.oil,
      },
      logs: [`[Aviação] Novo esquadrão de caças recrutado. Total: ${(prev.aviation ?? 0) + 1} esquadrão(ões).`, ...prev.logs],
    }));
    playSynthSound('success');
  };

  // Trocar recursos no mercado de guerra
  const tradResources = (give: keyof typeof gameState.resources, giveAmt: number, receive: keyof typeof gameState.resources, receiveAmt: number) => {
    if (gameState.resources[give] < giveAmt) {
      addLog(`[Comércio] Recursos insuficientes para essa troca.`);
      playSynthSound('error');
      return;
    }
    setGameState(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        [give]: prev.resources[give] - giveAmt,
        [receive]: prev.resources[receive] + receiveAmt,
      },
      logs: [`[Comércio] Trocados ${giveAmt} ${String(give)} por ${receiveAmt} ${String(receive)} no mercado de guerra.`, ...prev.logs],
    }));
    playSynthSound('success');
  };

  // Melhoria 14: Nome de Base Customizado
  const handleRenameProvince = (provId: string, newName: string) => {
    if (!newName.trim()) return;
    setGameState(prev => ({
      ...prev,
      customNames: {
        ...(prev.customNames || {}),
        [provId]: newName.trim()
      }
    }));
    setRenamingProvId(null);
    playSynthSound('success');
  };

  // Melhoria 2: Atalho de Recrutamento Máximo
  const getMaxRecruitCount = (type: MilitaryUnitType) => {
    const cost = UNIT_COSTS[type];
    const maxByMoney = cost.money > 0 ? Math.floor(gameState.resources.money / cost.money) : Infinity;
    const maxBySteel = cost.steel > 0 ? Math.floor(gameState.resources.steel / cost.steel) : Infinity;
    const maxByOil = cost.oil > 0 ? Math.floor(gameState.resources.oil / cost.oil) : Infinity;
    const maxByFood = cost.food > 0 ? Math.floor(gameState.resources.food / cost.food) : Infinity;
    return Math.min(maxByMoney, maxBySteel, maxByOil, maxByFood);
  };

  // Melhoria 3: Calculadora de Produção Projetada
  const getProjectedReceipts = () => {
    let nextMoney = 15;
    let nextSteel = 5;
    let nextOil = 5;
    let nextFood = 15;
    let nextEnergia = 0;
    const player = gameState.playerCountry;
    Object.values(gameState.provinces).forEach((prov: any) => {
      if (prov.controller === player) {
        nextMoney += prov.resources.money * 0.15;
        nextSteel += prov.resources.steel * 0.12;
        nextOil += prov.resources.oil * 0.12;
        nextFood += prov.resources.food * 0.15;
        if (prov.onAquifer) nextFood += 4;
        const logBonus = prov.hasRiver ? 1.2 : 1.0;
        nextFood += prov.buildings.logistics * 4 * logBonus;
        nextMoney += prov.buildings.industrial * 12;
        nextSteel += prov.buildings.industrial * 5;
        nextOil += prov.buildings.refinery * 8;
        nextEnergia += (prov.buildings.hydroelectric ?? 0) * 5;
        const ethanolLvl = prov.buildings.ethanolRefinery ?? 0;
        if (ethanolLvl > 0) { nextFood -= ethanolLvl * 4; nextOil += ethanolLvl * 3; }
      }
    });
    const energyBonus = 1 + Math.floor(nextEnergia / 5) * 0.08;
    nextMoney *= energyBonus;
    nextSteel *= energyBonus;
    const stabilityMultiplier = 0.5 + (gameState.stability / 200);
    return {
      money: Math.round(nextMoney * stabilityMultiplier),
      steel: Math.round(nextSteel),
      oil: Math.round(Math.max(0, nextOil)),
      food: Math.round(Math.max(0, nextFood * stabilityMultiplier)),
      energia: Math.round(nextEnergia),
    };
  };

  // Melhoria 13: Nível de Ameaça Local
  const getProvinceThreatLevel = (prov: Province) => {
    if (prov.controller !== gameState.playerCountry) return 'Inimigo';
    let surroundingEnemyArmies = 0;
    prov.connections.forEach(neighId => {
      const neigh = gameState.provinces[neighId];
      if (neigh && neigh.controller !== gameState.playerCountry) {
        surroundingEnemyArmies += (neigh.armies.infantry + neigh.armies.artillery + neigh.armies.tanks);
      }
    });

    if (surroundingEnemyArmies === 0) return 'Mínima 🟢';
    if (surroundingEnemyArmies < 5) return 'Moderada 🟡';
    return `Crítica 🔴 (${surroundingEnemyArmies} div inimigas vizinhas)`;
  };

  // Melhoria 17: Nomes de Regimentos Históricos
  const getRegimentalBanner = (prov: Province) => {
    if (prov.armies.tanks >= 5) {
      return prov.controller === 'Brasil' ? '🛡️ 1ª Divisão de Blindados Guarani' : '🛡️ Regimento de Blindados Boquerón';
    }
    if (prov.armies.infantry >= 8) {
      return prov.controller === 'Brasil' ? '⚔️ 2º Regimento Tuiuti' : '⚔️ Infantaria Coronel Mongelós';
    }
    return '';
  };

  // Avançar Turno (Fim de Turno)
  const handleEndTurn = () => {
    // Pré-calcula supply para todas as províncias uma única vez (evita O(n²) do BFS repetido)
    const supplyCache: Record<string, boolean> = {};
    Object.keys(gameState.provinces).forEach(id => {
      supplyCache[id] = checkIsSupplied(id, gameState.provinces[id].controller);
    });

    setGameState(prev => {
      const currentTurn = prev.turn;
      const nextTurn = currentTurn + 1;
      const player = prev.playerCountry;
      const opponent = player === 'Brasil' ? 'Paraguai' : 'Brasil';

      // 1. GERAÇÃO DE RECURSOS DOS ESTADOS/PROVÍNCIAS CONTROLADAS
      let baseMoney = 15;
      let baseSteel = 5;
      let baseOil = 5;
      let baseFood = 15;
      let baseEnergia = 0;

      (Object.values(prev.provinces) as Province[]).forEach(prov => {
        if (prov.controller === player) {
          // Produção base da província
          baseMoney += prov.resources.money * 0.15;
          baseSteel += prov.resources.steel * 0.12;
          baseOil += prov.resources.oil * 0.12;
          baseFood += prov.resources.food * 0.15;

          // Bônus de Aquífero Guarani: +4 alimento/turno
          if (prov.onAquifer) {
            baseFood += 4;
          }

          // Bônus de rio em logística: +20% alimento dos depósitos logísticos
          const logBonus = prov.hasRiver ? 1.2 : 1.0;
          baseFood += (prov.buildings.logistics * 4 * logBonus);

          // Energia gerada por hidroelétricas (5 MW por nível)
          const hydroLevel = prov.buildings.hydroelectric ?? 0;
          baseEnergia += hydroLevel * 5;

          // Bônus industrial potencializado por energia disponível (calculado após)
          baseMoney += (prov.buildings.industrial * 12);
          baseSteel += (prov.buildings.industrial * 5);
          baseOil += (prov.buildings.refinery * 8);

          // Refinaria de etanol: consome 4 alimento, gera 3 petróleo por nível/turno
          const ethanolLevel = prov.buildings.ethanolRefinery ?? 0;
          if (ethanolLevel > 0) {
            const foodCost = ethanolLevel * 4;
            const oilGain = ethanolLevel * 3;
            baseFood -= foodCost;
            baseOil += oilGain;
          }
        }
      });

      // Bônus de energia na indústria: +8% dinheiro e aço por cada 5 MW de energia
      const energyBonus = 1 + Math.floor(baseEnergia / 5) * 0.08;
      baseMoney *= energyBonus;
      baseSteel *= energyBonus;

      // Bônus de imposto de guerra sobre a renda
      const taxRate = prev.warTaxRate ?? 0;
      const taxBonus = [1.0, 1.2, 1.4, 1.6][taxRate];
      baseMoney *= taxBonus;

      // Modificador de Estabilidade sobre a produção econômica
      const stabilityMultiplier = 0.5 + (prev.stability / 200); // 0.5 a 1.0
      const finalMoneyGained = Math.round(baseMoney * stabilityMultiplier);
      const finalSteelGained = Math.round(baseSteel);
      const finalOilGained = Math.round(Math.max(0, baseOil));
      const finalFoodGained = Math.round(Math.max(0, baseFood * stabilityMultiplier));
      const finalEnergiaGained = Math.round(baseEnergia);

      const updatedResources: ResourceState = {
        money: prev.resources.money + finalMoneyGained,
        steel: prev.resources.steel + finalSteelGained,
        oil: prev.resources.oil + finalOilGained,
        food: prev.resources.food + finalFoodGained,
        energia: (prev.resources.energia ?? 0) + finalEnergiaGained,
      };

      // Consumo de Suprimento Alimentar e Petróleo pelo Exército Mobilizado
      let totalInfantry = 0;
      let totalArtillery = 0;
      let totalTanks = 0;

      (Object.values(prev.provinces) as Province[]).forEach(prov => {
        if (prov.controller === player) {
          totalInfantry += prov.armies.infantry;
          totalArtillery += prov.armies.artillery;
          totalTanks += prov.armies.tanks;
        }
      });

      // Fórmulas de consumo tático de combustível e mantimentos
      const oilConsumption = Math.round(totalInfantry * 0.1 + totalArtillery * 0.3 + totalTanks * 0.8);
      const foodConsumption = Math.round(totalInfantry * 0.3 + totalArtillery * 0.2 + totalTanks * 0.1);

      updatedResources.oil = Math.max(0, updatedResources.oil - oilConsumption);
      updatedResources.food = Math.max(0, updatedResources.food - foodConsumption);

      // Manutenção de edifícios (dinheiro/turno por nível)
      let buildingMaintenance = 0;
      (Object.values(prev.provinces) as Province[]).forEach(prov => {
        if (prov.controller === player) {
          buildingMaintenance += prov.buildings.industrial * BUILDING_MAINTENANCE.industrial;
          buildingMaintenance += prov.buildings.refinery   * BUILDING_MAINTENANCE.refinery;
          buildingMaintenance += prov.buildings.fortress   * BUILDING_MAINTENANCE.fortress;
          buildingMaintenance += prov.buildings.logistics  * BUILDING_MAINTENANCE.logistics;
          buildingMaintenance += (prov.buildings.hydroelectric   ?? 0) * BUILDING_MAINTENANCE.hydroelectric;
          buildingMaintenance += (prov.buildings.airbase          ?? 0) * BUILDING_MAINTENANCE.airbase;
          buildingMaintenance += (prov.buildings.ethanolRefinery  ?? 0) * BUILDING_MAINTENANCE.ethanolRefinery;
        }
      });

      // Manutenção de tropas (dinheiro/turno)
      const troopMaintenance =
        TROOP_MAINTENANCE.infantry(totalInfantry) +
        TROOP_MAINTENANCE.artillery(totalArtillery) +
        TROOP_MAINTENANCE.tanks(totalTanks) +
        (prev.aviation ?? 0) * 5;  // R$5B/turno por esquadrão aéreo

      const totalMaintenance = buildingMaintenance + troopMaintenance;
      updatedResources.money = updatedResources.money - totalMaintenance;

      // Penalidade de déficit (attritionLogs é declarado logo abaixo, adicionamos após)
      let deficitPenalty = { popularity: 0, stability: 0 };
      let hasDeficit = false;
      if (updatedResources.money < 0) {
        deficitPenalty = { popularity: -8, stability: -5 };
        updatedResources.money = 0;
        hasDeficit = true;
      }

      // Penalidades do imposto de guerra sobre popularidade/estabilidade
      const taxPenalties = [
        { popularity: 0, stability: 0 },
        { popularity: -5, stability: 0 },
        { popularity: -12, stability: -5 },
        { popularity: -20, stability: -10 },
      ][taxRate];

      // Moral — derivado de comida e estabilidade (0–100)
      const morale = Math.max(20, Math.min(100,
        50 + (updatedResources.food - 30) * 1.2 + (prev.stability - 50) * 0.4
      ));

      // 2. ATRIÇÃO E LOGÍSTICA DE FRONTEIRA (PROVÍNCIAS ISOLADAS DE SUPRIMENTOS)
      const updatedProvinces: Record<string, Province> = {};
      Object.entries(prev.provinces).forEach(([id, p]) => {
        const prov = p as Province;
        updatedProvinces[id] = { ...prov, armies: { ...prov.armies }, buildings: { ...prov.buildings }, resources: { ...prov.resources } };
      });
      let attritionLogs: string[] = [];
      if (hasDeficit) {
        attritionLogs.push('[DÉFICIT FISCAL] Reservas esgotadas! Cortes emergenciais afetam moral e estabilidade.');
      }

      Object.keys(updatedProvinces).forEach(id => {
        const prov = updatedProvinces[id];
        if (prov.controller === player) {
          const isSupplied = supplyCache[id] ?? checkIsSupplied(id, player);
          const totalTroops = prov.armies.infantry + prov.armies.artillery + prov.armies.tanks;
          
          if (!isSupplied && totalTroops > 0) {
            // Província isolada sofre atrito de 15% nas tropas devido à falta de suprimentos!
            const infLoss = Math.round(prov.armies.infantry * 0.15);
            const artLoss = Math.round(prov.armies.artillery * 0.15);
            const tnkLoss = Math.round(prov.armies.tanks * 0.15);

            prov.armies.infantry = Math.max(0, prov.armies.infantry - infLoss);
            prov.armies.artillery = Math.max(0, prov.armies.artillery - artLoss);
            prov.armies.tanks = Math.max(0, prov.armies.tanks - tnkLoss);

            if (infLoss > 0 || artLoss > 0 || tnkLoss > 0) {
              attritionLogs.push(`[Logística] Atrito severo em ${prov.name} isolada do Alto Comando: -${infLoss} Inf, -${artLoss} Art, -${tnkLoss} Blin.`);
            }
          }
        }
      });

      // 3. IA DO INIMIGO COMPORTAMENTO (AGRESSIVO E RECRUTADOR)
      // O oponente analisa e ataca a província do jogador que tiver menos tropas de menor proteção!
      let aiTensionLogs: string[] = [];
      const isPlayerBrazil = player === 'Brasil';
      const aiCountry = isPlayerBrazil ? 'Paraguai' : 'Brasil';

      // IA Recruta tropas — quanto menos províncias, maior o bônus de resistência (anti-snowball)
      const aiProvinceCount = Object.values(updatedProvinces).filter((p: any) => p.controller === aiCountry).length;
      const playerProvinceCount = Object.values(updatedProvinces).filter((p: any) => p.controller === player).length;
      const aiUnderdog = playerProvinceCount > aiProvinceCount + 2; // IA em desvantagem numérica
      const aiRecruitBonus = aiUnderdog ? 2 : 1; // Bônus de resistência para nação menor

      Object.keys(updatedProvinces).forEach(id => {
        const prov = updatedProvinces[id];
        if (prov.controller === aiCountry) {
          // Recruta baseado em capacidade industrial + bônus anti-snowball
          const hasIndustry = (prov.buildings.industrial || 0) > 0;
          const spawnInf = (Math.random() > 0.3 ? 1 : 0) + (hasIndustry ? 1 : 0) + (aiUnderdog ? aiRecruitBonus - 1 : 0);
          const spawnTnk = Math.random() > 0.55 ? 1 : 0;
          const spawnArt = hasIndustry && Math.random() > 0.7 ? 1 : 0;

          prov.armies.infantry += spawnInf;
          prov.armies.tanks += spawnTnk;
          prov.armies.artillery += spawnArt;
        }
      });

      // IA Identifica oportunidades de Ataque — pode lançar até 2 ofensivas por turno
      let aiAttacksLaunched = 0;
      const maxAiAttacks = aiUnderdog ? 2 : 1; // IA em desvantagem pode atacar em 2 frentes
      const aiProvinces = (Object.values(updatedProvinces) as Province[]).filter(p => p.controller === aiCountry);

      // Ordenação randômica para variação tática
      const shuffledAiProvinces = [...aiProvinces].sort(() => Math.random() - 0.5);

      for (const aiProv of shuffledAiProvinces) {
        if (aiAttacksLaunched >= maxAiAttacks) break;

        const aiTotalForces = aiProv.armies.infantry + aiProv.armies.artillery + aiProv.armies.tanks;
        // Threshold de ataque reduzido para IA mais agressiva (8 divisões vs 15 anterior)
        if (aiTotalForces > 8) {
          // Procura vizinho hostil (controlado pelo jogador) de defesa vulnerável
          const playerTargets = aiProv.connections
            .map(cId => updatedProvinces[cId] as Province)
            .filter(neigh => neigh && neigh.controller === player);

          if (playerTargets.length > 0) {
            // Seleciona o vizinho mais fraco
            const weakestTarget = playerTargets.reduce((prevT, currT) => {
              const prevDef = prevT.armies.infantry + prevT.armies.artillery + prevT.armies.tanks;
              const currDef = currT.armies.infantry + currT.armies.artillery + currT.armies.tanks;
              return prevDef < currDef ? prevT : currT;
            });

            const targetDefStrength = weakestTarget.armies.infantry + weakestTarget.armies.artillery + weakestTarget.armies.tanks;

            // Threshold reduzido: ataca se tiver paridade ou leve vantagem (era 1.2x)
            const aiAttackThreshold = aiUnderdog ? 1.0 : 1.1;
            if (aiTotalForces > targetDefStrength * aiAttackThreshold) {
              // Executa ataque da IA inimiga! Envia 70% das forças
              const sendInf = Math.round(aiProv.armies.infantry * 0.7);
              const sendArt = Math.round(aiProv.armies.artillery * 0.7);
              const sendTnk = Math.round(aiProv.armies.tanks * 0.7);

              const aiCombatUnits = { infantry: sendInf, artillery: sendArt, tanks: sendTnk };
              
              // Simulação
              const aiAttackerSupplied = supplyCache[aiProv.id] ?? true;
              const playerDefenderSupplied = supplyCache[weakestTarget.id] ?? true;

              const aiResult = simulateCombat(
                aiProv,
                weakestTarget,
                aiCombatUnits,
                playerDefenderSupplied,
                aiAttackerSupplied
              );

              // Atualiza forças de origem da IA
              aiProv.armies.infantry -= sendInf;
              aiProv.armies.artillery -= sendArt;
              aiProv.armies.tanks -= sendTnk;

              if (aiResult.winner === 'attacker') {
                // IA conquistou província do jogador!
                weakestTarget.controller = aiCountry;
                weakestTarget.armies = aiResult.attackerRemainingBeforeLogistics;
                
                aiTensionLogs.push(`[ATAQUE INIMIGO] Ofensiva devastadora do ${aiCountry} capturou nossa província de ${weakestTarget.name}!`);
                aiTensionLogs.push(`[Combate Inimigo] Infantaria remanescente do oponente: ${aiResult.attackerRemainingBeforeLogistics.infantry} divisões.`);
              } else {
                // Jogador resistiu ao ataque!
                weakestTarget.armies = aiResult.defenderRemainingBeforeLogistics;
                
                // IA sobrevivente recua
                aiProv.armies.infantry += aiResult.attackerRemainingBeforeLogistics.infantry;
                aiProv.armies.artillery += aiResult.attackerRemainingBeforeLogistics.artillery;
                aiProv.armies.tanks += aiResult.attackerRemainingBeforeLogistics.tanks;

                aiTensionLogs.push(`[ATAQUE REPELIDO] O inimigo tentou invadir ${weakestTarget.name}, mas nossas defesas integradas mantiveram a linha!`);
              }

              aiAttacksLaunched++;
            }
          }
        }
      }

      // 4. VERIFICAÇÃO DE VITÓRIA / DERROTA
      let phase = prev.gamePhase;
      const capitalIdPlayer = player === 'Brasil' ? 'BR-DF' : 'PY-ASU';
      const capitalIdOpponent = player === 'Brasil' ? 'PY-ASU' : 'BR-DF';

      const playerCapitalProv = updatedProvinces[capitalIdPlayer];
      const opponentCapitalProv = updatedProvinces[capitalIdOpponent];

      let winLossReason = '';

      if (playerCapitalProv.controller !== player) {
        phase = 'loss';
        winLossReason = 'Sua capital patriótica caiu sob intervenção militar inimiga extrema!';
      } else if (opponentCapitalProv.controller === player) {
        phase = 'win';
        winLossReason = 'VITÓRIA SUPREMA! Você capturou a capital inimiga e impôs capitulação total!';
      } else if (prev.popularity <= 10) {
        phase = 'loss';
        winLossReason = 'Seu governo ruiu devido à popularidade deplorável! Greves gerais e revoltas políticas cassaram seus poderes estratégicos.';
      } else if (prev.stability <= 10) {
        phase = 'loss';
        winLossReason = 'Colapso Social! A insurreição armada civil tomou conta do país por falta de estabilidade interna.';
      }

      // Estabilidade se recupera levemente se tiver alimento estocado
      let finalStability = prev.stability;
      if (updatedResources.food > 30) {
        finalStability = Math.min(100, finalStability + 2);
      } else {
        finalStability = Math.max(0, finalStability - 5);
        attritionLogs.push('[Crise Social] Reservas de alimentos baixas estão corroendo nossa estabilidade interna!');
      }
      // Aplica penalidades de déficit e imposto de guerra
      finalStability = Math.max(0, Math.min(100, finalStability + deficitPenalty.stability + taxPenalties.stability));
      const finalPopularity = Math.max(0, Math.min(100, prev.popularity + deficitPenalty.popularity + taxPenalties.popularity));

      // Balanço de logs
      const endTurnSummary = [
        `--- INÍCIO DO TURNO ${nextTurn} ---`,
        `Produção: +R$ ${finalMoneyGained}B (×${taxBonus.toFixed(1)} imposto), +${finalSteelGained}T Aço, +${finalOilGained}bbl Óleo, +${finalFoodGained}T Alimentos${finalEnergiaGained > 0 ? `, +${finalEnergiaGained}⚡ Energia` : ''}.`,
        `Manutenção: -R$${totalMaintenance}B (edifícios: ${buildingMaintenance}B, tropas: ${troopMaintenance}B). Moral: ${Math.round(morale)}%.`,
        `Consumo Militar: Alimento: -${foodConsumption}T, Petróleo: -${oilConsumption} bbl.`,
        ...aiTensionLogs,
        ...attritionLogs,
        ...prev.logs
      ];

      const weathers: ('clear' | 'rain' | 'mud' | 'fog')[] = ['clear', 'rain', 'mud', 'fog'];
      const nextWeather = weathers[Math.floor(Math.random() * weathers.length)];
      const nextCooldown = Math.max(0, (prev.foreignAidCooldown || 0) - 1);

      // Check Achievements
      let updatedAchs = [...(prev.unlockedAchievements || [])];
      
      // Counter player controlled provinces
      const ownCount = Object.values(updatedProvinces).filter((p: any) => p.controller === player).length;
      if (ownCount >= 12 && !updatedAchs.includes('conqueror_half')) {
        updatedAchs.push('conqueror_half');
        endTurnSummary.unshift(`🏆 DESBLOQUEADO: [Imperador Regional] Controlar mais de metade (12+) das províncias da Bacia do Prata!`);
      }

      if (nextTurn >= 10 && !updatedAchs.includes('decade_war')) {
        updatedAchs.push('decade_war');
        endTurnSummary.unshift(`🏆 DESBLOQUEADO: [Guerra de Atrito] Alcançar o Turno 10 de resistência estratégica!`);
      }

      return {
        ...prev,
        turn: nextTurn,
        resources: updatedResources,
        popularity: finalPopularity,
        stability: finalStability,
        provinces: updatedProvinces,
        gamePhase: phase,
        logs: endTurnSummary,
        selectedProvinceId: null,
        targetProvinceId: null,
        activeEvent: null,
        weather: nextWeather,
        foreignAidCooldown: nextCooldown,
        unlockedAchievements: updatedAchs,
      };
    });
    playSynthSound('nextTurn');
  };

  // Resetar o Jogo
  const resetGame = () => {
    setGameState({
      turn: 1,
      selectedProvinceId: null,
      targetProvinceId: null,
      playerCountry: 'Brasil',
      popularity: 75,
      stability: 80,
      allianceSupport: 45,
      resources: {
        money: 120,
        steel: 45,
        oil: 30,
        food: 65,
      },
      provinces: JSON.parse(JSON.stringify(INITIAL_PROVINCES)),
      activeEvent: null,
      logs: [
        'Teatro de Operações da Bacia do Prata ativado.',
        'Sistemas logísticos e de inteligência militar online.',
        'Escolha seu país comandante no painel para iniciar as hostilidades estratégica!'
      ],
      gamePhase: 'start',
      customEventLoading: false,
      isSoundMuted: gameState.isSoundMuted ?? false,
      foreignAidCooldown: 0,
      autoTurnInterval: false,
      previousDecisions: [],
      weather: 'clear',
      customNames: {},
      unlockedAchievements: [],
    });
    setRecruitingUnits({ infantry: 0, artillery: 0, tanks: 0 });
    setAdvisorAdvice('Comandante, aguardando início do turno para gerar conselho tático via satélite de IA.');
    playSynthSound('success');
  };

  // Ajuda para renderizar as conexões visuais no canvas/mapa de guerra
  const provincesAry = Object.values(gameState.provinces) as Province[];

  // Informações da província focada
  const selectedProvince = gameState.selectedProvinceId ? gameState.provinces[gameState.selectedProvinceId] : null;
  const targetProvince = gameState.targetProvinceId ? gameState.provinces[gameState.targetProvinceId] : null;

  // Cálculos dinâmicos em tempo de renderização (Melhorias 3, 4, 12, 16)
  const projectedInc = getProjectedReceipts();
  const totalProvincesCount = Object.keys(gameState.provinces).length;
  const playerProvincesCount = Object.values(gameState.provinces).filter((p: any) => p.controller === gameState.playerCountry).length;
  const progressPct = Math.round((playerProvincesCount / totalProvincesCount) * 100);

  // Consumo em tempo real do exército mobilizado do jogador
  const getConsumptions = () => {
    let totalInfantry = 0;
    let totalArtillery = 0;
    let totalTanks = 0;
    const player = gameState.playerCountry;
    provincesAry.forEach(prov => {
      if (prov.controller === player) {
        totalInfantry += prov.armies.infantry;
        totalArtillery += prov.armies.artillery;
        totalTanks += prov.armies.tanks;
      }
    });
    const oilVal = Math.round(totalInfantry * 0.1 + totalArtillery * 0.3 + totalTanks * 0.8);
    const foodVal = Math.round(totalInfantry * 0.3 + totalArtillery * 0.2 + totalTanks * 0.1);
    return { oil: oilVal, food: foodVal };
  };
  const currentConsumptions = getConsumptions();

  return (
    <div className="min-h-screen bg-stone-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-900 selection:text-emerald-100">
      
      {/* HEADER DE MANDO GEOPOLÍTICO */}
      <header className="border-b border-stone-800 bg-stone-900/90 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between sticky top-0 z-40 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-900 to-stone-900 rounded-lg border border-emerald-700/50 shadow-inner">
            <Flame className="w-6 h-6 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider uppercase text-stone-100 flex items-center">
              Fronteira Do Prata <span className="ml-2 text-xs py-0.5 px-2 bg-emerald-950 border border-emerald-600 text-emerald-400 font-mono rounded">v2026</span>
            </h1>
            <p className="text-xs text-stone-400 uppercase font-mono tracking-widest">Simulação Militar e Geopolítica sul-americana</p>
          </div>
        </div>

        {gameState.gamePhase === 'playing' && (
          <div className="flex flex-wrap items-center gap-4 text-sm font-mono mt-2 xl:mt-0">
            
            {/* Clima Atmosférico (Melhoria 5) */}
            <div className="flex items-center space-x-2 bg-stone-950/90 px-3 py-2 rounded-lg border border-stone-850" title="Condição climática em vigor sobre a Bacia. Chuva e Lama afetam mobilidade tática.">
              <Cloud className="w-4 h-4 text-sky-400" />
              <div className="text-left font-mono">
                <div className="text-[9px] text-stone-500 leading-none">CLIMA ATUAL</div>
                <span className="text-xs font-bold uppercase text-stone-300">
                  {gameState.weather === 'clear' && '☀️ Ensolarado'}
                  {gameState.weather === 'rain' && '🌧️ Tempestade'}
                  {gameState.weather === 'mud' && '🌾 Lamaçal'}
                  {gameState.weather === 'fog' && '🌫️ Nevoeiro'}
                </span>
              </div>
            </div>

            {/* Progresso de Campanha (Melhoria 4) */}
            <div className="flex flex-col bg-stone-950/90 px-3 py-1.5 rounded-lg border border-stone-850" title="Controle regional total das 23 províncias estratégicas para capitulação.">
              <div className="flex justify-between items-center text-[10px] text-stone-400 mb-0.5">
                <span>CONQUISTA INTEGRAL</span>
                <span className="font-bold text-emerald-400 pl-3">{playerProvincesCount}/23 ({progressPct}%)</span>
              </div>
              <div className="w-32 bg-stone-850 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-cyan-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
              </div>
            </div>

            {/* Recursos estratégicos com Previsões de Produção Real (Melhoria 3) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-stone-950/80 p-2 rounded-lg border border-stone-800">
              <div className="flex items-center space-x-2 px-1" title="Dinheiro: Fundos de Campanha nacional.">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <div>
                  <div className="text-[9px] text-stone-500 leading-none">DINHEIRO</div>
                  <span className="font-bold text-amber-400 text-xs">R$ {gameState.resources.money}B</span>
                  <div className="text-[9px] text-emerald-500 leading-none mt-0.5" title="Lucro estimado para o próximo turno">+R$ {projectedInc.money}B</div>
                </div>
              </div>

              <div className="flex items-center space-x-2 px-1" title="Aço: Essencial para forjar Tanques e Artilharias.">
                <HardHat className="w-3.5 h-3.5 text-cyan-400" />
                <div>
                  <div className="text-[9px] text-stone-500 leading-none">AÇO</div>
                  <span className="font-bold text-cyan-300 text-xs">{gameState.resources.steel}MT</span>
                  <div className="text-[9px] text-cyan-400 leading-none mt-0.5" title="Produção líquida estimada">+ {projectedInc.steel}MT</div>
                </div>
              </div>

              <div className="flex items-center space-x-2 px-1" title="Petróleo: Abastecimento de blindados.">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <div>
                  <div className="text-[9px] text-stone-500 leading-none">NAFTA</div>
                  <span className="font-bold text-orange-400 text-xs">{gameState.resources.oil} bbl</span>
                  <div className="text-[9px] text-amber-500 leading-none mt-0.5 flex flex-wrap gap-1">
                    <span className="text-emerald-500">+{projectedInc.oil}</span>
                    <span className="text-rose-500">-{currentConsumptions.oil}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 px-1" title="Alimentos: Preserva estabilidade e previne atrito civil.">
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <div className="text-[9px] text-stone-500 leading-none">MANTIMENTOS</div>
                  <span className="font-bold text-emerald-400 text-xs">{gameState.resources.food}ton</span>
                  <div className="text-[9px] text-emerald-500 leading-none mt-0.5 flex flex-wrap gap-1">
                    <span>+{projectedInc.food}</span>
                    <span className="text-rose-500">-{currentConsumptions.food}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 px-1" title="Energia: Gerada por hidroelétricas. Potencializa indústria.">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <div>
                  <div className="text-[9px] text-stone-500 leading-none">ENERGIA</div>
                  <span className="font-bold text-yellow-300 text-xs">{gameState.resources.energia ?? 0}⚡</span>
                  <div className="text-[9px] text-yellow-500 leading-none mt-0.5">MW acum.</div>
                </div>
              </div>
            </div>

            {/* Popularidade, Estabilidade, Moral e Aviação */}
            <div className="flex items-center space-x-3 bg-stone-900 border border-stone-850 p-2 rounded-lg">
              <div className="flex items-center space-x-1.5" title="Aprovação Civil">
                <Vote className="w-3.5 h-3.5 text-rose-500" />
                <div>
                  <div className="text-[9px] text-stone-500 leading-none">APROVAÇÃO</div>
                  <span className="text-xs font-bold text-rose-400">{gameState.popularity}%</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5" title="Estabilidade">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <div className="text-[9px] text-stone-500 leading-none">ORDEM</div>
                  <span className="text-xs font-bold text-emerald-400">{gameState.stability}%</span>
                </div>
              </div>
              {(() => {
                const morale = Math.max(20, Math.min(100, 50 + (gameState.resources.food - 30) * 1.2 + (gameState.stability - 50) * 0.4));
                const moraleColor = morale >= 70 ? 'text-emerald-400' : morale >= 45 ? 'text-amber-400' : 'text-rose-400';
                return (
                  <div className="flex items-center space-x-1.5" title="Moral das tropas (afeta eficácia em combate)">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <div className="text-[9px] text-stone-500 leading-none">MORAL</div>
                      <span className={`text-xs font-bold ${moraleColor}`}>{Math.round(morale)}%</span>
                    </div>
                  </div>
                );
              })()}
              {(gameState.aviation ?? 0) > 0 && (
                <div className="flex items-center space-x-1.5" title="Esquadrões de aviação disponíveis">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <div>
                    <div className="text-[9px] text-stone-500 leading-none">AVIAÇÃO</div>
                    <span className="text-xs font-bold text-sky-400">{gameState.aviation}✈</span>
                  </div>
                </div>
              )}
            </div>

            {/* Save / Load */}
            <div className="flex gap-1.5 bg-stone-950 p-1.5 rounded-lg border border-stone-850 relative">
              <button
                onClick={saveGame}
                className="p-1.5 border border-stone-800 hover:border-amber-600/50 rounded bg-stone-900 text-stone-300 hover:text-amber-400 cursor-pointer transition flex items-center justify-center"
                title="Salvar Agora"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={loadGame}
                disabled={!hasSave}
                className="p-1.5 border border-stone-800 hover:border-amber-600/50 rounded bg-stone-900 text-stone-300 hover:text-amber-400 cursor-pointer transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                title="Carregar Save"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              {saveNotification && (
                <div className="absolute -top-8 left-0 bg-stone-800 border border-stone-700 text-stone-100 text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {saveNotification}
                </div>
              )}
            </div>

            {/* Mudo e Auto Avanço Tático (Melhorias 1, 14, 20) */}
            <div className="flex gap-1.5 bg-stone-950 p-1.5 rounded-lg border border-stone-850">
              {/* Botão de Som Mudo */}
              <button
                onClick={() => setGameState(prev => ({ ...prev, isSoundMuted: !prev.isSoundMuted }))}
                className="p-1.5 border border-stone-800 hover:border-stone-700 rounded bg-stone-900 text-stone-300 hover:text-stone-100 cursor-pointer transition flex items-center justify-center"
                title={gameState.isSoundMuted ? "Ativar Áudio Militar Retro" : "Mutar Áudio Retro"}
              >
                {gameState.isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
              </button>

              {/* Botão de Auto-Turno Spectator */}
              <button
                onClick={() => {
                  setGameState(prev => ({ ...prev, autoTurnInterval: !prev.autoTurnInterval }));
                  playSynthSound('click');
                }}
                className={`px-2 py-1 text-[10px] rounded border font-mono font-bold transition flex items-center space-x-1 cursor-pointer ${gameState.autoTurnInterval ? 'bg-sky-950 text-sky-400 border-sky-600 animate-pulse' : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'}`}
                title="Avança turno automaticamente a cada 5 segundos para modo analista passivo."
              >
                <span>📺 AUTO: {gameState.autoTurnInterval ? 'ON' : 'OFF'}</span>
              </button>

              {/* Redefinir Rápido */}
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja rescindir do mando atual e resetar a simulação?')) {
                    resetGame();
                  }
                }}
                className="p-1.5 border border-stone-800 hover:bg-stone-800 text-stone-400 hover:text-rose-400 rounded cursor-pointer transition"
                title="Rescindir Mando (Reiniciar Jogo)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Turno e Avançar */}
            <div className="flex items-center gap-2">
              <div className="text-center bg-emerald-950/60 text-emerald-400 border border-emerald-850 px-2.5 py-1.5 rounded-lg">
                <span className="text-[8px] block text-stone-400 uppercase tracking-widest font-sans">TURNO</span>
                <span className="text-sm font-black">{gameState.turn}</span>
              </div>

              <button
                onClick={handleEndTurn}
                className="px-4 py-2.5 rounded-lg font-bold bg-amber-600 hover:bg-amber-700 text-stone-950 flex items-center space-x-1.5 shadow-md transition-all active:scale-95 text-xs cursor-pointer border border-amber-500"
              >
                <span>Avançar Turno</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* TELA DE INTRODUÇÃO / SELEÇÃO DE PAÍS */}
      {gameState.gamePhase === 'start' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-900 via-stone-950 to-black">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1547394765-185e1e68f34e?auto=format&fit=crop&w=1500&q=80')] opacity-5 mix-blend-overlay pointer-events-none"></div>
          
          <div className="max-w-3xl text-center space-y-8 relative z-10 bg-stone-900/85 p-8 rounded-2xl border border-stone-800 shadow-2xl backdrop-blur">
            <div className="inline-block px-3 py-1 bg-emerald-950/70 border border-emerald-600 text-emerald-400 text-xs font-mono tracking-widest rounded-full uppercase">
              Operações de Guerra Sul-Americana • 2026/2027
            </div>
            
            <div className="space-y-3">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-100 uppercase">
                Teatro De Conflito Do Prata
              </h2>
              <p className="text-lg text-stone-300 max-w-xl mx-auto">
                Assuma os destinos nacionais e conduza forças militares em uma guerra tática futura. Gerencie as cadeias de suprimentos agrícolas e minerais, responda a agitações civis e envie tanques de invasão.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {/* Opção Brasil */}
              <div className="border border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40 p-6 rounded-xl text-left flex flex-col justify-between transition duration-200 hover:border-emerald-600 shadow-md group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-emerald-400">REPÚBLICA DO BRASIL</span>
                    <span className="text-xs bg-emerald-950 border border-emerald-600/50 px-2 py-0.5 text-emerald-400 rounded-md font-mono">POTÊNCIA AGRO-INDUSTRIAL</span>
                  </div>
                  <p className="text-sm text-stone-400 mb-4 h-24">
                    Comandando as divisões de Mato Grosso do Sul, Paraná e São Paulo. Excelente capacidade industrial e reservas volumosas de alimentos, mas vulnerável à pressão de estabilidade internacional pela diplomacia externa.
                  </p>
                  <ul className="text-xs space-y-1.5 font-mono text-stone-300 bg-stone-950/70 p-3 rounded-lg border border-stone-850">
                    <li className="flex justify-between"><span>Capital Operacional:</span> <span className="text-emerald-400 font-bold">Distrito Federal (BR-DF)</span></li>
                    <li className="flex justify-between"><span>Fluxo Financeiro Inicial:</span> <span className="text-amber-400 font-bold">R$ 140B</span></li>
                    <li className="flex justify-between"><span>Vantagem Bélica:</span> <span className="text-stone-100 font-bold">Alta Infantaria & Aço</span></li>
                  </ul>
                </div>
                <button
                  onClick={() => startGame('Brasil')}
                  className="mt-6 w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-lg uppercase tracking-wider text-sm transition-all focus:ring-4 focus:ring-emerald-800 shadow-md flex items-center justify-center space-x-2"
                >
                  <span>Assumir Força Brasileira</span>
                  <Play className="w-4 h-4 fill-current text-stone-950" />
                </button>
              </div>

              {/* Opção Paraguai */}
              <div className="border border-orange-900/60 bg-orange-950/10 hover:bg-orange-950/20 p-6 rounded-xl text-left flex flex-col justify-between transition duration-200 hover:border-orange-600 shadow-md group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-orange-400">REPÚBLICA DO PARAGUAI</span>
                    <span className="text-xs bg-orange-950 border border-orange-600/50 px-2 py-0.5 text-orange-400 rounded-md font-mono">GEOPOLÍTICA PETROLÍFERA</span>
                  </div>
                  <p className="text-sm text-stone-400 mb-4 h-24">
                    Comandando múltiplos departamentos da Bacia do Rio Paraguai. Menor orçamento de partida, mas ostentando o controle de abundantes reservas naftas estratégicas no Chaco (Boquerón), ideais para mobilidade rápida e táticas rápidas de tanques.
                  </p>
                  <ul className="text-xs space-y-1.5 font-mono text-stone-300 bg-stone-950/70 p-3 rounded-lg border border-stone-850">
                    <li className="flex justify-between"><span>Capital Operacional:</span> <span className="text-orange-400 font-bold">Asunción (PY-ASU)</span></li>
                    <li className="flex justify-between"><span>Fluxo Financeiro Inicial:</span> <span className="text-amber-400 font-bold">R$ 100B</span></li>
                    <li className="flex justify-between"><span>Vantagem Bélica:</span> <span className="text-stone-100 font-bold">Extremo Petróleo & Fortificações</span></li>
                  </ul>
                </div>
                <button
                  onClick={() => startGame('Paraguai')}
                  className="mt-6 w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-stone-950 font-bold rounded-lg uppercase tracking-wider text-sm transition-all focus:ring-4 focus:ring-orange-800 shadow-md flex items-center justify-center space-x-2"
                >
                  <span>Assumir Força Paraguaia</span>
                  <Play className="w-4 h-4 fill-current text-stone-950" />
                </button>
              </div>
            </div>

            {hasSave && (
              <div className="border-t border-stone-800/80 pt-6">
                <button
                  onClick={loadGame}
                  className="w-full py-3 bg-stone-800 hover:bg-stone-700 border border-stone-600 hover:border-amber-600/60 text-stone-100 font-bold rounded-lg uppercase tracking-wider text-sm transition-all flex items-center justify-center space-x-2"
                >
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                  <span>Continuar Partida</span>
                </button>
                <p className="text-[10px] font-mono text-stone-500 mt-2 text-center">
                  Retoma o último save automático
                </p>
              </div>
            )}

            <div className="text-xs font-mono text-stone-500 border-t border-stone-800/80 pt-6">
              Grand Strategy Game desenvolvido com integração ativa de Inteligência Artificial para roteiros e táticas de campo.
            </div>
          </div>
        </main>
      )}

      {/* FLUXO PRINCIPAL DO JOGO (TEATRO DE OPERAÇÕES) */}
      {gameState.gamePhase === 'playing' && (
        <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 p-5 bg-stone-950">
          
          {/* TABELA ESQUERDA: MAPA DO TABULEIRO (7 COLUNAS) */}
          <section className="xl:col-span-7 flex flex-col bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-2xl relative min-h-[500px] xl:min-h-[700px]">
            {/* Abas e Status da Frente */}
            <div className="bg-stone-950 p-4 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-sm tracking-wider uppercase">Fronte Integrado Geopolítico</span>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => setActiveTab('map')} 
                  className={`text-xs font-mono font-bold px-3 py-1.5 rounded transition ${activeTab === 'map' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' : 'text-stone-400 hover:text-stone-100 hover:bg-stone-850'}`}
                >
                  Mapa de Operações
                </button>
                <button 
                  onClick={() => setActiveTab('diplomacy')} 
                  className={`text-xs font-mono font-bold px-3 py-1.5 rounded transition ${activeTab === 'diplomacy' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' : 'text-stone-400 hover:text-stone-100 hover:bg-stone-850'}`}
                >
                  Análise Logística
                </button>
                <button 
                  onClick={() => setActiveTab('help')} 
                  className={`text-xs font-mono font-bold px-3 py-1.5 rounded transition ${activeTab === 'help' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' : 'text-stone-400 hover:text-stone-100 hover:bg-stone-850'}`}
                >
                  Manual da Campanha
                </button>
              </div>
            </div>

            {activeTab === 'map' && (
              <div className="flex-1 relative flex flex-col items-center justify-start p-4 min-h-[460px] bg-stone-950/60 overflow-hidden">
                
                {/* TOOLBAR CONTROLLER DO MAPA (TÁTICO / SATÉLITE + 3D) */}
                <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 bg-stone-900 border border-stone-850 p-3 rounded-xl z-20 shadow-md">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-stone-400 font-mono tracking-wider uppercase font-bold flex items-center">
                      <Layers className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
                      Visualização:
                    </span>
                    <div className="flex bg-stone-950 p-1 rounded-lg border border-stone-800">
                      <button 
                        onClick={() => { setMapMode('2d'); }}
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded transition flex items-center space-x-1 ${mapMode === '2d' ? 'bg-stone-800 text-stone-100 border border-stone-750' : 'text-stone-400 hover:text-stone-200'}`}
                        title="Visão Plana 2D Convencional"
                      >
                        <span>2D Plano</span>
                      </button>
                      <button 
                        onClick={() => { setMapMode('3d'); }}
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded transition flex items-center space-x-1 ${mapMode === '3d' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'text-stone-400 hover:text-stone-200'}`}
                        title="3D com perspectiva orbital e extrusões de relevo"
                      >
                        <span>3D Holográfico</span>
                      </button>
                      <button 
                        onClick={() => { setMapMode('satellite'); }}
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded transition flex items-center space-x-1 ${mapMode === 'satellite' ? 'bg-blue-950 text-blue-400 border border-blue-900' : 'text-stone-400 hover:text-stone-200'}`}
                        title="Satélite Geográfico Real de Alta Resolução via Esri"
                      >
                        <Globe className="w-3 h-3 animate-pulse text-blue-400" />
                        <span>Satelite Real</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-stone-400 font-mono tracking-wider uppercase font-bold flex items-center">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500 mr-1.5" />
                      Estilo:
                    </span>
                    <div className="flex bg-stone-950 p-1 rounded-lg border border-stone-800">
                      <button 
                        onClick={() => setMapSkin('political')}
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded transition ${mapSkin === 'political' ? 'bg-stone-800 text-stone-100 border border-stone-750' : 'text-stone-400 hover:text-stone-200'}`}
                        title="Visão Geral Política por País"
                      >
                        Político
                      </button>
                      <button 
                        onClick={() => setMapSkin('satellite')}
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded transition flex items-center space-x-1 ${mapSkin === 'satellite' ? 'bg-blue-950 text-blue-400 border border-blue-900/50' : 'text-stone-400 hover:text-stone-200'}`}
                        title="Visualização por satélite com rios, relevos e biomas reais do Prata"
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span>Satélite</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subpanel de Controles Deslizantes 3D Ativos */}
                {mapMode === '3d' && (
                  <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-stone-900/40 border border-stone-850 p-3 rounded-lg text-xs font-mono text-stone-400 select-none">
                    <div className="flex items-center justify-between space-x-2">
                      <span>Rotação Z (Yaw): {yaw.toFixed(0)}°</span>
                      <input 
                        type="range" 
                        min="-180" 
                        max="180" 
                        value={yaw} 
                        onChange={(e) => setYaw(Number(e.target.value))} 
                        className="w-24 accent-emerald-500 h-1 rounded-lg bg-stone-950" 
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <span>Inclinação (Pitch): {pitch.toFixed(0)}°</span>
                      <input 
                        type="range" 
                        min="15" 
                        max="85" 
                        value={pitch} 
                        onChange={(e) => setPitch(Number(e.target.value))} 
                        className="w-24 accent-emerald-500 h-1 rounded-lg bg-stone-950" 
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <span>Zoom: {zoom.toFixed(1)}x</span>
                      <input 
                        type="range" 
                        min="0.6" 
                        max="1.8" 
                        step="0.1"
                        value={zoom} 
                        onChange={(e) => setZoom(Number(e.target.value))} 
                        className="w-24 accent-emerald-500 h-1 rounded-lg bg-stone-950" 
                      />
                    </div>
                    <button 
                      onClick={handleResetMapPosition}
                      className="p-1 px-3 bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-300 font-bold rounded flex items-center justify-center space-x-1.5 transition self-center cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resetar Ângulos</span>
                    </button>
                  </div>
                )}

                {/* Dica do Visor */}
                {mapMode === '3d' && (
                  <div className="text-[10px] text-emerald-500/80 uppercase font-mono tracking-widest mb-3 animate-pulse bg-emerald-950/20 border border-emerald-900/30 px-3 py-1 rounded">
                    ⚡ Modo Órbita Livre: clique e arraste o mouse no mapa para rotacionar o Teatro 3D
                  </div>
                )}

                {/* Legendas coloridas */}
                <div className="absolute top-28 left-4 bg-stone-900/95 border border-stone-800 p-2.5 rounded-lg text-xs space-y-2 z-10 font-mono">
                  <div className="font-bold border-b border-stone-800 pb-1 mb-1 text-stone-300">LEGENDA DO FRONTE</div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-950 border border-emerald-500 block"></span>
                    <span>Território do Brasil</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 rounded bg-amber-950 border border-amber-600 block"></span>
                    <span>Território do Paraguai</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-stone-400 border-t border-stone-850 pt-1 mt-1">
                    <span>* Clique para selecionar. Conecte com vizinho para atacar.</span>
                  </div>
                  {mapMode === '3d' && (
                    <div className="border-t border-stone-850 pt-1 mt-1 space-y-1 text-[10px] text-stone-500">
                      <div className="font-bold text-stone-400 mb-0.5">CONTROLES 3D</div>
                      <div>🖱️ Arrastar → rotacionar</div>
                      <div>📐 Barra Pitch → inclinar</div>
                      <div>🔎 Barra Zoom → aproximar</div>
                      <div>↺ Resetar → restaurar ângulos</div>
                    </div>
                  )}
                </div>

                {/* VISUALIZAÇÃO DO MAPA INTEGRADO */}
                {mapMode === 'satellite' ? (
                  <div className="w-full max-w-[800px] aspect-[4/3] rounded-xl overflow-hidden border border-stone-800 shadow-2xl relative z-0">
                    <RealSatelliteMap 
                      provinces={gameState.provinces}
                      selectedProvinceId={gameState.selectedProvinceId}
                      targetProvinceId={gameState.targetProvinceId}
                      playerCountry={gameState.playerCountry}
                      onSelectProvince={handleSelectProvince}
                    />
                  </div>
                ) : (
                  <div 
                    className="w-full max-w-[800px] aspect-[4/3] relative flex items-center justify-center p-3 transition-all duration-300 overflow-visible"
                    style={{
                      perspective: mapMode === '3d' ? '1200px' : 'none',
                      perspectiveOrigin: '50% 50%',
                    }}
                    onMouseDown={handleMapMouseDown}
                    onMouseMove={handleMapMouseMove}
                  >
                    {/* CANVAS TRIDIMENSIONAL DO EXTRATOR DE PROVÍNCIAS */}
                  <div
                    className="w-full h-full relative"
                    style={{
                      transform: mapMode !== '2d' 
                        ? `rotateX(${pitch}deg) rotateZ(${yaw}deg) scale(${zoom})` 
                        : 'none',
                      transformStyle: 'preserve-3d',
                      transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                    }}
                  >
                    <svg 
                      viewBox="0 0 800 600" 
                      className="w-full h-full select-none overflow-visible rounded-xl border border-stone-800 shadow-2xl bg-stone-900"
                      id="tactical_military_map"
                    >
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={mapSkin === 'satellite' ? '#1b2d18' : '#262626'} strokeWidth="0.5" />
                        </pattern>
                        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                        </marker>
                      </defs>
                      
                      {/* CAMADA INFERIOR DO SATÉLITE (BIOMAS, COORDENADAS, RIOS) */}
                      {mapSkin === 'satellite' ? (
                        <g id="satellite_radar_layer">
                          {/* Biomas do entorno fora dos polígonos */}
                          <rect width="100%" height="100%" fill="#080c09" />
                          
                          {/* Linhas de Grade de Longitude / Latitude */}
                          <g stroke="#10b981" strokeWidth="0.5" strokeOpacity="0.12" fill="none">
                            <line x1="100" y1="0" x2="100" y2="600" />
                            <line x1="200" y1="0" x2="200" y2="600" />
                            <line x1="300" y1="0" x2="300" y2="600" />
                            <line x1="400" y1="0" x2="400" y2="600" />
                            <line x1="500" y1="0" x2="500" y2="600" />
                            <line x1="600" y1="0" x2="600" y2="600" />
                            <line x1="700" y1="0" x2="700" y2="600" />
                            
                            <line x1="0" y1="100" x2="800" y2="100" />
                            <line x1="0" y1="200" x2="800" y2="200" />
                            <line x1="0" y1="300" x2="800" y2="300" />
                            <line x1="0" y1="400" x2="800" y2="400" />
                            <line x1="0" y1="500" x2="800" y2="500" />
                          </g>

                          {/* Rótulos Geográficos Militares */}
                          <g fill="#10b981" fontSize="9" fontFamily="monospace" opacity="0.45">
                            <text x="15" y="115">LAT: 20°00' S</text>
                            <text x="15" y="215">LAT: 22°30' S</text>
                            <text x="15" y="315">LAT: 25°00' S</text>
                            <text x="15" y="415">LAT: 27°30' S</text>
                            <text x="15" y="515">LAT: 30°00' S</text>
                            
                            <text x="105" y="585">LON: 62°00' W</text>
                            <text x="205" y="585">LON: 59°30' W</text>
                            <text x="305" y="585">LON: 57°00' W</text>
                            <text x="405" y="585">LON: 54°30' W</text>
                            <text x="505" y="585">LON: 52°00' W</text>
                            <text x="605" y="585">LON: 49°30' W</text>
                            <text x="705" y="585">LON: 47°00' W</text>
                          </g>

                          {/* DESENHO DOS RIOS MAIORES (BACIA GEOGRÁFICA DO PRATA) */}
                          <path 
                            d="M 230,20 Q 210,100 240,150 T 320,220 T 290,290 T 330,370 T 290,405 T 235,430 T 215,580" 
                            stroke="#0f1d2c" 
                            strokeWidth="9" 
                            fill="none" 
                            strokeLinecap="round" 
                          />
                          <path 
                            d="M 230,20 Q 210,100 240,150 T 320,220 T 290,290 T 330,370 T 290,405 T 235,430 T 215,580" 
                            stroke="#0284c7" 
                            strokeWidth="2.5" 
                            fill="none" 
                            strokeLinecap="round" 
                            className="opacity-75 animate-pulse"
                          />
                          
                          <path 
                            d="M 750,230 Q 660,280 610,340 T 450,360 T 390,450 T 320,480" 
                            stroke="#0f1d2c" 
                            strokeWidth="8" 
                            fill="none" 
                          />
                          <path 
                            d="M 750,230 Q 660,280 610,340 T 450,360 T 390,450 T 320,480" 
                            stroke="#0284c7" 
                            strokeWidth="2.2" 
                            fill="none" 
                            className="opacity-70 animate-pulse"
                          />

                          <g fill="none" stroke="#222b1c" strokeWidth="1" opacity="0.3">
                            <path d="M 680,180 Q 710,190 730,220 M 690,195 Q 715,205 730,235" />
                            <path d="M 650,360 Q 670,380 680,410" />
                            <path d="M 600,460 Q 615,470 630,500" />
                          </g>

                          {/* Nuvens Drifting para dar profundidade espacial */}
                          <g opacity="0.1" className="pointer-events-none">
                            <ellipse cx="250" cy="150" rx="140" ry="40" fill="white" filter="blur(30px)" className="animate-[pulse_8s_infinite]" />
                            <ellipse cx="600" cy="400" rx="200" ry="50" fill="white" filter="blur(40px)" className="animate-[pulse_12s_infinite]" />
                          </g>
                        </g>
                      ) : (
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      )}

                      {/* LINKS / CONEXÕES LOGÍSTICAS DE INFRAESTRUTURA */}
                      <g opacity={mapSkin === 'satellite' ? '0.6' : '0.35'}>
                        {provincesAry.map((prov) => {
                          return prov.connections.map(targetId => {
                            const target = gameState.provinces[targetId];
                            if (!target) return null;
                            if (prov.id > targetId) return null;
                            
                            return (
                              <line 
                                key={`${prov.id}-${targetId}`}
                                x1={prov.coordinates.x}
                                y1={prov.coordinates.y}
                                x2={target.coordinates.x}
                                y2={target.coordinates.y}
                                stroke={mapSkin === 'satellite' ? '#10b981' : '#525252'}
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                              />
                            );
                          });
                        })}
                      </g>

                      {/* SETA DE ATAQUE SELECIONADA */}
                      {selectedProvince && targetProvince && (
                        <line
                          x1={selectedProvince.coordinates.x}
                          y1={selectedProvince.coordinates.y}
                          x2={targetProvince.coordinates.x}
                          y2={targetProvince.coordinates.y}
                          stroke="#f59e0b"
                          strokeWidth="3.5"
                          markerEnd="url(#arrow)"
                          strokeDasharray="2 2"
                          className="animate-pulse"
                        />
                      )}

                      {/* POLYGONS / PROVÍNCIAS NO TABULEIRO COM SUPORTE PARA EXTRUSÃO 3D DE BLOCO */}
                      {provincesAry.map((prov) => {
                        const isOwner = prov.controller === gameState.playerCountry;
                        const isSelected = gameState.selectedProvinceId === prov.id;
                        const isTarget = gameState.targetProvinceId === prov.id;
                        const totalTroops = prov.armies.infantry + prov.armies.artillery + prov.armies.tanks;
                        
                        // Cores de fundo dinâmicas (Suporta biomas reais e afiliações políticas)
                        let fillHexColor = "#262626";
                        let strokeColor = "stroke-stone-700";
                        
                        if (mapSkin === 'political') {
                          if (prov.controller === 'Brasil') {
                            fillHexColor = isSelected ? "#064e3b" : "#022c22"; // emerald-900 vs emerald-950
                            strokeColor = "stroke-emerald-600/60";
                          } else {
                            fillHexColor = isSelected ? "#78350f" : "#451a03"; // amber-900 vs amber-950
                            strokeColor = "stroke-amber-700/60";
                          }
                        } else {
                          // Biomas Geográficos do Brasil e Paraguai (Estilo Satélite)
                          let biomeColor = '#3a492f'; // Padrão campos
                          if (prov.id === 'PY-BOQ' || prov.id === 'PY-APY') {
                            biomeColor = '#4a442e'; // Chaco Seco (Árido, Arenoso)
                          } else if (prov.id === 'PY-PHY' || prov.id === 'PY-CON' || prov.id === 'PY-SAP') {
                            biomeColor = '#3c4728'; // Chaco Úmido (Transicional)
                          } else if (prov.id === 'BR-MS' || prov.id === 'BR-MT' || prov.id === 'BR-GO') {
                            biomeColor = '#244525'; // Cerrado e Pantanal
                          } else if (prov.id === 'BR-SP' || prov.id === 'BR-PR' || prov.id === 'BR-SC' || prov.id === 'BR-MG' || prov.id === 'BR-DF') {
                            biomeColor = '#103517'; // Floresta Atlântica / Highlands
                          } else if (prov.id === 'BR-RS' || prov.id === 'PY-NEE' || prov.id === 'PY-MIS' || prov.id === 'PY-ITA') {
                            biomeColor = '#2e4524'; // Pampas / Campos Sulistas
                          }
                          
                          // Ajusta cor dependendo da seleção ou se é alvo do ataque
                          if (isSelected) {
                            fillHexColor = prov.controller === 'Brasil' ? '#1b5e20' : '#856404';
                          } else {
                            fillHexColor = biomeColor;
                          }
                          
                          strokeColor = isSelected 
                            ? "stroke-emerald-400" 
                            : (prov.controller === 'Brasil' ? "stroke-emerald-900/60" : "stroke-amber-900/60");
                        }
                        
                        if (isTarget) {
                          strokeColor = "stroke-amber-400";
                        }

                        const renderExtrudedWallsValue = mapMode !== '2d';

                        return (
                          <g 
                            key={prov.id}
                            className="cursor-pointer group"
                            onClick={() => handleSelectProvince(prov.id)}
                            id={`province_${prov.id}`}
                          >
                            {/* EXTRUSÃO 3D: Paredes laterais para criar volume do bloco de madeira/board */}
                            {renderExtrudedWallsValue && prov.points && (
                              <g opacity={isSelected ? "0.95" : "0.75"}>
                                {Array.from({ length: isSelected ? 12 : 5 }).map((_, idx) => {
                                  const offset = idx + 1;
                                  return (
                                    <polygon 
                                      key={`wall-${idx}`}
                                      points={prov.points}
                                      style={{
                                        transform: `translate(${-offset * 0.6}px, ${offset * 0.6}px)`,
                                      }}
                                      className="fill-black/35 stroke-black/45 pointer-events-none"
                                      strokeWidth="0.5"
                                    />
                                  );
                                })}
                              </g>
                            )}

                            {/* Círculo de extrusão para províncias pequenas sem pontos poligonais */}
                            {renderExtrudedWallsValue && !prov.points && (
                              <g opacity={isSelected ? "0.95" : "0.75"}>
                                {Array.from({ length: isSelected ? 12 : 5 }).map((_, idx) => {
                                  const offset = idx + 1;
                                  return (
                                    <circle 
                                      key={`wall-c-${idx}`}
                                      cx={prov.coordinates.x}
                                      cy={prov.coordinates.y}
                                      r="35"
                                      style={{
                                        transform: `translate(${-offset * 0.6}px, ${offset * 0.6}px)`,
                                      }}
                                      className="fill-black/35 stroke-black/45 pointer-events-none"
                                      strokeWidth="0.5"
                                    />
                                  );
                                })}
                              </g>
                            )}

                            {/* POLÍGONO SUPERIOR DO TOPO DA PROVÍNCIA */}
                            {prov.points ? (
                              <polygon 
                                points={prov.points}
                                fill={fillHexColor}
                                className={`transition duration-150 ${strokeColor} hover:fill-opacity-90`}
                                strokeWidth={isSelected || isTarget ? "2.5" : "1.2"}
                                style={{
                                  transform: isSelected && renderExtrudedWallsValue ? 'translate(-8px, -8px)' : 'none',
                                  transition: 'transform 0.15s ease-out, fill 0.15s, stroke 0.15s',
                                  filter: mapSkin === 'satellite' ? 'brightness(1.1)' : 'none',
                                }}
                              />
                            ) : (
                              <circle 
                                cx={prov.coordinates.x}
                                cy={prov.coordinates.y}
                                r="35"
                                fill={fillHexColor}
                                className={`transition duration-150 ${strokeColor} hover:fill-opacity-90`}
                                strokeWidth={isSelected || isTarget ? "2.5" : "1.2"}
                                style={{
                                  transform: isSelected && renderExtrudedWallsValue ? 'translate(-8px, -8px)' : 'none',
                                  transition: 'transform 0.15s ease-out, fill 0.15s, stroke 0.15s',
                                  filter: mapSkin === 'satellite' ? 'brightness(1.1)' : 'none',
                                }}
                              />
                            )}

                            {/* TEXTO: NOME DA PROVÍNCIA E TROPAS */}
                            <foreignObject
                              x={prov.coordinates.y > 380 ? prov.coordinates.x - 55 : prov.coordinates.x - 55}
                              y={prov.coordinates.y - 20}
                              width="110"
                              height="45"
                              className="pointer-events-none"
                              style={{
                                transform: isSelected && renderExtrudedWallsValue ? 'translate(-8px, -8px)' : 'none',
                                transition: 'transform 0.15s ease-out',
                                transformStyle: 'preserve-3d',
                              }}
                            >
                              <div className="flex flex-col items-center justify-center text-center font-sans">
                                <div className={`text-[9px] font-black tracking-tight leading-none truncate max-w-[100px] rounded px-1.5 py-0.5 text-white bg-black/85 flex items-center justify-center space-x-1 border ${isSelected ? 'border-emerald-400 text-yellow-300' : 'border-stone-850'}`}>
                                  {prov.id === 'BR-DF' || prov.id === 'PY-ASU' ? (
                                    <span className="text-yellow-400">★</span>
                                  ) : null}
                                  <span>{prov.name}</span>
                                </div>
                                
                                <div className="flex items-center space-x-1.5 mt-1 bg-stone-950/90 px-1 rounded-sm border border-stone-800 text-[10px] font-mono font-bold leading-normal text-stone-200">
                                  {totalTroops > 0 ? (
                                    <>
                                      <span>⚔️</span>
                                      <span className={isOwner ? "text-emerald-400" : "text-amber-400"}>
                                        {totalTroops}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-stone-500 font-normal text-[8px]">Sem guarnição</span>
                                  )}
                                </div>
                              </div>
                            </foreignObject>
                          </g>
                        );
                      })}

                      {/* SÍMBOLOS EXTRAS PARA INFRAESTRUTURAS IMPORTADAS */}
                      {provincesAry.map((prov) => {
                        const totalBuilds = prov.buildings.industrial + prov.buildings.refinery + prov.buildings.fortress + prov.buildings.logistics;
                        if (totalBuilds <= 0) return null;

                        const isSelected = gameState.selectedProvinceId === prov.id;
                        const renderExtrudedWallsValue = mapMode !== '2d';

                        return (
                          <circle
                            key={`inst_${prov.id}`}
                            cx={prov.coordinates.x + 30}
                            cy={prov.coordinates.y + 20}
                            r="5"
                            className="fill-cyan-400 stroke-neutral-900 animate-pulse pointer-events-none"
                            style={{
                              transform: isSelected && renderExtrudedWallsValue ? 'translate(-8px, -8px)' : 'none',
                              transition: 'transform 0.15s ease-out',
                            }}
                            title={`${totalBuilds} estruturas construídas nesta província`}
                          />
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}
              </div>
            )}

            {activeTab === 'diplomacy' && (
              <div className="p-6 space-y-6 overflow-y-auto max-h-[600px] bg-stone-900">
                
                {/* Painel Diplomático de Ação Unilateral (Melhoria 8) */}
                <div className="bg-gradient-to-r from-emerald-950/40 via-stone-900 to-cyan-950/40 p-5 rounded-xl border border-stone-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-md font-bold text-stone-100 flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>Canal de Apoio de Coalizão Estrangeira</span>
                      </h4>
                      <p className="text-xs text-stone-400 mt-1 max-w-lg">
                        Soldados do Prata! Solicite de forma imediata suprimentos militares e verba extra urgentes com patrocinadores de aliança internacional. Custará <span className="text-rose-400 font-bold">-12% de Popularidade interna</span> pelo alinhamento externo.
                      </p>
                    </div>

                    <button
                      onClick={requestForeignAid}
                      disabled={(gameState.foreignAidCooldown || 0) > 0}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold font-mono transition flex items-center space-x-1 border shadow cursor-pointer ${
                        (gameState.foreignAidCooldown || 0) > 0
                          ? 'bg-stone-950 text-stone-600 border-stone-850 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-stone-950 border-emerald-500 hover:scale-[1.02] active:scale-95'
                      }`}
                    >
                      <span>Requisitar Auxílio Emergencial</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs font-mono">
                    <span className="text-stone-400">
                      Recursos Ganhos: <strong className="text-amber-400">R$ 25B</strong>, <strong className="text-cyan-400">+5MT Aço</strong>, <strong className="text-orange-400">+5 bbl Petróleo</strong>, <strong className="text-emerald-400">+15ton Alimento</strong>
                    </span>
                    <span className="border-l border-stone-800 pl-3 text-stone-400">
                      Disponibilidade: {gameState.foreignAidCooldown && gameState.foreignAidCooldown > 0 ? (
                        <span className="text-amber-500 font-bold">Recarregando ({gameState.foreignAidCooldown} turnos)</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">PRONTO PARA USO ✓</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* IMPOSTO DE GUERRA */}
                <div className="bg-stone-950 p-5 rounded-xl border border-amber-900/40 space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Coins className="w-4 h-4" /> Política Fiscal de Guerra
                  </h4>
                  <p className="text-xs text-stone-400">Eleve a taxação para aumentar renda, mas sacrifique popularidade e estabilidade.</p>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { level: 0 as const, label: 'Normal', bonus: '+0%', pen: '—', color: 'border-stone-700 text-stone-300' },
                      { level: 1 as const, label: 'Leve',   bonus: '+20%', pen: '-5 apr/turno', color: 'border-amber-700 text-amber-300' },
                      { level: 2 as const, label: 'Pesado', bonus: '+40%', pen: '-12 apr, -5 est', color: 'border-orange-700 text-orange-300' },
                      { level: 3 as const, label: 'Total',  bonus: '+60%', pen: '-20 apr, -10 est', color: 'border-rose-700 text-rose-300' },
                    ] as const).map(({ level, label, bonus, pen, color }) => (
                      <button
                        key={level}
                        onClick={() => setGameState(prev => ({ ...prev, warTaxRate: level }))}
                        className={`p-2 rounded border text-center text-xs font-mono cursor-pointer transition ${(gameState.warTaxRate ?? 0) === level ? color + ' bg-stone-900' : 'border-stone-850 text-stone-500 hover:border-stone-700'}`}
                      >
                        <div className="font-bold">{label}</div>
                        <div className="text-emerald-400 text-[10px]">{bonus}</div>
                        <div className="text-rose-400 text-[9px] leading-tight mt-0.5">{pen}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-stone-500">Nível atual: <strong className="text-amber-400">{['Normal', 'Leve', 'Pesado', 'Total'][gameState.warTaxRate ?? 0]}</strong></p>
                </div>

                {/* AVIAÇÃO NACIONAL */}
                <div className="bg-stone-950 p-5 rounded-xl border border-sky-900/40 space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                    <Cloud className="w-4 h-4" /> Força Aérea Nacional
                  </h4>
                  <p className="text-xs text-stone-400">Esquadrões de caças reduzem 6% da defesa inimiga por batalha (máx 30%). Custo: R$55B + 10Aço + 12Petróleo. Manutenção: R$5B/turno/esquadrão.</p>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm">
                      <span className="text-stone-400">Esquadrões ativos: </span>
                      <span className="text-sky-400 font-bold">{gameState.aviation ?? 0} ✈</span>
                    </div>
                    <button
                      onClick={recruitAviation}
                      className="px-4 py-2 bg-sky-800 hover:bg-sky-700 border border-sky-600 text-stone-100 font-bold text-xs rounded cursor-pointer transition"
                    >
                      + Recrutar Esquadrão
                    </button>
                  </div>
                  {(gameState.aviation ?? 0) > 0 && (
                    <div className="text-[10px] font-mono text-stone-500">
                      Bônus atual: <span className="text-sky-400">-{Math.round(Math.min(0.30, (gameState.aviation ?? 0) * 0.06) * 100)}%</span> defesa inimiga em cada ataque
                    </div>
                  )}
                </div>

                {/* MERCADO DE GUERRA */}
                <div className="bg-stone-950 p-5 rounded-xl border border-stone-800 space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-stone-400" /> Mercado de Recursos de Guerra
                  </h4>
                  <p className="text-xs text-stone-400">Troque excedentes por recursos críticos. Preços refletem urgência de guerra.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
                    {([
                      { label: 'Vender 20 Comida', give: 'food' as const, giveAmt: 20, receive: 'money' as const, receiveAmt: 15, cond: gameState.resources.food > 30, condLabel: 'Requer >30 Comida' },
                      { label: 'Vender 10 Aço', give: 'steel' as const, giveAmt: 10, receive: 'money' as const, receiveAmt: 12, cond: gameState.resources.steel > 20, condLabel: 'Requer >20 Aço' },
                      { label: 'Vender 15 Petróleo', give: 'oil' as const, giveAmt: 15, receive: 'money' as const, receiveAmt: 20, cond: gameState.resources.oil > 25, condLabel: 'Requer >25 Petróleo' },
                      { label: 'Comprar 20 Comida', give: 'money' as const, giveAmt: 18, receive: 'food' as const, receiveAmt: 20, cond: gameState.resources.money > 20, condLabel: 'Requer >R$20B' },
                      { label: 'Comprar 10 Aço', give: 'money' as const, giveAmt: 15, receive: 'steel' as const, receiveAmt: 10, cond: gameState.resources.money > 15, condLabel: 'Requer >R$15B' },
                      { label: 'Comprar 15 Petróleo', give: 'money' as const, giveAmt: 20, receive: 'oil' as const, receiveAmt: 15, cond: gameState.resources.money > 20, condLabel: 'Requer >R$20B' },
                    ]).map(({ label, give, giveAmt, receive, receiveAmt, cond, condLabel }) => (
                      <button
                        key={label}
                        onClick={() => tradResources(give, giveAmt, receive, receiveAmt)}
                        disabled={!cond}
                        title={!cond ? condLabel : ''}
                        className="flex justify-between items-center p-2.5 bg-stone-900 border border-stone-800 hover:border-amber-600/50 rounded cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="text-stone-300">{label}</span>
                        <span className="text-emerald-400">→ +{receiveAmt} {receive}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resumo de Estruturas do Império (Melhoria 18) */}
                <div className="bg-stone-950 p-5 rounded-xl border border-stone-850 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-stone-300">
                    Súmula de Infraestruturas Nacionais Ativas
                  </h4>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center font-mono">
                    <div className="p-3 bg-stone-900 border border-stone-850 rounded-lg">
                      <div className="text-[10px] text-stone-500">INDÚSTRIAS</div>
                      <div className="text-xl font-bold text-amber-500 mt-1">
                        {Object.values(gameState.provinces).reduce((acc: number, p: any) => p.controller === gameState.playerCountry ? acc + (p.buildings.industrial || 0) : acc, 0)}
                      </div>
                      <span className="text-[9px] text-stone-400">Gerador Verba & Aço</span>
                    </div>

                    <div className="p-3 bg-stone-900 border border-stone-850 rounded-lg">
                      <div className="text-[10px] text-stone-500">REFINARIAS</div>
                      <div className="text-xl font-bold text-orange-400 mt-1">
                        {Object.values(gameState.provinces).reduce((acc: number, p: any) => p.controller === gameState.playerCountry ? acc + (p.buildings.refinery || 0) : acc, 0)}
                      </div>
                      <span className="text-[9px] text-stone-400">Extrai Combustível</span>
                    </div>

                    <div className="p-3 bg-stone-900 border border-stone-850 rounded-lg">
                      <div className="text-[10px] text-stone-500">LOGÍSTICA</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">
                        {Object.values(gameState.provinces).reduce((acc: number, p: any) => p.controller === gameState.playerCountry ? acc + (p.buildings.logistics || 0) : acc, 0)}
                      </div>
                      <span className="text-[9px] text-stone-400">Fornece Mantimentos</span>
                    </div>

                    <div className="p-3 bg-stone-900 border border-stone-850 rounded-lg">
                      <div className="text-[10px] text-stone-500">CONTRAFORTES</div>
                      <div className="text-xl font-bold text-stone-300 mt-1">
                        {Object.values(gameState.provinces).reduce((acc: number, p: any) => p.controller === gameState.playerCountry ? acc + (p.buildings.fortress || 0) : acc, 0)}
                      </div>
                      <span className="text-[9px] text-stone-400">Fortificações Defesas</span>
                    </div>
                  </div>
                </div>

                {/* Linhas Logísticas de Combustível */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-black tracking-wider uppercase text-emerald-400 flex items-center">
                      <Truck className="w-5 h-5 mr-2" />
                      Gargalos e Redes Logísticas de Mantimentos
                    </h3>
                    
                    {/* Botão de Exportação de Logs (Melhoria 9) */}
                    <button
                      onClick={handleExportLogs}
                      className="text-xs font-mono bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 border border-stone-750 px-3 py-1.5 rounded cursor-pointer transition flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{logsCopied ? 'Copiado ✓' : 'Copiar Logs da Campanha'}</span>
                    </button>
                  </div>

                  <p className="text-stone-400 text-xs">
                    Suas divisões estacionadas fora da rede lógica até sua capital original sofrem perigo eminente de atrito alimentar e material pesado (-15% de contingente por turno). Rastreamento por rádio militar de região:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {provincesAry
                      .filter(p => p.controller === gameState.playerCountry)
                      .map(prov => {
                        const supplied = checkIsSupplied(prov.id, gameState.playerCountry);
                        const customName = gameState.customNames?.[prov.id] || prov.name;
                        return (
                          <div key={prov.id} className="bg-stone-950 p-4 rounded-lg border border-stone-800 flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-sm block text-stone-100">{customName}</span>
                                {gameState.customNames?.[prov.id] && (
                                  <span className="text-[9px] px-1 bg-stone-900 border border-stone-800 text-stone-500 font-mono rounded">
                                    original: {prov.name}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-stone-400 font-mono">
                                Tropas: {prov.armies.infantry} Inf / {prov.armies.artillery} Art / {prov.armies.tanks} Blin
                              </span>
                            </div>
                            
                            <div className="text-right">
                              {supplied ? (
                                <span className="px-2 py-1 bg-emerald-950 border border-emerald-600 text-emerald-400 rounded text-xs font-mono font-bold uppercase tracking-wider block">
                                  Conexão Segura
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-rose-950 border border-rose-600 text-rose-400 rounded text-xs font-mono font-bold uppercase tracking-wider block animate-pulse">
                                  ! Isolado ! Atrição
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'help' && (
              <div className="p-6 space-y-6 overflow-y-auto max-h-[600px] text-sm text-stone-300 leading-relaxed bg-stone-900 border-t border-stone-800">
                
                {/* Quadro de Medalhas de Campanha (Melhoria 16) */}
                <div className="bg-stone-950 p-5 rounded-lg border border-stone-850 space-y-4">
                  <h3 className="text-md font-bold text-stone-100 flex items-center space-x-2 border-b border-stone-800 pb-2">
                    <Award className="w-5 h-5 text-amber-500 animate-pulse" />
                    <span>Conquistas e Condecorações Estratégicas</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Medalha 1 */}
                    <div className={`p-3 rounded border flex items-start space-x-3 transition font-mono ${
                      (gameState.unlockedAchievements || []).includes('tank_lord')
                        ? 'bg-amber-950/20 border-amber-600/50 text-stone-100'
                        : 'bg-stone-900/40 border-stone-850 text-stone-500'
                    }`}>
                      <span className="text-2xl">🎖️</span>
                      <div>
                        <div className="font-bold text-xs uppercase">Divisões de Aço</div>
                        <p className="text-[11px] mt-1 text-stone-400">Ter mais de 10 Divisões de Tanques blindados em uma única província.</p>
                        <span className="text-[10px] mt-1.5 block font-bold text-amber-500">
                          {(gameState.unlockedAchievements || []).includes('tank_lord') ? '★ DESBLOQUEADO' : '🔒 BLOQUEADO'}
                        </span>
                      </div>
                    </div>

                    {/* Medalha 2 */}
                    <div className={`p-3 rounded border flex items-start space-x-3 transition font-mono ${
                      (gameState.unlockedAchievements || []).includes('industrial_tycoon')
                        ? 'bg-amber-950/20 border-amber-600/50 text-stone-100'
                        : 'bg-stone-900/40 border-stone-850 text-stone-500'
                    }`}>
                      <span className="text-2xl">🏭</span>
                      <div>
                        <div className="font-bold text-xs uppercase">Magnata Industrial</div>
                        <p className="text-[11px] mt-1 text-stone-400">Possuir mais de 5 Complexos Industriais construídos no total sob seu mando.</p>
                        <span className="text-[10px] mt-1.5 block font-bold text-amber-500">
                          {(gameState.unlockedAchievements || []).includes('industrial_tycoon') ? '★ DESBLOQUEADO' : '🔒 BLOQUEADO'}
                        </span>
                      </div>
                    </div>

                    {/* Medalha 3 */}
                    <div className={`p-3 rounded border flex items-start space-x-3 transition font-mono ${
                      (gameState.unlockedAchievements || []).includes('conqueror_half')
                        ? 'bg-amber-950/20 border-amber-600/50 text-stone-100'
                        : 'bg-stone-900/40 border-stone-850 text-stone-500'
                    }`}>
                      <span className="text-2xl">👑</span>
                      <div>
                        <div className="font-bold text-xs uppercase">Imperador Regional</div>
                        <p className="text-[11px] mt-1 text-stone-400">Controlar doze ou mais territórios da Bacia do Prata simultaneamente.</p>
                        <span className="text-[10px] mt-1.5 block font-bold text-amber-500">
                          {(gameState.unlockedAchievements || []).includes('conqueror_half') ? '★ DESBLOQUEADO' : '🔒 BLOQUEADO'}
                        </span>
                      </div>
                    </div>

                    {/* Medalha 4 */}
                    <div className={`p-3 rounded border flex items-start space-x-3 transition font-mono ${
                      (gameState.unlockedAchievements || []).includes('decade_war')
                        ? 'bg-amber-950/20 border-amber-600/50 text-stone-100'
                        : 'bg-stone-900/40 border-stone-850 text-stone-500'
                    }`}>
                      <span className="text-2xl">⏳</span>
                      <div>
                        <div className="font-bold text-xs uppercase">Guerra de Atrito</div>
                        <p className="text-[11px] mt-1 text-stone-400">Resistir ao cerco inimigo de inteligência tática até o turno 10 ou mais.</p>
                        <span className="text-[10px] mt-1.5 block font-bold text-amber-500">
                          {(gameState.unlockedAchievements || []).includes('decade_war') ? '★ DESBLOQUEADO' : '🔒 BLOQUEADO'}
                        </span>
                      </div>
                    </div>

                    {/* Medalha 5 */}
                    <div className={`p-3 rounded border flex items-start space-x-3 transition font-mono ${
                      (gameState.unlockedAchievements || []).includes('first_victory')
                        ? 'bg-amber-950/20 border-amber-600/50 text-stone-100'
                        : 'bg-stone-900/40 border-stone-850 text-stone-500'
                    }`}>
                      <span className="text-2xl">⚔️</span>
                      <div>
                        <div className="font-bold text-xs uppercase">Tático do Prata</div>
                        <p className="text-[11px] mt-1 text-stone-400">Lançar uma invasão militar bem sucedida, tomando controle de um território hostil.</p>
                        <span className="text-[10px] mt-1.5 block font-bold text-amber-500">
                          {(gameState.unlockedAchievements || []).includes('first_victory') ? '★ DESBLOQUEADO' : '🔒 BLOQUEADO'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Livro de Registro de Decisões Geopolíticas Anteriores (Melhoria 15) */}
                <div className="bg-stone-950 p-5 rounded-lg border border-stone-850 space-y-3">
                  <h3 className="text-md font-bold text-stone-100 flex items-center space-x-2 border-b border-stone-800 pb-2">
                    <MessageSquareCode className="w-5 h-5 text-cyan-400" />
                    <span>Livro de Registro: Decisões Geopolíticas e Acordos</span>
                  </h3>

                  {gameState.previousDecisions && gameState.previousDecisions.length > 0 ? (
                    <div className="space-y-2 font-mono text-xs">
                      {gameState.previousDecisions.map((dec: string, i: number) => (
                        <div key={i} className="p-2 border border-stone-850 bg-stone-900 rounded flex items-center space-x-2 text-stone-300">
                          <span className="text-cyan-500">#{i + 1}</span>
                          <span>{dec}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 font-mono italic">
                      Nenhuma decisão geopolítica foi resolvida ainda neste conflito. Crises convocam seu mando.
                    </p>
                  )}
                </div>

                {/* Manual de Jogo */}
                <h3 className="text-lg font-bold text-stone-100 border-b border-stone-800 pb-2">Manual Tático de Guerra do Prata</h3>
                
                <section className="space-y-2">
                  <h4 className="font-bold text-emerald-400">1. O Fluxo de Turno</h4>
                  <p>A cada turno, o seu país gera fundos e recursos baseados nas províncias que possui e nas melhorias industriais construídas nelas. Você pode recrutar tropas ou expandir indústrias, e então clicar em "Avançar Turno" para computar resultados, movimentações inimigas, consumo alimentar e crises governamentais.</p>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-emerald-400">2. Economia e Edifícios</h4>
                  <p>Gerencie estrategicamente quatro recursos principais:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-amber-400">Dinheiro:</strong> Gerado por nível de Indústrias Comerciais. Usado no recrutamento geral de contingentes.</li>
                    <li><strong className="text-cyan-400">Aço:</strong> Provido por áreas mineiras estaduais e complexos comerciais industriais. Essencial na fabricação tecnológica de artilharia pesada e tanques em divisões avançadas.</li>
                    <li><strong className="text-orange-400">Petróleo:</strong> Extraído de refinarias locais. Necessário para movimentar divisões rápidas. Se o óleo atingir zero, suas tropas sofrerão debuff de ataque de 40%!</li>
                    <li><strong className="text-emerald-400">Alimentos:</strong> Suprido em larga escala pelas províncias agrícolas ou bacias do Pantanal e Chaco. Caso falte, causará descontentamento social grave com redução rápida de Estabilidade Governamental.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h4 className="font-bold text-emerald-400">3. Batalha e Conquista de Territórios</h4>
                  <p>Selecione um território de sua posse e clique em uma província inimiga vizinha. Escolha as divisões de infantarias, artilharias e blindados que formarão a expedição agressora. Seus bônus serão pesados pelas fortificações defensivas do alvo e se o agressor está abastecido logisticamente de suprimentos.</p>
                </section>
              </div>
            )}

            {/* EVENTO POLÍTICO DE CRISE DINÂMICO (INTEGRADO COM IA) */}
            {gameState.activeEvent && (
              <div className="absolute inset-x-0 bottom-0 bg-stone-950/95 border-t border-amber-600/60 p-6 z-20 shadow-2xl backdrop-blur-md animate-[slideUp_0.3s_ease-out]">
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="flex items-center space-x-2 text-amber-500 font-mono text-xs uppercase tracking-widest font-black">
                    <AlertTriangle className="w-4 h-4 text-amber-500 animate-bounce" />
                    <span>ALERTA DE SEGURANÇA NACIONAL • CRISE GEOPOLÍTICA</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xl font-extrabold text-stone-100 uppercase tracking-wide">
                      {gameState.activeEvent.title}
                    </h4>
                    <p className="text-xs text-stone-400 italic">
                      Canal Criptografado de Comunicação • Turno {gameState.turn}
                    </p>
                  </div>

                  <p className="text-stone-300 text-sm leading-relaxed border-l-2 border-stone-800 pl-4 py-2">
                    {gameState.activeEvent.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    {(gameState.activeEvent.choices ?? []).map((choice, idx) => {
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectChoice(choice)}
                          className="p-4 rounded-lg bg-stone-900 border border-stone-800 hover:border-amber-600/50 hover:bg-stone-850 text-left transition duration-150 flex flex-col justify-between group cursor-pointer text-xs"
                        >
                          <div>
                            <span className="font-bold text-stone-100 group-hover:text-amber-400 block mb-1">
                              {choice.text}
                            </span>
                            <span className="text-stone-400 text-[11px] leading-relaxed block">
                              {choice.description}
                            </span>
                          </div>
                          
                          {/* Efeitos do Card */}
                          <div className="mt-3 pt-2.5 border-t border-stone-850/80 flex flex-wrap gap-2 font-mono text-[10px]">
                            {choice.effects.popularity !== undefined && (
                              <span className={choice.effects.popularity >= 0 ? "text-emerald-500" : "text-rose-500"}>
                                Aprovação: {choice.effects.popularity >= 0 ? '+' : ''}{choice.effects.popularity}%
                              </span>
                            )}
                            {choice.effects.stability !== undefined && (
                              <span className={choice.effects.stability >= 0 ? "text-emerald-500" : "text-rose-500"}>
                                Estabilidade: {choice.effects.stability >= 0 ? '+' : ''}{choice.effects.stability}%
                              </span>
                            )}
                            {choice.effects.resources?.money !== undefined && (
                              <span className={choice.effects.resources.money >= 0 ? "text-amber-400" : "text-rose-500"}>
                                Dinheiro: {choice.effects.resources.money >= 0 ? '+' : ''}{choice.effects.resources.money}B
                              </span>
                            )}
                            {choice.effects.resources?.oil !== undefined && (
                              <span className={choice.effects.resources.oil >= 0 ? "text-orange-400" : "text-rose-500"}>
                                Petróleo: {choice.effects.resources.oil >= 0 ? '+' : ''}{choice.effects.resources.oil}bbl
                              </span>
                            )}
                            {choice.effects.resources?.food !== undefined && (
                              <span className={choice.effects.resources.food >= 0 ? "text-emerald-400" : "text-rose-500"}>
                                Alimento: {choice.effects.resources.food >= 0 ? '+' : ''}{choice.effects.resources.food}ton
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* TABELA DIREITA: CONTROLE MILITAR DE COMANDO (5 COLUNAS) */}
          <section className="xl:col-span-12 xl:order-last min-w-0 flex flex-col space-y-5 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 xl:grid-cols-1 xl:flex xl:col-span-5">
            
            {/* 1. PAINEL ADVISOR: CONSELEIRO MILITAR DE IA */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <MessageSquareCode className="w-16 h-16 text-emerald-500" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3.5 border-b border-stone-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm tracking-wider uppercase text-stone-100">Inteligência Estratégica do Divisão (IA)</span>
                  </div>
                  {advisorLoading && (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                      Sincronizando satélite...
                    </span>
                  )}
                </div>

                <div className="p-3 bg-stone-950/80 rounded-lg border border-emerald-950/40 relative">
                  <span className="text-stone-400 uppercase tracking-widest font-mono text-[9px] block mb-1">CONSELHO DO ALTO COMANDO (GMT-3):</span>
                  <p className="text-stone-200 text-xs italic leading-relaxed">
                    "{advisorAdvice}"
                  </p>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-stone-850/80 flex items-center justify-between text-[11px] font-mono text-stone-400">
                <span>Estrategista Geral de Segurança Nacional</span>
                <span className="text-emerald-500">Status: Conectado</span>
              </div>
            </div>

            {/* 2. AREA DE GERENCIAMENTO DE PROVÍNCIA SELECIONADA */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg flex-1 flex flex-col justify-between">
              
              {!selectedProvince ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <Crosshair className="w-10 h-10 text-stone-600 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-sm text-stone-300">Sem Província Selecionada</h4>
                    <p className="text-xs text-stone-500 max-w-xs mt-1">
                      Clique em um de seus estados brasileiros ou bacias paraguaias de fronteira no mapa tático ao lado para inspecionar, recrutar divisões, fortificar ou ordenar movimentos táticos e ataques.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cabeçalho da província focada */}
                  <div className="flex items-start justify-between border-b border-stone-850 pb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded ${selectedProvince.controller === 'Brasil' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                          {selectedProvince.controller}
                        </span>
                        {selectedProvince.id === 'BR-DF' || selectedProvince.id === 'PY-ASU' ? (
                          <span className="text-xs text-yellow-500 bg-stone-950 border border-yellow-700/40 px-1.5 rounded font-bold uppercase tracking-widest font-mono">
                            Capital
                          </span>
                        ) : null}
                      </div>

                      {renamingProvId === selectedProvince.id ? (
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            maxLength={24}
                            className="bg-stone-950 text-white border border-stone-700 text-sm px-2 py-1 rounded w-44 font-mono font-bold focus:outline-none focus:border-emerald-500"
                            placeholder="Novo nome"
                          />
                          <button
                            onClick={() => handleRenameProvince(selectedProvince.id, tempName)}
                            className="px-2 py-1 text-xs bg-emerald-600 text-stone-950 font-bold rounded hover:bg-emerald-500 cursor-pointer"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setRenamingProvId(null)}
                            className="px-2 py-1 text-xs bg-stone-800 text-stone-300 rounded hover:bg-stone-700 cursor-pointer"
                          >
                            Voltar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 mt-1.5 group">
                          <h4 className="text-xl font-black text-stone-100 uppercase">
                            {gameState.customNames?.[selectedProvince.id] || selectedProvince.name}
                          </h4>
                          {selectedProvince.controller === gameState.playerCountry && (
                            <button
                              onClick={() => {
                                setRenamingProvId(selectedProvince.id);
                                setTempName(gameState.customNames?.[selectedProvince.id] || selectedProvince.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-100 cursor-pointer transition text-xs"
                              title="Renomear Base Estratégica"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}

                      {/* Nome do Regimento Histórico (Melhoria 17) */}
                      {getRegimentalBanner(selectedProvince) && (
                        <div className="text-[10px] text-amber-500 font-mono font-bold mt-1 tracking-wider uppercase">
                          {getRegimentalBanner(selectedProvince)}
                        </div>
                      )}

                      {/* Ameaça Militar Regional (Melhoria 13) */}
                      <div className="text-[10px] font-mono text-stone-400 mt-1 flex items-center space-x-1.5">
                        <span>Ameaça Inimiga:</span>
                        <span className="font-bold">{getProvinceThreatLevel(selectedProvince)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 block font-mono">SUPRIMENTOS</span>
                      {checkIsSupplied(selectedProvince.id, selectedProvince.controller) ? (
                        <span className="text-xs font-bold text-emerald-400 font-mono uppercase bg-emerald-950/60 px-2 py-0.5 rounded">CONECTADO</span>
                      ) : (
                        <span className="text-xs font-bold text-rose-500 font-mono uppercase bg-rose-950/60 px-2 py-0.5 rounded animate-pulse">! ISOLADO !</span>
                      )}
                    </div>
                  </div>

                  {/* Produção detalhada por província */}
                  <div className="bg-stone-950/80 p-3 rounded-lg border border-stone-850 text-xs space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[10px] text-stone-500 font-mono uppercase tracking-wider">Produção / Turno</span>
                      <div className="flex gap-1 flex-wrap">
                        {selectedProvince.controller === gameState.playerCountry
                          ? <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/40 px-1.5 py-0.5 rounded">● ATIVA</span>
                          : <span className="text-[9px] text-rose-400 font-mono bg-rose-950/40 px-1.5 py-0.5 rounded">● INIMIGA</span>
                        }
                        {selectedProvince.terrain && selectedProvince.terrain !== 'plains' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{
                            color: selectedProvince.terrain === 'jungle' ? '#86efac' : selectedProvince.terrain === 'chaco' ? '#fcd34d' : '#a78bfa',
                            background: selectedProvince.terrain === 'jungle' ? '#052e16' : selectedProvince.terrain === 'chaco' ? '#422006' : '#2e1065',
                          }}>
                            {selectedProvince.terrain === 'jungle' ? '🌿 SELVA' : selectedProvince.terrain === 'chaco' ? '🏜️ CHACO' : '🏙️ URBANO'}
                          </span>
                        )}
                        {selectedProvince.hasRiver && (
                          <span className="text-[9px] text-blue-300 font-mono bg-blue-950/40 px-1.5 py-0.5 rounded">🌊 RIO</span>
                        )}
                        {selectedProvince.onAquifer && (
                          <span className="text-[9px] text-teal-300 font-mono bg-teal-950/40 px-1.5 py-0.5 rounded">💧 AQUÍFERO</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 font-mono text-stone-300">
                      {[
                        { label: 'Dinheiro', base: +(selectedProvince.resources.money * 0.15).toFixed(1), bld: selectedProvince.buildings.industrial * 12, unit: 'B', color: 'text-amber-400' },
                        { label: 'Aço', base: Math.round(selectedProvince.resources.steel * 0.12), bld: selectedProvince.buildings.industrial * 5, unit: 'MT', color: 'text-cyan-300' },
                        { label: 'Petróleo', base: Math.round(selectedProvince.resources.oil * 0.12), bld: selectedProvince.buildings.refinery * 8, unit: 'bbl', color: 'text-orange-400' },
                        { label: 'Alimentos', base: Math.round(selectedProvince.resources.food * 0.15), bld: selectedProvince.buildings.logistics * 4, unit: 'ton', color: 'text-emerald-400' },
                      ].map(({ label, base, bld, unit, color }) => (
                        <div key={label} className="flex items-center justify-between border-b border-stone-900/60 pb-1 last:border-0 last:pb-0">
                          <span className="text-stone-500">{label}:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-stone-600 text-[9px]">base {base}{unit}</span>
                            {bld > 0 && <span className="text-stone-600 text-[9px]">+{bld}{unit} edif.</span>}
                            <span className={`font-bold ${color}`}>= {+(base + bld).toFixed(1)}{unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detalhes de Organização de Divisões Atuais */}
                  <div>
                    <h5 className="text-[11px] font-black tracking-wider uppercase text-stone-400 mb-2 leading-none">Divisões Militares Prontos para Ação</h5>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="bg-stone-950 border border-stone-850 p-2 rounded">
                        <span className="text-stone-400 block text-[9px] uppercase">Infantaria</span>
                        <span className="text-lg font-black text-emerald-400">{selectedProvince.armies.infantry}</span>
                        <span className="text-[8px] text-stone-500 block leading-tight mt-0.5">Dano {UNIT_STATS.infantry.attack}/{UNIT_STATS.infantry.defense}</span>
                      </div>

                      <div className="bg-stone-950 border border-stone-850 p-2 rounded">
                        <span className="text-stone-400 block text-[9px] uppercase">Artilharia</span>
                        <span className="text-lg font-black text-cyan-300">{selectedProvince.armies.artillery}</span>
                        <span className="text-[8px] text-stone-500 block leading-tight mt-0.5">Dano {UNIT_STATS.artillery.attack}/{UNIT_STATS.artillery.defense}</span>
                      </div>

                      <div className="bg-stone-950 border border-stone-850 p-2 rounded">
                        <span className="text-stone-400 block text-[9px] uppercase">Blindados</span>
                        <span className="text-lg font-black text-orange-400">{selectedProvince.armies.tanks}</span>
                        <span className="text-[8px] text-stone-500 block leading-tight mt-0.5">Dano {UNIT_STATS.tanks.attack}/{UNIT_STATS.tanks.defense}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operações se o jogador for controlador da província */}
                  {selectedProvince.controller === gameState.playerCountry ? (
                    <div className="space-y-4 pt-2 border-t border-stone-850">
                      
                      {/* Recrutar Divisões no Território */}
                      <div className="space-y-1.5 p-3 rounded-lg bg-emerald-950/25 border border-emerald-900/40">
                        <div className="flex justify-between items-center">
                          <span className="block font-bold text-xs uppercase text-emerald-400 leading-none">Recrutar Divisões Ativas</span>
                          {/* Atalho Máximo */}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          
                          {/* Botão recrutar Infantaria */}
                          <div className="space-y-1 text-center">
                            <div className="flex justify-between items-center px-0.5">
                              <span className="block text-[10px] text-stone-400 font-mono">Infantaria</span>
                              <button
                                onClick={() => setRecruitingUnits(prev => ({ ...prev, infantry: getMaxRecruitCount('infantry') }))}
                                className="text-[8px] text-emerald-400 hover:underline font-mono"
                                title="Define para quantidade máxima permitida pelos fundos"
                              >
                                MAX({getMaxRecruitCount('infantry')})
                              </button>
                            </div>
                            <div className="flex items-center justify-between bg-stone-950 rounded p-1">
                              <button 
                                onClick={() => setRecruitingUnits(prev => ({ ...prev, infantry: Math.max(0, prev.infantry - 1) }))}
                                className="px-1 text-stone-400 hover:text-stone-100 text-xs font-black cursor-pointer font-bold"
                              >
                                -
                              </button>
                              <span className="text-xs font-mono font-bold">{recruitingUnits.infantry}</span>
                              <button 
                                onClick={() => setRecruitingUnits(prev => ({ ...prev, infantry: prev.infantry + 1 }))}
                                className="px-1 text-stone-400 hover:text-stone-100 text-xs font-black cursor-pointer font-bold"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => recruitUnits('infantry', recruitingUnits.infantry)}
                              disabled={recruitingUnits.infantry <= 0}
                              className="w-full text-[9px] font-mono py-1 rounded bg-stone-900 border border-emerald-800 text-emerald-400 hover:bg-emerald-950 disabled:opacity-40 disabled:hover:bg-stone-900 uppercase font-black tracking-wider cursor-pointer"
                            >
                              Comprar
                            </button>
                          </div>

                          {/* Botão recrutar Artilharia */}
                          <div className="space-y-1 text-center">
                            <div className="flex justify-between items-center px-0.5">
                              <span className="block text-[10px] text-stone-400 font-mono">Artilharia</span>
                              <button
                                onClick={() => setRecruitingUnits(prev => ({ ...prev, artillery: getMaxRecruitCount('artillery') }))}
                                className="text-[8px] text-emerald-400 hover:underline font-mono"
                                title="Define para quantidade máxima permitida pelos fundos"
                              >
                                MAX({getMaxRecruitCount('artillery')})
                              </button>
                            </div>
                            <div className="flex items-center justify-between bg-stone-950 rounded p-1">
                              <button 
                                onClick={() => setRecruitingUnits(prev => ({ ...prev, artillery: Math.max(0, prev.artillery - 1) }))}
                                className="px-1 text-stone-400 hover:text-stone-100 text-xs font-black cursor-pointer font-bold"
                              >
                                -
                              </button>
                              <span className="text-xs font-mono font-bold">{recruitingUnits.artillery}</span>
                              <button 
                                onClick={() => setRecruitingUnits(prev => ({ ...prev, artillery: prev.artillery + 1 }))}
                                className="px-1 text-stone-400 hover:text-stone-100 text-xs font-black cursor-pointer font-bold"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => recruitUnits('artillery', recruitingUnits.artillery)}
                              disabled={recruitingUnits.artillery <= 0}
                              className="w-full text-[9px] font-mono py-1 rounded bg-stone-900 border border-emerald-800 text-emerald-400 hover:bg-emerald-950 disabled:opacity-40 disabled:hover:bg-stone-900 uppercase font-black tracking-wider cursor-pointer"
                            >
                              Comprar
                            </button>
                          </div>

                          {/* Botão recrutar Tanques */}
                          <div className="space-y-1 text-center">
                            <div className="flex justify-between items-center px-0.5">
                              <span className="block text-[10px] text-stone-400 font-mono">Blindados</span>
                              <button
                                onClick={() => setRecruitingUnits(prev => ({ ...prev, tanks: getMaxRecruitCount('tanks') }))}
                                className="text-[8px] text-emerald-400 hover:underline font-mono"
                                title="Define para quantidade máxima permitida pelos fundos"
                              >
                                MAX({getMaxRecruitCount('tanks')})
                              </button>
                            </div>
                            <div className="flex items-center justify-between bg-stone-950 rounded p-1">
                              <button 
                                onClick={() => setRecruitingUnits(prev => ({ ...prev, tanks: Math.max(0, prev.tanks - 1) }))}
                                className="px-1 text-stone-400 hover:text-stone-100 text-xs font-black cursor-pointer font-bold"
                              >
                                -
                              </button>
                              <span className="text-xs font-mono font-bold">{recruitingUnits.tanks}</span>
                              <button 
                                onClick={() => setRecruitingUnits(prev => ({ ...prev, tanks: prev.tanks + 1 }))}
                                className="px-1 text-stone-400 hover:text-stone-100 text-xs font-black cursor-pointer font-bold"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => recruitUnits('tanks', recruitingUnits.tanks)}
                              disabled={recruitingUnits.tanks <= 0}
                              className="w-full text-[9px] font-mono py-1 rounded bg-stone-900 border border-emerald-800 text-emerald-400 hover:bg-emerald-950 disabled:opacity-40 disabled:hover:bg-stone-900 uppercase font-black tracking-wider cursor-pointer"
                            >
                              Comprar
                            </button>
                          </div>

                        </div>
                        <div className="text-[9px] text-stone-400 mt-1 text-center leading-normal">
                          Custos: Infantaria (R$10B|2Aço) — Artilharia (R$20B|8Aço) — Tanque (R$40B|15Aço|6Óleo). Máx edifícios: {MAX_BUILDING_LEVEL} níveis.
                        </div>

                        {/* Painel de Desmobilização Militar (Melhoria 6) */}
                        <div className="pt-2 border-t border-stone-900/60 mt-1.5 flex items-center justify-between">
                          <span className="text-[10px] text-stone-400 font-mono">DESMOBILIZAR (REEMBOLSO 50%):</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => demobilizeUnit('infantry')}
                              disabled={selectedProvince.armies.infantry <= 0}
                              className="px-2 py-1 text-[9px] bg-stone-900 border border-stone-850 hover:bg-rose-950/20 active:scale-95 disabled:opacity-40 text-stone-300 font-mono hover:text-rose-400 rounded cursor-pointer transition uppercase"
                              title="Desmobilizar 1 divisão de Infantaria"
                            >
                              INF
                            </button>
                            <button
                              onClick={() => demobilizeUnit('artillery')}
                              disabled={selectedProvince.armies.artillery <= 0}
                              className="px-2 py-1 text-[9px] bg-stone-900 border border-stone-850 hover:bg-rose-950/20 active:scale-95 disabled:opacity-40 text-stone-300 font-mono hover:text-rose-400 rounded cursor-pointer transition uppercase"
                              title="Desmobilizar 1 divisão de Artilharia"
                            >
                              ART
                            </button>
                            <button
                              onClick={() => demobilizeUnit('tanks')}
                              disabled={selectedProvince.armies.tanks <= 0}
                              className="px-2 py-1 text-[9px] bg-stone-900 border border-stone-850 hover:bg-rose-950/20 active:scale-95 disabled:opacity-40 text-stone-300 font-mono hover:text-rose-400 rounded cursor-pointer transition uppercase"
                              title="Desmobilizar 1 divisão de Blindados"
                            >
                              BLI
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Obra Civil / Desenvolver Infraestruturas */}
                      <div className="space-y-2 p-3 rounded-lg bg-stone-950 border border-stone-850">
                        <span className="block font-bold text-xs uppercase text-stone-300 leading-none">Expandir Obras de Infraestrutura Civil e Militar</span>
                        
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <button
                            onClick={() => buildFacility('industrial')}
                            className="p-2 border border-stone-800 hover:border-emerald-600 rounded bg-stone-900 text-stone-300 hover:text-stone-100 text-left cursor-pointer transition flex justify-between items-center"
                          >
                            <div>
                              <strong className="block text-[10px] uppercase text-emerald-300">ZONA INDUSTRIAL (v{selectedProvince.buildings.industrial})</strong>
                              <span className="text-[9px] leading-tight text-stone-400 font-mono">Gera Dinheiro e Aço</span>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-stone-400" />
                          </button>

                          <button
                            onClick={() => buildFacility('refinery')}
                            className="p-2 border border-stone-800 hover:border-emerald-600 rounded bg-stone-900 text-stone-300 hover:text-stone-100 text-left cursor-pointer transition flex justify-between items-center"
                          >
                            <div>
                              <strong className="block text-[10px] uppercase text-orange-400">REFINARIA (v{selectedProvince.buildings.refinery})</strong>
                              <span className="text-[9px] leading-tight text-stone-400 font-mono">Extrai Petróleo de Fluxo</span>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-stone-400" />
                          </button>

                          <button
                            onClick={() => buildFacility('fortress')}
                            className="p-2 border border-stone-800 hover:border-emerald-600 rounded bg-stone-900 text-stone-300 hover:text-stone-100 text-left cursor-pointer transition flex justify-between items-center"
                          >
                            <div>
                              <strong className="block text-[10px] uppercase text-cyan-400">FORTALEZA (v{selectedProvince.buildings.fortress})</strong>
                              <span className="text-[9px] leading-tight text-stone-400 font-mono">Mitiga Dano Defensivo</span>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-stone-400" />
                          </button>

                          <button
                            onClick={() => buildFacility('logistics')}
                            className="p-2 border border-stone-800 hover:border-emerald-600 rounded bg-stone-900 text-stone-300 hover:text-stone-100 text-left cursor-pointer transition flex justify-between items-center"
                          >
                            <div>
                              <strong className="block text-[10px] uppercase text-emerald-400">LOGÍSTICA (v{selectedProvince.buildings.logistics})</strong>
                              <span className="text-[9px] leading-tight text-stone-400 font-mono">Alimentos e Mobilidade</span>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-stone-400" />
                          </button>
                        </div>
                        
                        {/* Novos edifícios especializados */}
                        {selectedProvince.hasRiver && (
                          <button
                            onClick={() => buildFacility('hydroelectric')}
                            className="p-2 border border-stone-800 hover:border-yellow-500 rounded bg-stone-900 text-stone-300 hover:text-stone-100 text-left cursor-pointer transition flex justify-between items-center col-span-2"
                          >
                            <div>
                              <strong className="block text-[10px] uppercase text-yellow-300">HIDROELÉTRICA (v{selectedProvince.buildings.hydroelectric ?? 0})</strong>
                              <span className="text-[9px] leading-tight text-stone-400 font-mono">Gera +5⚡ Energia/turno. Requer rio. Bônus industrial de 8% por 5⚡.</span>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-stone-400" />
                          </button>
                        )}

                        <button
                          onClick={() => buildFacility('airbase')}
                          className="p-2 border border-stone-800 hover:border-sky-500 rounded bg-stone-900 text-stone-300 hover:text-stone-100 text-left cursor-pointer transition flex justify-between items-center"
                        >
                          <div>
                            <strong className="block text-[10px] uppercase text-sky-300">BASE AÉREA (v{selectedProvince.buildings.airbase ?? 0})</strong>
                            <span className="text-[9px] leading-tight text-stone-400 font-mono">Pré-requisito para aviação.</span>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-stone-400" />
                        </button>

                        <button
                          onClick={() => buildFacility('ethanolRefinery')}
                          className="p-2 border border-stone-800 hover:border-lime-500 rounded bg-stone-900 text-stone-300 hover:text-stone-100 text-left cursor-pointer transition flex justify-between items-center"
                        >
                          <div>
                            <strong className="block text-[10px] uppercase text-lime-300">REFINARIA DE ETANOL (v{selectedProvince.buildings.ethanolRefinery ?? 0})</strong>
                            <span className="text-[9px] leading-tight text-stone-400 font-mono">-4 Alimento → +3 Petróleo/nível/turno.</span>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-stone-400" />
                        </button>

                        <div className="text-[9px] text-stone-500 font-mono leading-relaxed col-span-2 h-10 overflow-y-auto">
                          Preços: Industrial (R$50B|10Aço), Refinaria (R$60B|15Aço), Fortaleza (R$40B|20Aço), Logística (R$30B|8Aço), Hidroelétrica (R$80B|25Aço, requer rio), Base Aérea (R$70B|20Aço), Etanol (R$45B|10Aço).
                        </div>
                      </div>

                      {/* ATACAR OU REFORÇAR PROVÍNCIA CONECTADA */}
                      {targetProvince ? (
                        <div className="p-3 bg-amber-950/20 border border-amber-600/30 rounded-lg space-y-3 animate-pulse">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs uppercase text-amber-400">
                              {targetProvince.controller === gameState.playerCountry 
                                ? 'EXPEDIÇÃO DE REFORÇO LOGÍSTICO' 
                                : 'EXPEDIÇÃO DE ASSALTO COMBATE'}
                            </span>
                            <button onClick={clearTargetProvince} className="text-stone-400 hover:text-stone-100 cursor-pointer">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <p className="text-stone-300 text-[11px] leading-relaxed">
                            Definida como destino das suas divisões estacionadas a província de <strong className="text-stone-150 uppercase">{targetProvince.name}</strong> ({targetProvince.controller}). Indique o total de divisões a enviar:
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-stone-950 p-2.5 rounded border border-stone-850">
                              <h6 className="text-[10px] uppercase text-stone-400 mb-1 leading-none font-mono">Divisões de Infantaria</h6>
                              <input 
                                type="number" 
                                min="0" 
                                max={selectedProvince.armies.infantry}
                                id="send_infantry_input"
                                className="w-full bg-stone-900 border border-stone-800 text-emerald-400 text-sm font-bold text-center rounded p-1.5 focus:border-emerald-600 focus:outline-none"
                                defaultValue="0"
                              />
                              <span className="text-[9px] text-stone-500 mt-1 block">Disp: {selectedProvince.armies.infantry}</span>
                            </div>

                            <div className="bg-stone-950 p-2.5 rounded border border-stone-850">
                              <h6 className="text-[10px] uppercase text-stone-400 mb-1 leading-none font-mono">Divisões de Blindados</h6>
                              <input 
                                type="number" 
                                min="0" 
                                max={selectedProvince.armies.tanks}
                                id="send_tanks_input"
                                className="w-full bg-stone-900 border border-stone-800 text-orange-400 text-sm font-bold text-center rounded p-1.5 focus:border-emerald-600 focus:outline-none"
                                defaultValue="0"
                              />
                              <span className="text-[9px] text-stone-500 mt-1 block">Disp: {selectedProvince.armies.tanks}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              const infInput = document.getElementById('send_infantry_input') as HTMLInputElement;
                              const tnkInput = document.getElementById('send_tanks_input') as HTMLInputElement;
                              const inf = parseInt(infInput?.value || '0', 10);
                              const tnk = parseInt(tnkInput?.value || '0', 10);
                              if (targetProvince.controller !== gameState.playerCountry) {
                                // Ataque: exige confirmação
                                setPendingAttack({ inf, tnk, originName: selectedProvince.name, targetName: targetProvince.name });
                              } else {
                                executeMilitaryOrder(inf, 0, tnk);
                              }
                            }}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold uppercase tracking-wider text-xs rounded transition duration-150 cursor-pointer"
                          >
                            {targetProvince.controller === gameState.playerCountry
                              ? 'Iniciar Trânsito de Reforço'
                              : 'Declarar Assalto Militar de Invasão'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-3.5 bg-stone-950 border border-stone-850 rounded-lg text-xs leading-normal">
                          <p className="text-stone-400 italic">
                            * Para atacar ou movimentar divisões: mantenha {selectedProvince.name} selecionada e clique em qualquer província vizinha/conectada no mapa.
                          </p>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="p-4 bg-orange-950/15 border border-orange-950 rounded-lg text-xs text-orange-400 font-mono italic">
                      Esta província está sob o comissariado hostil do {selectedProvince.controller}. Organize ataques enviando contingentes de seus territórios vizinhos conectados.
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* 3. LOG DE COMISSÃO DA CAMPANHA */}
            {/* HISTÓRICO DE BATALHAS */}
            {battleHistory.length > 0 && (
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-lg">
                <span className="font-bold text-xs tracking-wider uppercase text-stone-400 block mb-2 border-b border-stone-850 pb-1.5 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-amber-500" /> Histórico de Batalhas
                </span>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {battleHistory.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] font-mono border-b border-stone-850/50 pb-1 last:border-0 last:pb-0">
                      <span className={b.winner === 'attacker' ? 'text-emerald-400' : 'text-rose-400'}>
                        {b.winner === 'attacker' ? '▲' : '▼'} T{b.turn} {b.originName} → {b.targetName}
                      </span>
                      <span className="text-stone-500 text-[9px]">-{b.attackerLosses.infantry}Inf/{b.attackerLosses.tanks}Blin</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg flex flex-col justify-between h-[230px] overflow-hidden">
              <span className="font-bold text-sm tracking-wider uppercase text-stone-300 block mb-2 border-b border-stone-850 pb-1.5">Massa de Dados / Relatório de Crises</span>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar font-mono text-[11px] leading-relaxed">
                {gameState.logs.map((log, idx) => {
                  let logColor = "text-stone-400";
                  if (log.startsWith("[ATAQUE")) logColor = "text-amber-400 font-bold border-l-2 border-amber-600 pl-1";
                  else if (log.startsWith("[Combate]")) logColor = "text-neutral-300";
                  else if (log.startsWith("DERROTA")) logColor = "text-rose-400 font-bold border-l-2 border-rose-600 pl-1";
                  else if (log.startsWith("CONQUISTA")) logColor = "text-emerald-400 font-extrabold border-l-2 border-emerald-500 pl-1";
                  else if (log.startsWith("RESOLVECRISE")) logColor = "text-cyan-400";

                  return (
                    <div key={idx} className={logColor}>
                      {log}
                    </div>
                  );
                })}
              </div>
            </div>

          </section>

        </main>
      )}

      {/* CASO DERROTA / VITÓRIA DE CAMPANHA */}
      {(gameState.gamePhase === 'win' || gameState.gamePhase === 'loss') && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 bg-stone-950 text-center relative">
          <div className="absolute inset-0 bg-stone-900 opacity-20 pointer-events-none"></div>
          
          <div className="max-w-xl bg-stone-900 border border-stone-800 rounded-2xl p-8 space-y-6 shadow-2xl relative z-10 select-none">
            {gameState.gamePhase === 'win' ? (
              <div className="space-y-4">
                <div className="p-3 inline-block bg-emerald-950 border border-emerald-600 text-emerald-400 rounded-full animate-bounce">
                  <Award className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black uppercase text-emerald-400 tracking-wider">CAMPANHA VITORIOSA!</h2>
                <p className="text-stone-300 text-base leading-relaxed">
                  Sob o pulso militar firme e diplomacia impecável da sua presidência do {gameState.playerCountry}, as divisões inimigas assinaram a rendição. O conflito na Bacia do Prata foi encerrado com consolidação total do território!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 inline-block bg-rose-950 border border-rose-600 text-rose-400 rounded-full animate-bounce">
                  <Skull className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black uppercase text-rose-500 tracking-wider">CAMPANHA FRACASSADA</h2>
                <p className="text-stone-300 text-base leading-relaxed">
                  As forças estratégicas do {gameState.playerCountry} entraram em colapso. O alto comando foi destituído e os termos de ocupação foram assinados devido a desastres políticos no controle civil ou no teatro de combates.
                </p>
              </div>
            )}

            <div className="p-4 bg-stone-950 rounded-lg text-sm text-stone-400 font-mono border border-stone-850">
              <span className="block text-xs uppercase text-stone-500 mb-1">Causa da Conclusão:</span>
              <p className="font-bold text-stone-300">
                {gameState.popularity <= 10 ? 'Colapso de Popularidade Governamental' : gameState.stability <= 10 ? 'Colapso Social da Retaguarda' : 'Vitória Militar Definitiva por Conquista Capital.'}
              </p>
            </div>

            <button
              onClick={resetGame}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-lg uppercase tracking-wider text-sm transition transition-all active:scale-95 cursor-pointer"
            >
              Reiniciar Simulador do Prata
            </button>
          </div>
        </main>
      )}

      {/* FOOTER DE REGISTRO */}
      <footer className="bg-stone-900 border-t border-stone-850 py-3.5 px-6 flex items-center justify-between text-xs text-stone-500 font-mono">
        <span>© 2026/2027 Fronteira do Prata - Paradox Mod • Paradox Sim</span>
        <span>Apoio de Satélite do Operações de IA Ativado</span>
      </footer>

      {/* MODAL DE CONFIRMAÇÃO DE ATAQUE */}
      {pendingAttack && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-stone-900 border border-rose-700/60 max-w-sm w-full rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-rose-950 border-b border-rose-800 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="font-black tracking-wider uppercase text-stone-100 text-sm">Confirmar Assalto Militar</span>
            </div>
            <div className="p-6 space-y-3 text-sm text-stone-300">
              <p>Você está prestes a atacar <strong className="text-rose-400 uppercase">{pendingAttack.targetName}</strong> a partir de <strong className="text-emerald-400">{pendingAttack.originName}</strong>.</p>
              <p className="text-stone-400 text-xs">Infantaria: {pendingAttack.inf} divisões &nbsp;|&nbsp; Blindados: {pendingAttack.tnk} divisões</p>
              <p className="text-stone-500 text-xs italic">Esta ação é irreversível. Confirme apenas se tiver certeza da ordem.</p>
            </div>
            <div className="p-4 bg-stone-950 border-t border-stone-850 flex gap-3 justify-end">
              <button
                onClick={() => setPendingAttack(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold uppercase text-xs rounded cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { inf, tnk } = pendingAttack;
                  setPendingAttack(null);
                  executeMilitaryOrder(inf, 0, tnk);
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-stone-100 font-bold uppercase text-xs rounded cursor-pointer transition"
              >
                Confirmar Ataque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BUBBLE COMBATE (RELATÓRIO ANIMADO DE DISPUTA) */}
      {combatDetailsModal?.visible && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm select-none">
          <div className="bg-stone-900 border border-amber-600/50 max-w-lg w-full rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between">
            
            {/* Header */}
            <div className={`p-4 ${combatDetailsModal.winner === 'attacker' ? 'bg-emerald-950 border-b border-emerald-800' : 'bg-rose-950 border-b border-rose-800'} flex items-center justify-between`}>
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-stone-100" />
                <span className="font-black tracking-wider uppercase text-stone-100 text-sm">RELATÓRIO OFICIAL DE BATALHA</span>
              </div>
              <button 
                onClick={() => setCombatDetailsModal(null)}
                className="text-stone-300 hover:text-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Baixas / Log de Operação */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <span className="text-xs uppercase text-stone-400 font-mono block">Resultado do Combate</span>
                <span className={`text-2xl font-black uppercase tracking-widest ${combatDetailsModal.winner === 'attacker' ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {combatDetailsModal.winner === 'attacker' ? 'Província Capturada!' : 'Invasão Repelida!'}
                </span>
                <p className="text-stone-400 text-xs mt-1 leading-normal font-sans">
                  Simbologia expedicionária do conflito travado na região de <strong className="text-neutral-100 uppercase font-mono">{gameState.provinces[combatDetailsModal.defenderId]?.name}</strong>.
                </p>
              </div>

              {/* Tabela de Baixas Comparativa */}
              <div className="grid grid-cols-2 gap-4 pt-3 font-mono text-xs">
                
                {/* Força do Jogador (Atacante) */}
                <div className="bg-stone-950 p-3.5 rounded-lg border border-stone-850 flex flex-col justify-between">
                  <div>
                    <span className="font-extrabold block text-stone-300 border-b border-stone-900 pb-1 text-center mb-2 uppercase">Nossas Tropas</span>
                    <ul className="space-y-1 text-[11px] text-stone-400">
                      <li className="flex justify-between">
                        <span>Infantaria:</span>
                        <span className="text-stone-100 font-bold">{combatDetailsModal.troopsUsed.infantry} (-{combatDetailsModal.attackerLosses.infantry})</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Blindados:</span>
                        <span className="text-stone-100 font-bold">{combatDetailsModal.troopsUsed.tanks} (-{combatDetailsModal.attackerLosses.tanks})</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="mt-4 pt-2.5 border-t border-stone-900 text-center uppercase tracking-widest text-[9px] font-bold text-stone-500">
                    Expedição Atacante
                  </div>
                </div>

                {/* Força Inimiga de Defesa */}
                <div className="bg-stone-950 p-3.5 rounded-lg border border-stone-850 flex flex-col justify-between">
                  <div>
                    <span className="font-extrabold block text-stone-300 border-b border-stone-900 pb-1 text-center mb-2 uppercase">Defesa Inimiga</span>
                    <ul className="space-y-1 text-[11px] text-stone-400">
                      <li className="flex justify-between">
                        <span>Infantaria:</span>
                        <span className="text-stone-100 font-bold">-{combatDetailsModal.defenderLosses.infantry}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Blindados:</span>
                        <span className="text-stone-100 font-bold">-{combatDetailsModal.defenderLosses.tanks}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="mt-4 pt-2.5 border-t border-stone-900 text-center uppercase tracking-widest text-[9px] font-bold text-stone-500">
                    Defensores Locais
                  </div>
                </div>

              </div>

              {/* Logs internos de combate */}
              <div className="bg-stone-950 rounded-lg p-3.5 border border-stone-850 max-h-[160px] overflow-y-auto font-mono text-[10px] space-y-1 leading-relaxed text-stone-400">
                <span className="block text-[9px] text-stone-500 uppercase tracking-widest mb-1.5 font-bold">Relatório Estendido do Conflito:</span>
                {combatDetailsModal.combatLog.map((logLine, idx) => (
                  <div key={idx} className="border-b border-stone-900/50 pb-0.5 last:border-0 last:pb-0">
                    {logLine}
                  </div>
                ))}
              </div>

            </div>

            {/* Rodapé de fechamento */}
            <div className="p-4 bg-stone-950 border-t border-stone-850 flex justify-end">
              <button
                onClick={() => setCombatDetailsModal(null)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold uppercase text-xs rounded transition duration-150 cursor-pointer"
              >
                Dispersar Expedição
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
