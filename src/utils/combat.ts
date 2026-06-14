import { Province, UnitState, UNIT_STATS } from '../types';

export interface CombatResult {
  winner: 'attacker' | 'defender';
  attackerLosses: UnitState;
  defenderLosses: UnitState;
  attackerRemainingBeforeLogistics: UnitState;
  defenderRemainingBeforeLogistics: UnitState;
  log: string[];
}

/**
 * Calculates a tactical combat simulation between attacking and defending armies.
 */
export function simulateCombat(
  attackerProv: Province,
  defenderProv: Province,
  attackingUnits: UnitState,
  defenderSupplied: boolean,
  attackerSupplied: boolean,
  aviationDebuff: number = 0
): CombatResult {
  const log: string[] = [];
  log.push(`Iniciando combate em ${defenderProv.name}!`);

  const defUnits = { ...defenderProv.armies };
  const attUnits = { ...attackingUnits };

  // Calculate firepower
  // Attackers focus on attack stats, defenders on defense stats
  let attPower =
    attUnits.infantry * UNIT_STATS.infantry.attack +
    attUnits.artillery * UNIT_STATS.artillery.attack +
    attUnits.tanks * UNIT_STATS.tanks.attack;

  let defPower =
    defUnits.infantry * UNIT_STATS.infantry.defense +
    defUnits.artillery * UNIT_STATS.artillery.defense +
    defUnits.tanks * UNIT_STATS.tanks.defense;

  // Modifiers
  // Aviation debuff: reduces defender power before fortress mitigation
  if (aviationDebuff > 0) {
    defPower *= (1 - aviationDebuff);
    log.push(`Suporte aéreo reduziu poder defensivo em ${Math.round(aviationDebuff * 100)}%.`);
  }

  // Fortress modifier for the defender (reduces incoming damage)
  const fortLevel = defenderProv.buildings.fortress || 0;
  const fortMitigation = Math.max(0.4, 1 - fortLevel * 0.15); // Each fortress reduces incoming damage by 15% (max 60%)
  
  if (fortLevel > 0) {
    log.push(`Defensor possui fortificações de nível ${fortLevel} (${Math.round((1 - fortMitigation) * 100)}% de mitigação).`);
  }

  // Logistics and supplies modifier
  if (!attackerSupplied) {
    attPower *= 0.6; // 40% penalty
    log.push(`Ataque penalizado em 40% devido à falta de linhas de suprimentos!`);
  }
  if (!defenderSupplied) {
    defPower *= 0.6; // 40% penalty
    log.push(`Defesa penalizada em 40% por isolamento operacional!`);
  }

  // Add a slight randomization factor (tactical rolling)
  const attRoll = 0.8 + Math.random() * 0.4; // 80% to 120%
  const defRoll = 0.8 + Math.random() * 0.4;

  const totalAttStrength = attPower * attRoll;
  const totalDefStrength = defPower * defRoll;

  log.push(`Poder ofensivo projetado: ${Math.round(totalAttStrength)} vs Defesa projetada: ${Math.round(totalDefStrength)}.`);

  // Calculate casualties
  // Damage is proportional to opposing force strength
  const attackerDamageRatio = (totalDefStrength / (totalAttStrength + 10)) * 0.35 * fortMitigation;
  const defenderDamageRatio = (totalAttStrength / (totalDefStrength + 10)) * 0.35;

  const clampRatio = (r: number) => Math.min(0.9, Math.max(0.05, r));

  const finalAttRatio = clampRatio(attackerDamageRatio);
  const finalDefRatio = clampRatio(defenderDamageRatio);

  const attLosses: UnitState = {
    infantry: Math.round(attUnits.infantry * finalAttRatio),
    artillery: Math.round(attUnits.artillery * finalAttRatio * 0.8),
    tanks: Math.round(attUnits.tanks * finalAttRatio * 0.6)
  };

  const defLosses: UnitState = {
    infantry: Math.round(defUnits.infantry * finalDefRatio),
    artillery: Math.round(defUnits.artillery * finalDefRatio * 0.8),
    tanks: Math.round(defUnits.tanks * finalDefRatio * 0.6)
  };

  // Apply losses
  const attRem: UnitState = {
    infantry: Math.max(0, attUnits.infantry - attLosses.infantry),
    artillery: Math.max(0, attUnits.artillery - attLosses.artillery),
    tanks: Math.max(0, attUnits.tanks - attLosses.tanks)
  };

  const defRem: UnitState = {
    infantry: Math.max(0, defUnits.infantry - defLosses.infantry),
    artillery: Math.max(0, defUnits.artillery - defLosses.artillery),
    tanks: Math.max(0, defUnits.tanks - defLosses.tanks)
  };

  const totalAttLeft = attRem.infantry + attRem.artillery + attRem.tanks;
  const totalDefLeft = defRem.infantry + defRem.artillery + defRem.tanks;

  let winner: 'attacker' | 'defender' = 'defender';
  if (totalAttLeft > totalDefLeft && totalAttLeft > 2) {
    winner = 'attacker';
  }

  if (winner === 'attacker') {
    log.push(`Vitória do atacante! A província de ${defenderProv.name} foi capturada.`);
    log.push(`Baixas do atacante: Infantaria (${attLosses.infantry}), Artilharia (${attLosses.artillery}), Blindados (${attLosses.tanks}).`);
    log.push(`Baixas do defensor: Infantaria (${defLosses.infantry}), Artilharia (${defLosses.artillery}), Blindados (${defLosses.tanks}).`);
  } else {
    log.push(`Vitória do defensor! O ataque a ${defenderProv.name} foi repelido com sucesso.`);
    log.push(`Baixas do atacante: Infantaria (${attLosses.infantry}), Artilharia (${attLosses.artillery}), Blindados (${attLosses.tanks}).`);
    log.push(`Baixas do defensor: Infantaria (${defLosses.infantry}), Artilharia (${defLosses.artillery}), Blindados (${defLosses.tanks}).`);
  }

  return {
    winner,
    attackerLosses: attLosses,
    defenderLosses: defLosses,
    attackerRemainingBeforeLogistics: attRem,
    defenderRemainingBeforeLogistics: defRem,
    log
  };
}
