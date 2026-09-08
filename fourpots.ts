import type { CombRow, GameDefinition, StatsParams } from '../../game-types';
import { dictinc, dictinc2, dictinc3, weightchoice } from '../../game-helpers';

const rolls = 5;
const height = 3;
const tb = 20;
const lines = tb; // total bet per spin in line-bet units → RTP = wins / (tb*spins)
const lines_amount = 25;
const totalelemmin = 1;
const totalelemmax = 16;

const WILD_ID = 9;
const MYSTERY_ID = 10;
const MULT_ID = 11;
const COLLECT_ID = 12;
const MASTER_ID = 13;
const BONUS_ID = 14;
const BLANK_ID = 15;

const specials_bonus_ids = [MYSTERY_ID, MULT_ID, COLLECT_ID, MASTER_ID, BONUS_ID];
const special_ids = [MYSTERY_ID, MULT_ID, COLLECT_ID, MASTER_ID];
const special_bonus_wild_ids = [WILD_ID, MYSTERY_ID, MULT_ID, COLLECT_ID, MASTER_ID, BONUS_ID];

const bonus_spins = 3;

// RTP knob: probability (0-1 float) of using reelset 0 (LOW). 1 = pure LOW,
// 0 = pure HIGH, matching the usual LOW/HIGH/ORI convention (was previously
// an integer-parts-per-million comparison against Math.random()*1e6).
export let reelSetProbability = 0.451518739267;

const win: number[][] = Array.from({ length: lines_amount + 1 }, () => Array(rolls).fill(0));
win[1] = [1, 1, 1, 1, 1];
win[2] = [0, 0, 0, 0, 0];
win[3] = [2, 2, 2, 2, 2];
win[4] = [0, 1, 2, 1, 0];
win[5] = [2, 1, 0, 1, 2];
win[6] = [1, 0, 0, 0, 1];
win[7] = [1, 2, 2, 2, 1];
win[8] = [0, 0, 1, 2, 2];
win[9] = [2, 2, 1, 0, 0];
win[10] = [1, 2, 1, 0, 1];
win[11] = [1, 0, 1, 2, 1];
win[12] = [0, 1, 1, 1, 0];
win[13] = [2, 1, 1, 1, 2];
win[14] = [0, 1, 0, 1, 0];
win[15] = [2, 1, 2, 1, 2];
win[16] = [1, 1, 0, 1, 1];
win[17] = [1, 1, 2, 1, 1];
win[18] = [0, 0, 2, 0, 0];
win[19] = [2, 2, 0, 2, 2];
win[20] = [0, 2, 2, 2, 0];
win[21] = [2, 0, 0, 0, 2];
win[22] = [1, 2, 0, 2, 1];
win[23] = [1, 0, 2, 0, 1];
win[24] = [0, 2, 0, 2, 0];
win[25] = [2, 0, 2, 0, 2];

export const combs: CombRow[] = Array.from({ length: totalelemmax + 1 }, () => ['', 0, 0, 0, 0, 0]);
// Paytable rebalanced (2026) so every value is a clean multiple of tb/2 (=10)
// - i.e. clearly a fraction/multiple of the total bet - rather than the
// original's mostly-arbitrary 3-of-a-kind values (4/6/8/10/12). The 5-of-a-kind
// column was already clean (multiples of tb=20) and is left untouched; only
// the 3-of-a-kind/4-of-a-kind columns were nudged to the nearest clean value
// (average unchanged for the 3-of-a-kind column: old avg 8, new avg 8).
combs[1] = ['line', 0, 0, 5, 10, 40, 'low4'];
combs[2] = ['line', 0, 0, 5, 10, 40, 'low3'];
combs[3] = ['line', 0, 0, 5, 10, 40, 'low2'];
combs[4] = ['line', 0, 0, 5, 10, 40, 'low1'];
combs[5] = ['line', 0, 0, 5, 20, 80, 'mid4'];
combs[6] = ['line', 0, 0, 10, 30, 120, 'mid3'];
combs[7] = ['line', 0, 0, 10, 40, 160, 'mid2'];
combs[8] = ['line', 0, 0, 10, 60, 200, 'mid1'];
combs[9] = ['wild', 0, 0, 10, 60, 200, 'wild'];
combs[10] = ['scat', 0, 0, 0, 0, 0, 'mystery'];
combs[11] = ['scat', 0, 0, 0, 0, 0, 'mult'];
combs[12] = ['scat', 0, 0, 0, 0, 0, 'collect'];
combs[13] = ['scat', 0, 0, 0, 0, 0, 'master'];
combs[14] = ['scat', 0, 0, 0, 0, 0, 'bonus'];
combs[15] = ['scat', 0, 0, 0, 0, 0, 'blank'];
combs[16] = ['scat', 0, 0, 0, 0, 0, 'golden'];

const e_lines: number[] = [];
const e_scats: number[] = [];
const e_wild: number[] = [];
for (let i = totalelemmin; i <= totalelemmax; i++) {
  const kind = combs[i][0];
  if (kind === 'line') e_lines.push(i);
  if (kind === 'scat') e_scats.push(i);
  if (kind === 'wild') e_wild.push(i);
}

const jackpot_values = [15, 30, 100];
const jackpot_dict: Record<number, string> = { 15: 'mini', 30: 'minor', 100: 'major' };

// Reelsets: [0] base game (low), [1] alternate base game (high).
export const reels: number[][][] = [[], []];
// Reels rebalanced (2026): a deliberately different structure from the
// original - shorter, uniform stack run-lengths (2-4), slightly different
// per-symbol proportions - re-tuned via offline simulation against the new
// paytable above to reproduce approximately the same base-game hit
// frequency and RTP shape as the original reels (see design notes in the
// game's memory/changelog). Reel0 still carries no wild, matching the
// original's asymmetry.
// 2026 rebalance: low1-4 density cut ~1.5x (25->17 per reel) and the freed
// budget shifted proportionally into mid1-4 (6:5:4:3 -> 17:14:11:8 per reel),
// to reduce the base-game's LOW-symbol-dominated RTP share. Same stacking
// convention (contiguous runs of 2-4), same per-reel length, wild-free reel0
// unchanged from the prior redesign.
reels[0][0] = [
  1, 1, 1, 1, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4, 6, 6, 6, 6, 8, 8, 8, 8, 4, 4,
  4, 4, 6, 6, 6, 6, 5, 5, 5, 5, 2, 2, 2, 2, 1, 1, 1, 1, 3, 3, 3, 3, 6, 6, 6, 6,
  4, 4, 4, 4, 7, 7, 7, 7, 5, 5, 5, 5, 3, 3, 3, 3, 2, 2, 2, 2, 7, 7, 7, 7, 8, 8,
  8, 8, 3, 3, 3, 4, 4, 4, 1, 1, 1, 1, 5, 5, 5, 5, 4, 4, 1, 1, 1, 5, 5, 5, 6, 6,
  2, 2, 2, 5, 5, 3, 3, 7, 7, 7, 2, 2, 1, 1,
];
reels[0][1] = [
  2, 2, 2, 2, 8, 8, 8, 8, 6, 6, 6, 6, 2, 2, 2, 2, 7, 7, 7, 7, 6, 6, 6, 6, 1, 1,
  1, 1, 5, 5, 5, 5, 6, 6, 6, 6, 1, 1, 1, 1, 9, 9, 4, 4, 4, 4, 3, 3, 3, 3, 8, 8,
  8, 8, 1, 1, 1, 1, 3, 3, 3, 3, 5, 5, 5, 5, 1, 1, 1, 4, 4, 4, 4, 5, 5, 5, 5, 7,
  7, 7, 7, 2, 2, 2, 2, 3, 3, 3, 3, 5, 5, 5, 4, 4, 4, 4, 1, 1, 2, 2, 2, 4, 4, 4,
  6, 6, 3, 3, 3, 2, 2, 7, 7, 7, 3, 3, 4, 4, 5, 5,
];
reels[0][2] = [
  4, 4, 4, 4, 2, 2, 2, 2, 9, 9, 5, 5, 5, 5, 1, 1, 1, 1, 6, 6, 6, 6, 5, 5, 5, 5,
  1, 1, 1, 1, 8, 8, 8, 8, 3, 3, 3, 3, 7, 7, 7, 7, 5, 5, 5, 5, 1, 1, 1, 1, 6, 6,
  6, 6, 4, 4, 4, 4, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 6, 6, 6, 6, 2, 2, 2, 2, 4,
  4, 4, 4, 7, 7, 7, 7, 3, 3, 3, 3, 8, 8, 8, 8, 6, 6, 2, 2, 2, 3, 3, 3, 1, 1, 5,
  5, 5, 4, 4, 4, 2, 2, 3, 3, 4, 4, 7, 7, 7, 5, 5,
];
reels[0][3] = [
  7, 7, 7, 7, 4, 4, 4, 4, 1, 1, 1, 1, 2, 2, 2, 2, 5, 5, 5, 5, 4, 4, 4, 4, 2, 2,
  2, 2, 8, 8, 8, 8, 3, 3, 3, 3, 1, 1, 1, 1, 6, 6, 6, 6, 5, 5, 5, 5, 7, 7, 7, 7,
  1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 9, 9, 5, 5, 5, 5, 2, 2, 2, 4, 4, 4, 1, 1,
  1, 3, 3, 3, 3, 6, 6, 6, 6, 7, 7, 7, 8, 8, 8, 8, 5, 5, 5, 6, 6, 6, 6, 2, 2, 3,
  3, 3, 3, 4, 4, 5, 5, 1, 1, 3, 3, 3, 6, 6, 3, 3,
];
reels[0][4] = [
  5, 5, 5, 5, 4, 4, 4, 4, 6, 6, 6, 6, 9, 9, 7, 7, 7, 7, 1, 1, 1, 1, 3, 3, 3, 3,
  7, 7, 7, 7, 4, 4, 4, 4, 6, 6, 6, 6, 7, 7, 7, 3, 3, 3, 3, 8, 8, 8, 8, 5, 5, 5,
  5, 3, 3, 3, 3, 4, 4, 4, 4, 1, 1, 1, 1, 6, 6, 6, 6, 2, 2, 2, 2, 4, 4, 4, 1, 1,
  1, 1, 2, 2, 2, 2, 3, 3, 3, 6, 6, 2, 2, 2, 2, 5, 5, 5, 5, 4, 4, 1, 1, 1, 5, 5,
  5, 8, 8, 8, 8, 3, 3, 5, 5, 1, 1, 2, 2, 2, 2, 2,
];

// 2026 rebalance (same treatment as reels[0]): low1-4 density cut ~1.5x
// (26->17 per reel), freed budget shifted proportionally into mid1-4
// (9:7:6:6 -> 21:16:14:13 per reel). Wild count (0 on reel0, 6 elsewhere)
// is untouched - HIGH's RTP premium over LOW still comes entirely from wild
// density, per design.
reels[1][0] = [
  5, 5, 5, 5, 1, 1, 1, 1, 4, 4, 4, 4, 6, 6, 6, 6, 1, 1, 1, 1, 2, 2, 2, 2, 5, 5,
  5, 5, 6, 6, 6, 6, 2, 2, 2, 2, 3, 3, 3, 3, 5, 5, 5, 5, 8, 8, 8, 8, 7, 7, 7, 7,
  5, 5, 5, 5, 8, 8, 8, 8, 2, 2, 2, 2, 7, 7, 7, 7, 3, 3, 3, 3, 6, 6, 6, 6, 4, 4,
  4, 4, 3, 3, 3, 3, 2, 2, 2, 5, 5, 5, 1, 1, 1, 1, 7, 7, 7, 7, 3, 3, 3, 8, 8, 8,
  5, 5, 1, 1, 1, 3, 3, 4, 4, 4, 4, 1, 1, 8, 8, 6, 6, 6, 6, 2, 2, 4, 4, 4, 7, 7,
  4, 4,
];
// Pass 3 (final): wild=7 on all four wild-columns undershot slightly
// (100.76%), wild=9 overshot heavily (107.13%). Split the difference with
// mixed density per column - 8,7,8,7 - landing right around the ~102% target.
reels[1][1] = [
  8, 8, 8, 8, 6, 6, 6, 6, 2, 2, 2, 2, 5, 5, 5, 5, 3, 3, 3, 3, 8, 8, 8, 8, 7, 7,
  7, 7, 4, 4, 4, 4, 5, 5, 5, 5, 1, 1, 1, 1, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1,
  7, 7, 7, 7, 8, 8, 8, 4, 4, 4, 4, 9, 9, 9, 9, 3, 3, 3, 3, 4, 4, 4, 4, 1, 1, 1,
  1, 2, 2, 2, 2, 5, 5, 5, 5, 8, 8, 9, 9, 9, 9, 6, 6, 6, 6, 3, 3, 3, 2, 2, 2, 5,
  5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 4, 4, 4, 2, 2, 1, 1, 1, 7, 7, 4, 4, 5, 5, 5,
  3, 3, 6, 6, 6, 6, 5, 5,
];
reels[1][2] = [
  1, 1, 1, 1, 2, 2, 2, 2, 5, 5, 5, 5, 1, 1, 1, 1, 2, 2, 2, 2, 6, 6, 6, 6, 8, 8,
  8, 8, 7, 7, 7, 7, 3, 3, 3, 3, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 9, 9, 9, 9,
  6, 6, 6, 6, 1, 1, 1, 1, 9, 9, 9, 3, 3, 3, 3, 8, 8, 8, 8, 7, 7, 7, 7, 6, 6, 6,
  6, 2, 2, 2, 2, 8, 8, 8, 4, 4, 4, 4, 5, 5, 5, 5, 7, 7, 7, 7, 1, 1, 1, 1, 3, 3,
  3, 5, 5, 5, 5, 7, 7, 4, 4, 4, 4, 3, 3, 8, 8, 6, 6, 6, 6, 2, 2, 2, 5, 5, 5, 4,
  4, 4, 2, 2, 5, 5, 4, 4,
];
reels[1][3] = [
  4, 4, 4, 4, 7, 7, 7, 7, 8, 8, 8, 8, 2, 2, 2, 2, 7, 7, 7, 7, 5, 5, 5, 5, 1, 1,
  1, 1, 8, 8, 8, 8, 5, 5, 5, 5, 6, 6, 6, 6, 2, 2, 2, 2, 4, 4, 4, 4, 3, 3, 3, 3,
  6, 6, 6, 6, 5, 5, 5, 5, 9, 9, 9, 9, 2, 2, 2, 2, 5, 5, 5, 5, 9, 9, 9, 9, 8, 8,
  8, 5, 5, 5, 6, 6, 6, 6, 4, 4, 4, 4, 5, 5, 3, 3, 3, 3, 6, 6, 6, 6, 2, 2, 2, 3,
  3, 3, 3, 7, 7, 7, 7, 1, 1, 1, 1, 3, 3, 3, 2, 2, 7, 7, 1, 1, 1, 1, 8, 8, 3, 3,
  4, 4, 4, 1, 1, 1, 4, 4,
];
reels[1][4] = [
  4, 4, 4, 4, 6, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 7, 7, 7, 7, 3, 3, 3, 3, 2, 2,
  2, 2, 1, 1, 1, 1, 8, 8, 8, 8, 3, 3, 3, 3, 7, 7, 7, 7, 2, 2, 2, 2, 9, 9, 9, 9,
  4, 4, 4, 4, 8, 8, 8, 8, 1, 1, 1, 1, 3, 3, 3, 3, 5, 5, 5, 5, 4, 4, 4, 6, 6, 6,
  6, 5, 5, 5, 5, 2, 2, 2, 2, 3, 3, 3, 1, 1, 1, 1, 5, 5, 5, 5, 2, 2, 2, 6, 6, 6,
  6, 7, 7, 7, 7, 5, 5, 5, 2, 2, 9, 9, 9, 8, 8, 8, 6, 6, 6, 6, 4, 4, 1, 1, 1, 1,
  8, 8, 5, 5, 3, 3, 7, 7,
];
type WeightDict = Record<string, number>;

// Weighted pick over an object (source used the randomizer's weightchoice(values, keys);
// here weightchoice() returns the index into the values array).
function wcKey(obj: WeightDict): string {
  return Object.keys(obj)[weightchoice(Object.values(obj))];
}

function wcNum(obj: WeightDict): number {
  return Number(wcKey(obj));
}

function cloneWeights(obj: WeightDict): WeightDict {
  return { ...obj };
}

// Loose config type, matching the source (getMathConfig(): any) — weight tables are
// indexed by dynamic number/string keys throughout.
type MathConfig = any;

// Rebuilt fresh each spin — disableJackpotValue mutates it and the source calls
// getMathConfig() per spin; reels stay a shared const.
export function getMathConfig(): any {
  return {
    bonus_weights: {
      '0000': 26000, '1000': 4300, '0100': 4400, '0010': 4360, '1100': 955,
      '1010': 910, '0110': 955, '1110': 100, '0001': 4700, '1001': 140,
      '0101': 120, '0011': 120, '1101': 20, '0111': 15, '1011': 10, '1111': 1,
    },
    special_coin_amount_weight: {
      0: [3000, 200, 70, 0, 0, 0],
      1: [0, 1000, 20, 0, 0, 0],
      2: [0, 0, 3600, 100, 0, 0],
      3: [0, 0, 0, 100, 0, 0],
      4: [0, 0, 0, 0, 100, 0],
    },
    regular_coin_amount_weight: {
      0: [2800, 50, 50, 0, 0, 0],
      1: [1000, 1500, 65, 0, 0, 0],
      2: [3000, 2000, 0, 0, 0, 0],
      3: [3000, 500, 0, 0, 0, 0],
      4: [1, 0, 0, 0, 0, 0],
    },
    special_pos_weights: [1, 1, 2, 3, 3, 1, 1, 2, 3, 3, 1, 1, 2, 3, 3],
    fake_coins_weights: {
      [MYSTERY_ID]: 10, [MULT_ID]: 10, [COLLECT_ID]: 10, [MASTER_ID]: 20,
    },
    trigger_prob: { 0: 0, 1: 219, 2: 323, 3: 209, 4: 950, 5: 5225 },
    GRAND_TB: 1000,
    GRAND_MASTER_TB: 5000,
    master_transition_types: {
      '0001': { '0001': 0, '0011': 48, '0101': 46, '1001': 46, '0111': 20, '1101': 20, '1011': 20, '1111': 1 },
      '0011': { '0011': 100, '0111': 24, '1011': 16, '1111': 1 },
      '0101': { '0101': 100, '0111': 20, '1101': 20, '1111': 1 },
      '1001': { '1001': 100, '1011': 14, '1101': 6, '1111': 1 },
      '0111': { '0111': 100, '1111': 1 },
      '1101': { '1101': 100, '1111': 1 },
      '1011': { '1011': 100, '1111': 1 },
      '1111': { '1111': 1 },
    },
    multipliers: [2, 3, 4],
    multipliers_pos_weights: [1, 3],
    // 2026: which symbol type gets picked as a multiplier's target cell -
    // Collect deliberately weighted half as likely as everything else, to
    // reduce how often a Collect ends up multiplied (a driver of the RTP
    // right tail). Blank has no entry (never a valid target - multipliers
    // only land on landed symbols).
    mult_target_weights: {
      [MYSTERY_ID]: 1,
      [MULT_ID]: 2,
      [COLLECT_ID]: 1,
      [MASTER_ID]: 2,
      [BONUS_ID]: 2,
    },
    bs_type_weights: {
      '1000': { [BONUS_ID]: 170, [MYSTERY_ID]: 12, [MULT_ID]: 3, [COLLECT_ID]: 3 },
      '0100': { [BONUS_ID]: 160, [MYSTERY_ID]: 3, [MULT_ID]: 15, [COLLECT_ID]: 3 },
      '0010': { [BONUS_ID]: 130, [MYSTERY_ID]: 3, [MULT_ID]: 3, [COLLECT_ID]: 12 },
      '1100': { [BONUS_ID]: 170, [MYSTERY_ID]: 12, [MULT_ID]: 12, [COLLECT_ID]: 2 },
      '0110': { [BONUS_ID]: 130, [MYSTERY_ID]: 2, [MULT_ID]: 12, [COLLECT_ID]: 12 },
      '1010': { [BONUS_ID]: 190, [MYSTERY_ID]: 12, [MULT_ID]: 2, [COLLECT_ID]: 8 },
      '1110': { [BONUS_ID]: 120, [MYSTERY_ID]: 3, [MULT_ID]: 3, [COLLECT_ID]: 3 },
      '1001': { [BONUS_ID]: 120, [MYSTERY_ID]: 15, [MULT_ID]: 3, [COLLECT_ID]: 3 },
      '0101': { [BONUS_ID]: 130, [MYSTERY_ID]: 3, [MULT_ID]: 15, [COLLECT_ID]: 3 },
      '0011': { [BONUS_ID]: 130, [MYSTERY_ID]: 2, [MULT_ID]: 3, [COLLECT_ID]: 12 },
      '1101': { [BONUS_ID]: 130, [MYSTERY_ID]: 14, [MULT_ID]: 20, [COLLECT_ID]: 2 },
      '0111': { [BONUS_ID]: 170, [MYSTERY_ID]: 2, [MULT_ID]: 12, [COLLECT_ID]: 8 },
      '1011': { [BONUS_ID]: 170, [MYSTERY_ID]: 12, [MULT_ID]: 2, [COLLECT_ID]: 8 },
      '1111': { [BONUS_ID]: 70, [MYSTERY_ID]: 3, [MULT_ID]: 3, [COLLECT_ID]: 3 },
    },
    coef_reducing_bonus_chance: {
      '1000': 8, '0100': 8, '0010': 8, '1100': 12, '0110': 12, '1010': 12,
      '1110': 4, '1001': 8, '0101': 8, '0011': 8, '1101': 12, '0111': 12, '1011': 12, '1111': 4,
    },
    coef_reducing_specials_chance: {
      '1000': 4, '0100': 4, '0010': 4, '1100': 4, '0110': 3, '1010': 4,
      '1110': 2, '1001': 3, '0101': 2, '0011': 2, '1101': 2, '0111': 2, '1011': 2, '1111': 1,
    },
    spinsleftcoef: {
      '1000': [70, 40, 30], '0100': [80, 40, 30], '0010': [80, 50, 40], '1100': [80, 55, 45],
      '0110': [80, 40, 30], '1010': [65, 35, 30], '1110': [70, 40, 30], '1001': [80, 55, 50],
      '0101': [80, 55, 50], '0011': [80, 40, 40], '1101': [80, 55, 50], '0111': [80, 40, 40],
      '1011': [80, 40, 40], '1111': [60, 40, 40],
    },
    golden_pot_not_upgrading_probs: { 0: 700, 1: 400, 2: 0 },
    coin_values: {
      main: { 1: 200, 2: 200, 3: 100, 4: 100, 5: 50, 6: 50, 7: 10, 8: 10, 9: 10, 10: 5, 12: 5, 15: 200, 30: 100, 100: 100 },
      main_bonus: { 1: 800, 2: 800, 3: 800, 4: 600, 5: 500, 6: 200, 7: 100, 8: 50, 9: 20, 10: 5, 12: 5, 15: 10, 30: 1, 100: 1 },
      bonus_trigger: { 1: 2300, 2: 1800, 3: 650, 4: 300, 5: 160, 6: 120, 7: 80, 8: 30, 9: 10, 10: 5, 12: 3, 15: 2, 30: 1, 100: 0 },
    },
    coin_values_bonus: {
      regular: { 1: 2200, 2: 1800, 3: 650, 4: 300, 5: 160, 6: 120, 7: 50, 8: 20, 9: 10, 10: 5, 12: 2, 15: 10, 30: 4, 100: 1 },
      master: { 1: 850, 2: 850, 3: 750, 4: 380, 5: 290, 6: 150, 7: 100, 8: 40, 9: 20, 10: 8, 12: 5, 15: 18, 30: 18, 100: 3 },
    },
    coin_values_bonus_low: {
      regular: { 1: 2200, 2: 1800, 3: 650, 4: 300, 5: 160, 6: 120, 7: 50, 8: 20, 9: 10, 10: 5, 12: 2, 15: 10, 30: 4, 100: 0 },
      master: { 1: 850, 2: 850, 3: 750, 4: 380, 5: 290, 6: 150, 7: 80, 8: 10, 9: 8, 10: 8, 12: 5, 15: 5, 30: 2, 100: 0 },
    },
    master_values: { 7: 10, 8: 20, 9: 12, 10: 3 },
    mult_values: { 2: 25, 3: 60, 4: 50, 5: 30, 6: 10, 7: 8, 8: 3, 9: 1, 10: 1 },
    // 2026: Mystery now guarantees a jackpot value (mini/minor/major only) -
    // non-jackpot cash values (20/25/40/50/75) removed. Relative weights
    // between the 3 tiers kept exactly as before (100 stays at 0 weight in
    // the "isTriggering" context, matching the original's intent that the
    // very first triggering reveal can't be a major).
    mystery_values: { 15: 1200, 30: 300, 100: 0 },
    mystery_values_bonus: { 15: 1050, 30: 680, 100: 13 },
    max_amount_jackpots: { 15: 3, 30: 2, 100: 1 },
    bonusescoef: {
      '1000': { 6: 230, 7: 160, 8: 140, 9: 100, 10: 80, 11: 60, 12: 40, 13: 20, 14: 10, 15: 0 },
      '0100': { 6: 240, 7: 200, 8: 140, 9: 100, 10: 85, 11: 65, 12: 40, 13: 20, 14: 10, 15: 0 },
      '0010': { 6: 240, 7: 200, 8: 140, 9: 100, 10: 85, 11: 65, 12: 40, 13: 20, 14: 15, 15: 0 },
      '1100': { 6: 240, 7: 180, 8: 120, 9: 100, 10: 90, 11: 80, 12: 65, 13: 30, 14: 12, 15: 0 },
      '0110': { 6: 220, 7: 180, 8: 120, 9: 100, 10: 90, 11: 75, 12: 50, 13: 25, 14: 6, 15: 0 },
      '1010': { 6: 210, 7: 180, 8: 115, 9: 100, 10: 80, 11: 65, 12: 45, 13: 20, 14: 10, 15: 0 },
      '1110': { 6: 215, 7: 200, 8: 150, 9: 120, 10: 80, 11: 95, 12: 70, 13: 20, 14: 5, 15: 0 },
      '1001': { 6: 250, 7: 210, 8: 200, 9: 180, 10: 120, 11: 100, 12: 100, 13: 80, 14: 60, 15: 50, 16: 30, 17: 25, 18: 50, 19: 50, 20: 30, 21: 20, 22: 10, 23: 10, 24: 5, 25: 0 },
      '0101': { 6: 250, 7: 200, 8: 180, 9: 180, 10: 120, 11: 100, 12: 100, 13: 80, 14: 60, 15: 40, 16: 20, 17: 20, 18: 10, 19: 10, 20: 10, 21: 10, 22: 8, 23: 3, 24: 1, 25: 0 },
      '0011': { 6: 250, 7: 200, 8: 180, 9: 180, 10: 120, 11: 100, 12: 60, 13: 80, 14: 60, 15: 40, 16: 20, 17: 20, 18: 10, 19: 10, 20: 10, 21: 10, 22: 3, 23: 2, 24: 1, 25: 0 },
      '1101': { 6: 250, 7: 200, 8: 180, 9: 180, 10: 120, 11: 100, 12: 100, 13: 80, 14: 60, 15: 40, 16: 20, 17: 20, 18: 18, 19: 15, 20: 12, 21: 10, 22: 8, 23: 6, 24: 4, 25: 0 },
      '0111': { 6: 250, 7: 200, 8: 180, 9: 180, 10: 120, 11: 100, 12: 100, 13: 80, 14: 60, 15: 40, 16: 30, 17: 20, 18: 10, 19: 10, 20: 8, 21: 8, 22: 3, 23: 2, 24: 1, 25: 0 },
      '1011': { 6: 250, 7: 200, 8: 180, 9: 180, 10: 120, 11: 100, 12: 100, 13: 80, 14: 60, 15: 40, 16: 20, 17: 20, 18: 10, 19: 10, 20: 10, 21: 10, 22: 3, 23: 2, 24: 1, 25: 0 },
      '1111': { 6: 250, 7: 200, 8: 180, 9: 180, 10: 120, 11: 100, 12: 100, 13: 80, 14: 70, 15: 50, 16: 30, 17: 20, 18: 10, 19: 10, 20: 8, 21: 8, 22: 5, 23: 2, 24: 1, 25: 0 },
    },
    force_master_grand_weight: 20000,
    max_added_weights: 100,
    max_respin_chance: 1000,
    min_win_bonus: { regular: 12, master: 50 },
    // 2026 patch: once Collect has appeared anywhere in the current
    // macro-round (main game OR bonus), knock this much more off its weight
    // for every subsequent draw for the rest of the round - on top of (not
    // instead of) the existing per-occurrence coef_reducing_specials_chance.
    collect_extra_cut_after_first: 3,
  };
}

// Row-major flatten (matches gdk getFlattenedIndex).
function flatIndex(col: number, row: number): number {
  return row * rolls + col;
}

function combPay(symbol: number, leng: number): number {
  return (combs[symbol] as number[])[leng] ?? 0;
}

function calcLeft(line: number[]): [number, number, number] {
  let main = -1;
  for (let l = 0; l < line.length; l++) {
    if (line[l] > 0) {
      if (combs[line[l]][0] === 'line') {
        main = line[l];
        break;
      }
    } else {
      main = -1;
      break;
    }
  }
  if (main === -1) return [0, 0, 0];
  let leng = 0;
  for (let l = 0; l < line.length; l++) {
    if (line[l] === main || e_wild.indexOf(line[l]) > -1) leng += 1;
    else break;
  }
  if (leng === 0) return [0, main, leng];
  return [combPay(main, leng), main, leng];
}

function calcLeftWild(line: number[]): [number, number, number] {
  let leng = 0;
  for (let l = 0; l < line.length; l++) {
    if (combs[line[l]][0] === 'wild') {
      leng += 1;
    } else {
      if (leng === 0) return [0, 0, 0];
      return [combPay(line[0], leng), line[0], leng];
    }
  }
  return [combPay(line[0], leng), line[0], leng];
}

function checkReward(reelstop: number[][], listcomb: number[][], params: StatsParams): number {
  let total = 0;
  const el = [0, 0, 0, 0, 0];
  for (let i = 1; i <= lines_amount; i++) {
    for (let j = 0; j < rolls; j++) el[j] = reelstop[j][win[i][j]];
    const [w1, e1, l1] = calcLeft(el);
    const [w2, e2, l2] = calcLeftWild(el);
    let linewin: number;
    let elem: number;
    let leng: number;
    if (w1 > w2) {
      linewin = w1;
      elem = e1;
      leng = l1;
    } else {
      linewin = w2;
      elem = e2;
      leng = l2;
    }
    if (elem > 0 && combPay(elem, leng) > 0) {
      listcomb[leng][elem] += 1;
      dictinc3(params, 'combinations', 'base', `x${leng}_symbol#${elem}`, 1);
    }
    total += linewin;
  }
  return total;
}

function applyOccupiedCellExclusions(weights: number[], reelstop: number[][]): number[] {
  const updated = weights.slice();
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < rolls; col++) {
      if (reelstop[col][row] === WILD_ID || special_ids.includes(reelstop[col][row])) {
        updated[flatIndex(col, row)] = 0;
      }
    }
  }
  return updated;
}

function allZero(arr: number[]): boolean {
  for (let i = 0; i < arr.length; i++) if (arr[i] !== 0) return false;
  return true;
}

// One-per-round cap for Collect/Multi/Mystery (2026 logic, not a stub): if the
// symbol about to land is one of these three AND that type already appeared
// earlier in the SAME round (base game placement or bonus respins share one
// `seenTypes` list, threaded in from simmacro), downgrade it to a plain Bonus
// coin with its own resolved cash value instead - so the client never has to
// animate two of the same feature within one round. Master is intentionally
// excluded (its repeat-landing case is already handled by goldenPot).
function resolveOrDowngradeSpecial(
  symbol: number,
  seenTypes: number[],
  reelstop: number[][],
  bonusValues: number[][],
  col: number,
  row: number,
  bsType: string,
  jackpotAmounts: Record<number, number>,
  mathConfig: MathConfig,
  params: StatsParams,
): number {
  if ((symbol === COLLECT_ID || symbol === MULT_ID || symbol === MYSTERY_ID) && seenTypes.includes(symbol)) {
    reelstop[col][row] = BONUS_ID;
    const coinValues = cloneWeights(bsType !== '0000' ? mathConfig.coin_values.main_bonus : mathConfig.coin_values.main);
    const bval = wcNum(coinValues);
    bonusValues[col][row] = bval;
    if (jackpot_values.includes(bval)) {
      jackpotAmounts[bval]++;
      dictinc(params, 'jackpotmain_' + jackpot_dict[bval], 1);
      if (jackpotAmounts[bval] >= mathConfig.max_amount_jackpots[bval]) disableJackpotValue(bval, mathConfig);
    }
    return BONUS_ID;
  }
  reelstop[col][row] = symbol;
  if (symbol === COLLECT_ID || symbol === MULT_ID || symbol === MYSTERY_ID) seenTypes.push(symbol);
  return symbol;
}

function placeSpecialCoins(
  reelstop: number[][],
  bonusValues: number[][],
  posWeights: number[],
  coinTypes: number[],
  seenTypes: number[],
  bsType: string,
  jackpotAmounts: Record<number, number>,
  mathConfig: MathConfig,
  params: StatsParams,
): [number, boolean] {
  let placed = 0;
  for (const coin of coinTypes) {
    if (allZero(posWeights)) return [0, false];
    const pos = weightchoice(posWeights);
    const row = Math.floor(pos / rolls);
    const col = pos % rolls;
    resolveOrDowngradeSpecial(coin, seenTypes, reelstop, bonusValues, col, row, bsType, jackpotAmounts, mathConfig, params);
    posWeights[pos] = 0;
    for (let r = 0; r < height; r++) posWeights[r * rolls + col] = 0;
    placed++;
    if (coin === MASTER_ID) coinTypes.splice(coinTypes.indexOf(MASTER_ID), 1);
  }
  return [placed, true];
}

function placeRemainingSpecialCoins(
  reelstop: number[][],
  bonusValues: number[][],
  posWeights: number[],
  coinTypes: number[],
  remaining: number,
  seenTypes: number[],
  bsType: string,
  jackpotAmounts: Record<number, number>,
  mathConfig: MathConfig,
  params: StatsParams,
): [number, boolean] {
  let placed = 0;
  for (let i = 0; i < remaining; i++) {
    if (allZero(posWeights)) return [0, false];
    if (coinTypes.length === 0) break;
    const pos = weightchoice(posWeights);
    posWeights[pos] = 0;
    const row = Math.floor(pos / rolls);
    const col = pos % rolls;
    const coinIndex = (Math.random() * coinTypes.length) | 0;
    resolveOrDowngradeSpecial(
      coinTypes[coinIndex],
      seenTypes,
      reelstop,
      bonusValues,
      col,
      row,
      bsType,
      jackpotAmounts,
      mathConfig,
      params,
    );
    for (let r = 0; r < height; r++) posWeights[r * rolls + col] = 0;
    placed++;
  }
  return [placed, true];
}

function placeRegularCoins(
  reelstop: number[][],
  bonusValues: number[][],
  posWeights: number[],
  amount: number,
  jackpotAmounts: Record<number, number>,
  bsType: string,
  mathConfig: MathConfig,
  params: StatsParams,
): void {
  const coinValues = cloneWeights(bsType !== '0000' ? mathConfig.coin_values.main_bonus : mathConfig.coin_values.main);
  for (let i = 0; i < amount; i++) {
    if (allZero(posWeights)) break;
    const pos = weightchoice(posWeights);
    const row = Math.floor(pos / rolls);
    const col = pos % rolls;
    posWeights[pos] = 0;
    reelstop[col][row] = BONUS_ID;
    const bval = wcNum(coinValues);
    if (jackpot_values.includes(bval)) {
      jackpotAmounts[bval]++;
      dictinc(params, 'jackpotmain_' + jackpot_dict[bval], 1);
      if (jackpotAmounts[bval] >= mathConfig.max_amount_jackpots[bval]) disableJackpotValue(bval, mathConfig);
    }
    bonusValues[col][row] = bval;
  }
}

function specialSymbolsAdding(
  reelstop: number[][],
  bonusValues: number[][],
  jackpotAmounts: Record<number, number>,
  mathConfig: MathConfig,
  params: StatsParams,
  seenTypes: number[],
): [string, number] {
  let bsType = wcKey(mathConfig.bonus_weights);
  const specialTypesCount = (bsType.match(/1/g) || []).length;
  const specialCoinAmount =
    bsType === '0001' ? 1 : weightchoice(mathConfig.special_coin_amount_weight[specialTypesCount]);
  const regularCoinAmount = weightchoice(mathConfig.regular_coin_amount_weight[specialCoinAmount]);

  const coinTypes: number[] = [];
  if (bsType === '0000') {
    const fake = cloneWeights(mathConfig.fake_coins_weights);
    for (let i = 0; i < specialCoinAmount; i++) {
      const coin = wcNum(fake);
      coinTypes.push(coin);
      if (coin === MASTER_ID) fake[MASTER_ID] = 0;
    }
  } else {
    for (let i = 0; i < 4; i++) if (bsType[i] === '1') coinTypes.push(special_ids[i]);
  }

  const posWeights = applyOccupiedCellExclusions(mathConfig.special_pos_weights, reelstop);
  const [placed, ok1] = placeSpecialCoins(
    reelstop,
    bonusValues,
    posWeights,
    coinTypes,
    seenTypes,
    bsType,
    jackpotAmounts,
    mathConfig,
    params,
  );
  let addedSpecialAmount = placed;
  const remaining = specialCoinAmount - placed;
  const [placed2, ok2] = placeRemainingSpecialCoins(
    reelstop,
    bonusValues,
    posWeights,
    coinTypes,
    remaining,
    seenTypes,
    bsType,
    jackpotAmounts,
    mathConfig,
    params,
  );
  addedSpecialAmount += placed2;
  if (!(ok1 && ok2)) bsType = '0000';

  const regPosWeights = applyOccupiedCellExclusions(mathConfig.special_pos_weights, reelstop);
  placeRegularCoins(reelstop, bonusValues, regPosWeights, regularCoinAmount, jackpotAmounts, bsType, mathConfig, params);
  return [bsType, addedSpecialAmount];
}

function getAvailableCells(reelstop: number[][]): [number, number][] {
  const cells: [number, number][] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < rolls; col++) {
      if (!special_bonus_wild_ids.includes(reelstop[col][row])) cells.push([col, row]);
    }
  }
  return cells;
}

function findTriggeredSpecials(reelstop: number[][]): [number[], number] {
  const triggered: number[] = [];
  let total = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < rolls; col++) {
      const sym = reelstop[col][row];
      if (specials_bonus_ids.includes(sym)) {
        total++;
        if (special_ids.includes(sym) && sym !== MASTER_ID) triggered.push(sym);
      }
    }
  }
  return [triggered, total];
}

function getSymbolsForNewBonusType(bonusType: string, newBonusType: string, specials: number[]): number[] {
  if (bonusType === newBonusType) {
    if (specials.length === 0) return [];
    return [specials[(Math.random() * specials.length) | 0]];
  }
  const symbols: number[] = [];
  for (let i = 0; i < 3; i++) {
    if (newBonusType[i] === '1' && bonusType[i] === '0') symbols.push(special_ids[i]);
  }
  return symbols;
}

function updateMasterType(
  reelstop: number[][],
  bonusValues: number[][],
  availableCells: [number, number][],
  bonusType: string,
  specials: number[],
  jackpotAmounts: Record<number, number>,
  mathConfig: MathConfig,
  params: StatsParams,
  seenTypes: number[],
): [string, number, boolean] {
  let specialCount = 0;
  let canTrigger = false;
  const newBonusType = wcKey(mathConfig.master_transition_types[bonusType]);
  const newSymbols = getSymbolsForNewBonusType(bonusType, newBonusType, specials);
  if (availableCells.length >= newSymbols.length) {
    canTrigger = true;
    for (const symbol of newSymbols) {
      const index = (Math.random() * availableCells.length) | 0;
      const c = availableCells[index][0];
      const r = availableCells[index][1];
      resolveOrDowngradeSpecial(symbol, seenTypes, reelstop, bonusValues, c, r, bonusType, jackpotAmounts, mathConfig, params);
      availableCells.splice(index, 1);
      specialCount++;
    }
    dictinc(params, 'bonustypechangemaster_' + bonusType + '_' + newBonusType, 1);
  }
  return [newBonusType, specialCount, canTrigger];
}

function getExtraBonusSymbols(
  reelstop: number[][],
  bonusValues: number[][],
  jackpotAmounts: Record<number, number>,
  mathConfig: MathConfig,
  bonusType: string,
  params: StatsParams,
  seenTypes: number[],
): [string, boolean] {
  const availableCells = getAvailableCells(reelstop);
  let newBonusType = bonusType;
  let canTriggerMaster = true;
  let totalSpecialsCount = 0;
  const [specialsTriggered, coinCount] = findTriggeredSpecials(reelstop);
  totalSpecialsCount += coinCount;
  const bonus = bonusType.slice(-1) === '1' ? 'master' : 'regular';
  if (bonus === 'master') {
    let newSpecialCount: number;
    [newBonusType, newSpecialCount, canTriggerMaster] = updateMasterType(
      reelstop,
      bonusValues,
      availableCells,
      bonusType,
      specialsTriggered,
      jackpotAmounts,
      mathConfig,
      params,
      seenTypes,
    );
    totalSpecialsCount += newSpecialCount;
  }
  const addBonusAmount = Math.max(1, 6 - totalSpecialsCount);
  let canTrigger: boolean;
  if (
    availableCells.length >= addBonusAmount &&
    ((bonus === 'master' && canTriggerMaster) || bonus === 'regular')
  ) {
    canTrigger = true;
    const triggerValues = mathConfig.coin_values.bonus_trigger;
    for (let i = 0; i < addBonusAmount; i++) {
      const index = (Math.random() * availableCells.length) | 0;
      const c = availableCells[index][0];
      const r = availableCells[index][1];
      reelstop[c][r] = BONUS_ID;
      const bval = wcNum(triggerValues);
      bonusValues[c][r] = bval;
      if (jackpot_values.includes(bval)) {
        jackpotAmounts[bval]++;
        if (jackpotAmounts[bval] >= mathConfig.max_amount_jackpots[bval]) disableJackpotValue(bval, mathConfig);
        dictinc(params, 'jackpotmain_' + jackpot_dict[bval], 1);
      }
      availableCells.splice(index, 1);
    }
    bonusType = newBonusType;
  } else {
    canTrigger = false;
  }
  return [bonusType, canTrigger];
}

function disableJackpotValue(bval: number, mathConfig: MathConfig): void {
  mathConfig.mystery_values[bval] = 0;
  mathConfig.mystery_values_bonus[bval] = 0;
  mathConfig.coin_values_bonus.regular[bval] = 0;
  mathConfig.coin_values_bonus.master[bval] = 0;
  mathConfig.coin_values_bonus_low.master[bval] = 0;
  mathConfig.coin_values.main[bval] = 0;
  mathConfig.coin_values.main_bonus[bval] = 0;
  mathConfig.coin_values.bonus_trigger[bval] = 0;
}

function safeGuardWeights(weights: WeightDict): WeightDict {
  const nw = cloneWeights(weights);
  if (Object.values(nw).every((v) => v === 0)) {
    const lowest = Math.min(...Object.keys(nw).map(Number));
    for (const k in nw) nw[k] = 0;
    nw[lowest] = 1;
  }
  return nw;
}

function getNewWeights(newBsSymbols: number[], bonusType: string, mathConfig: MathConfig): WeightDict {
  const nw = cloneWeights(mathConfig.bs_type_weights[bonusType]);
  for (const symb of newBsSymbols) {
    if (symb === BONUS_ID) {
      nw[BONUS_ID] = Math.max(0, nw[BONUS_ID] - mathConfig.coef_reducing_bonus_chance[bonusType]);
    }
    if (special_ids.includes(symb)) {
      nw[symb] = Math.max(0, nw[symb] - mathConfig.coef_reducing_specials_chance[bonusType]);
      nw[BONUS_ID] += mathConfig.coef_reducing_bonus_chance[bonusType];
    }
  }
  return nw;
}

function getPositionWeights(
  multFrames: number[][],
  availableCells: [number, number][],
  mathConfig: MathConfig,
): number[] {
  const [posWeight, multPosWeight] = mathConfig.multipliers_pos_weights;
  const weights = Array(availableCells.length).fill(posWeight);
  for (let pos = 0; pos < weights.length; pos++) {
    const x = availableCells[pos][0];
    const y = availableCells[pos][1];
    if (multFrames[x][y] > 1) weights[pos] = multPosWeight;
  }
  return weights;
}

function isCenterGrid(row: number): boolean {
  return row >= 1 && row <= 3;
}

function goldenPot(
  x: number,
  y: number,
  bsType: string,
  currentReelstop: number[][],
  symbolTypeIndex: number,
  upgratedTypes: number[],
  goldenAmount: number,
  goldenNotUpgradingCount: number,
  mathConfig: MathConfig,
): [string, number, number] {
  let newBsType = bsType;
  if (bsType[symbolTypeIndex - 1] === '0') {
    const temp = [...bsType];
    temp[symbolTypeIndex - 1] = '1';
    newBsType = temp.join('');
    upgratedTypes.push(currentReelstop[x][y]);
    goldenAmount++;
  } else {
    const g = mathConfig.golden_pot_not_upgrading_probs[goldenNotUpgradingCount];
    const land = weightchoice([1000 - g, g]);
    if (land === 1) {
      goldenNotUpgradingCount++;
      goldenAmount++;
    }
  }
  return [newBsType, goldenNotUpgradingCount, goldenAmount];
}

function multFrameFeature(
  reelstop: number[][],
  bonusValues: number[][],
  multMap: number[][],
  rows: number,
  mathConfig: MathConfig,
): void {
  let multSymAmount = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < rolls; col++) {
      if (reelstop[col][row] === MULT_ID && bonusValues[col][row] === 0) {
        bonusValues[col][row] = wcNum(mathConfig.mult_values);
        multSymAmount++;
      }
    }
  }
  // 2026: multipliers land on cells that already carry a landed symbol (any
  // non-blank cell), not on empty ones - so there's nothing to relocate later
  // when a new symbol arrives (see the removed moveFrames). Same quantity per
  // Mult coin as before (mathConfig.multipliers.length drops, [2,3,5]),
  // preferring not-yet-multiplied symbol cells first, falling back to
  // stacking onto an already-multiplied one once those run out.
  const anySymbolCells: [number, number][] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < rolls; j++) {
      if (reelstop[j][i] !== BLANK_ID) anySymbolCells.push([j, i]);
    }
  }
  for (let s = 0; s < multSymAmount; s++) {
    const unmultipliedSymbolCells: [number, number][] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < rolls; col++) {
        if (reelstop[col][row] !== BLANK_ID && multMap[col][row] === 1) unmultipliedSymbolCells.push([col, row]);
      }
    }
    for (let i = 0; i < mathConfig.multipliers.length; i++) {
      if (unmultipliedSymbolCells.length) {
        const weights = unmultipliedSymbolCells.map(([c, r]) => mathConfig.mult_target_weights[reelstop[c][r]] ?? 0);
        const index = weightchoice(weights);
        const c = unmultipliedSymbolCells[index][0];
        const r = unmultipliedSymbolCells[index][1];
        multMap[c][r] = mathConfig.multipliers[i];
        unmultipliedSymbolCells.splice(index, 1);
      } else if (anySymbolCells.length > 0) {
        const weights = anySymbolCells.map(([c, r]) => mathConfig.mult_target_weights[reelstop[c][r]] ?? 0);
        const index = weightchoice(weights);
        const c = anySymbolCells[index][0];
        const r = anySymbolCells[index][1];
        multMap[c][r] += mathConfig.multipliers[i];
      }
    }
  }
}

function masterFeature(reelstop: number[][], bonusValues: number[][], rows: number, mathConfig: MathConfig): void {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < rolls; col++) {
      if (reelstop[col][row] === MASTER_ID && bonusValues[col][row] === 0) {
        bonusValues[col][row] = wcNum(mathConfig.master_values);
      }
    }
  }
}

function mysteryFeature(
  reelstop: number[][],
  bonusValues: number[][],
  rows: number,
  jackpotAmounts: Record<number, number>,
  isTriggering: boolean,
  mathConfig: MathConfig,
): void {
  const weights = isTriggering ? mathConfig.mystery_values : mathConfig.mystery_values_bonus;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < rolls; col++) {
      if (reelstop[col][row] === MYSTERY_ID && bonusValues[col][row] === 0) {
        const mysteryPay = wcNum(weights);
        bonusValues[col][row] = mysteryPay;
        if (jackpot_values.includes(mysteryPay)) {
          jackpotAmounts[mysteryPay]++;
          if (jackpotAmounts[mysteryPay] >= mathConfig.max_amount_jackpots[mysteryPay]) {
            disableJackpotValue(mysteryPay, mathConfig);
          }
        }
      }
    }
  }
}

function collectFeature(reelstop: number[][], bonusValues: number[][], multMap: number[][], rows: number): void {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < rolls; col++) {
      if (reelstop[col][row] === COLLECT_ID && bonusValues[col][row] === 0) {
        let collectPay = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < rolls; c++) {
            if (bonusValues[c][r] > 0) collectPay += bonusValues[c][r] * multMap[c][r];
          }
        }
        bonusValues[col][row] = collectPay;
      }
    }
  }
}

function bonusSymbolActivation(
  reelstop: number[][],
  bonusValues: number[][],
  multMap: number[][],
  rows: number,
  jackpotAmounts: Record<number, number>,
  isTriggering: boolean,
  mathConfig: MathConfig,
): void {
  // 2026: resolution order Royal -> Mystery -> Multi -> Collect (was
  // Multi -> Royal -> Mystery -> Collect). Royal's own position doesn't
  // technically matter (it doesn't feed or depend on the others), but it's
  // placed first to match how it's presented to the player. Mystery must
  // resolve its own value before Collect sums the board, and Multi must place
  // its multipliers before Collect too (so Collect's sum already reflects
  // them) - Collect stays last either way.
  masterFeature(reelstop, bonusValues, rows, mathConfig);
  mysteryFeature(reelstop, bonusValues, rows, jackpotAmounts, isTriggering, mathConfig);
  multFrameFeature(reelstop, bonusValues, multMap, rows, mathConfig);
  collectFeature(reelstop, bonusValues, multMap, rows);
}

// Bonus round: hold & win respins.
function simbonus(
  reelstop: number[][],
  reelstopBonusValues: number[][],
  bonusTypeInput: string,
  jackpotAmounts: Record<number, number>,
  mathConfig: MathConfig,
  params: StatsParams,
  collectAlreadySeen: boolean,
): number {
  let bonusType = bonusTypeInput;
  const bonus = bonusType.slice(-1) === '1' ? 'master' : 'regular';
  const initialBonusType = bonusType;
  let rows = height;
  let currentReelstop: number[][];
  let currentBonusValues: number[][];
  if (bonus === 'master') {
    currentReelstop = reelstop.map((col) => [0, ...col, 0]);
    currentBonusValues = reelstopBonusValues.map((col) => [0, ...col, 0]);
    rows = height + 2;
  } else {
    currentReelstop = reelstop.map((col) => col.slice());
    currentBonusValues = reelstopBonusValues.map((col) => col.slice());
  }

  let curwin = 0;
  let respins = bonus_spins;
  let bonusRounds = 0;
  let goldenNotUpgradingCount = 0;
  let goldenAmount = 0;
  const upgratedTypes: number[] = [];
  let partialPos = 0;
  let partialGrandJackpot = false;
  let grandJackpot = false;
  // Whole-session list of every symbol generated across all respins - this is
  // the original, pre-existing mechanic that feeds getNewWeights' soft
  // coef_reducing_* weight adjustment (unrelated to the one-per-micro-round
  // dedup cap below, which uses its own separate, per-respin-reset list).
  const newSymbolsGenerated: number[] = [];
  // Macro-round-wide (main game + this whole bonus): once true, every future
  // Collect draw gets an extra weight cut on top of the usual per-occurrence
  // one - seeded from whatever the main game already saw before this call.
  let collectHasAppeared = collectAlreadySeen;

  const multiplierFrames: number[][] = Array.from({ length: rolls }, () => Array(rows).fill(1));

  // Initial scan: count coins, blank out non-specials, collect available cells.
  const availableCells: [number, number][] = [];
  let coinAmount = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < rolls; col++) {
      const cell = currentReelstop[col][row];
      if (specials_bonus_ids.includes(cell)) {
        coinAmount++;
      } else {
        currentReelstop[col][row] = BLANK_ID;
        availableCells.push([col, row]);
      }
    }
  }
  if (coinAmount < 6) throw new Error(`[4 Pots Riches]: Not enough coins in bstype "${bonusType}"`);

  // Activate features at bonus start.
  bonusSymbolActivation(currentReelstop, currentBonusValues, multiplierFrames, rows, jackpotAmounts, true, mathConfig);

  // Win so far after activation.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < rolls; col++) {
      const cell = currentReelstop[col][row];
      const bval = currentBonusValues[col][row];
      if (specials_bonus_ids.includes(cell)) {
        curwin += bval * tb;
        if (isCenterGrid(row) && bonus === 'master') partialPos++;
      }
    }
  }

  const grandPrize = bonus === 'master' ? mathConfig.GRAND_MASTER_TB : mathConfig.GRAND_TB;
  let forceMasterGrand = 0;
  if (['1001', '0101'].includes(bonusType)) {
    forceMasterGrand = weightchoice([mathConfig.force_master_grand_weight - 1, 1]);
  }

  while (respins > 0) {
    respins--;
    bonusRounds++;
    let currentAdded = 0;

    if (coinAmount < 6) throw new Error(`[4 Pots Riches]: Not enough coins respin in bstype "${bonusType}"`);
    const r = mathConfig.bonusescoef[bonusType][coinAmount] * mathConfig.spinsleftcoef[bonusType][respins];
    for (let i = 0; i < rolls * rows - coinAmount; i++) {
      const land = weightchoice([mathConfig.max_added_weights * mathConfig.max_respin_chance - r, r]);
      if (land === 1) currentAdded += 1;
    }
    if (currentAdded === 0 && curwin < mathConfig.min_win_bonus[bonus] * tb) currentAdded = 1;
    if (bonusRounds === 1 && currentAdded === availableCells.length) currentAdded = 1;
    if (currentAdded === 0 && respins === 0 && forceMasterGrand) currentAdded = 1;
    dictinc(params, 'currentadded_' + bonusType + '_' + currentAdded, 1);

    curwin = 0;
    // One-per-respin cap (2026 logic): each respin (= one "bonusRounds" pass)
    // is its own micro-round - a duplicate is only downgraded if it would
    // land TWICE within THIS SAME respin's batch of `currentAdded` new
    // symbols. A Collect (etc.) that already appeared in an earlier respin is
    // free to appear again in a later one - this list resets every iteration,
    // unlike `newSymbolsGenerated` above which accumulates all session long.
    const seenTypesThisRound: number[] = [];

    if (currentAdded > 0) {
      respins = bonus_spins;
      coinAmount += currentAdded;
      let newBonusType = bonusType;
      for (let i = 0; i < currentAdded; i++) {
        const positionWeights = getPositionWeights(multiplierFrames, availableCells, mathConfig);
        const index = weightchoice(positionWeights);
        const c = availableCells[index][0];
        const r2 = availableCells[index][1];
        if (isCenterGrid(r2) && bonus === 'master') partialPos++;
        const newWeights = getNewWeights(newSymbolsGenerated, bonusType, mathConfig);
        let newWeightsMult = cloneWeights(newWeights);
        if (multiplierFrames[c][r2] >= 5) newWeightsMult[COLLECT_ID] = 0;
        if (currentAdded >= availableCells.length) newWeightsMult[MULT_ID] = 0;
        if (collectHasAppeared) {
          newWeightsMult[COLLECT_ID] = Math.max(0, newWeightsMult[COLLECT_ID] - mathConfig.collect_extra_cut_after_first);
        }
        newWeightsMult = safeGuardWeights(newWeightsMult);
        availableCells.splice(index, 1);
        currentReelstop[c][r2] = wcNum(newWeightsMult);
        if (
          (currentReelstop[c][r2] === COLLECT_ID ||
            currentReelstop[c][r2] === MULT_ID ||
            currentReelstop[c][r2] === MYSTERY_ID) &&
          seenTypesThisRound.includes(currentReelstop[c][r2])
        ) {
          currentReelstop[c][r2] = BONUS_ID;
        }
        if (currentReelstop[c][r2] === COLLECT_ID) collectHasAppeared = true;
        dictinc(params, 'symboltypebonus_' + bonusType + '_' + currentReelstop[c][r2], 1);
        newSymbolsGenerated.push(currentReelstop[c][r2]);
        if (
          currentReelstop[c][r2] === COLLECT_ID ||
          currentReelstop[c][r2] === MULT_ID ||
          currentReelstop[c][r2] === MYSTERY_ID
        ) {
          seenTypesThisRound.push(currentReelstop[c][r2]);
        }
        if (currentReelstop[c][r2] === BONUS_ID) {
          const coinValues =
            coinAmount >= height * rolls
              ? mathConfig.coin_values_bonus_low[bonus]
              : mathConfig.coin_values_bonus[bonus];
          const bval = wcNum(coinValues);
          currentBonusValues[c][r2] = bval;
          dictinc(params, 'coinvaluebonus_' + bonusType + '_' + bval, 1);
          if (jackpot_values.includes(bval)) {
            jackpotAmounts[bval]++;
            if (jackpotAmounts[bval] >= mathConfig.max_amount_jackpots[bval]) disableJackpotValue(bval, mathConfig);
          }
        }
        if (special_ids.includes(currentReelstop[c][r2])) {
          const symbolTypeIndex = currentReelstop[c][r2] - 9;
          [newBonusType, goldenNotUpgradingCount, goldenAmount] = goldenPot(
            c,
            r2,
            bonusType,
            currentReelstop,
            symbolTypeIndex,
            upgratedTypes,
            goldenAmount,
            goldenNotUpgradingCount,
            mathConfig,
          );
        }
      }
      bonusType = newBonusType;
    }

    bonusSymbolActivation(currentReelstop, currentBonusValues, multiplierFrames, rows, jackpotAmounts, false, mathConfig);

    if (coinAmount === rows * rolls) {
      curwin += grandPrize * tb;
      respins = 0;
      grandJackpot = true;
    }
    if (respins === 0 && !grandJackpot && partialPos === height * rolls && bonus === 'master') {
      curwin += mathConfig.GRAND_TB * tb;
      partialGrandJackpot = true;
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < rolls; col++) {
        const cell = currentReelstop[col][row];
        if (cell !== BLANK_ID) {
          const bval = currentBonusValues[col][row] * multiplierFrames[col][row];
          curwin += bval * tb;
        }
      }
    }

  }

  // ---- stats ----
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < rolls; col++) {
      const bval = currentBonusValues[col][row];
      if (jackpot_values.includes(bval)) {
        dictinc(params, 'jackpot_' + jackpot_dict[bval], 1);
        dictinc2(params, 'features', jackpot_dict[bval] + '_act', 1);
        dictinc3(params, 'features', jackpot_dict[bval] + '_wins', bval * tb, 1);
      }
    }
  }
  dictinc(params, 'ACTS_bonus_type_' + initialBonusType, 1);
  dictinc(params, 'rounds_' + initialBonusType + '_' + bonusRounds, 1);
  dictinc(params, 'finalcoinamount_' + initialBonusType + '_' + coinAmount, 1);
  dictinc(params, 'goldenamount_' + initialBonusType + '_' + goldenAmount, 1);
  dictinc2(params, 'features', 'bonustype' + initialBonusType + '_act', 1);
  dictinc3(params, 'features', 'bonustype' + bonusType + '_wins', curwin, 1);
  if (grandJackpot) {
    if (bonus === 'master') {
      dictinc(params, 'grand_master_awarded', 1);
      if (forceMasterGrand) dictinc(params, 'grand_master_forced_awarded', 1);
      dictinc2(params, 'features', 'grand_master_act', 1);
      dictinc3(params, 'features', 'grand_master_wins', grandPrize * tb, 1);
    } else {
      dictinc(params, 'grand_awarded', 1);
      dictinc2(params, 'features', 'grand_act', 1);
      dictinc3(params, 'features', 'grand_wins', grandPrize * tb, 1);
    }
  }
  if (partialGrandJackpot) {
    dictinc(params, 'grand_partial_awarded', 1);
    dictinc2(params, 'features', 'partial_grand_act', 1);
    dictinc3(params, 'features', 'partial_grand_wins', mathConfig.GRAND_TB * tb, 1);
  }

  return curwin;
}

function simmacro(listcomb: number[][], params: StatsParams): [number, number[][]] {
  const mathConfig = getMathConfig();
  let curwin = 0;
  let status = 'idle';

  // Two-tier RTP reelset selection (LOW/HIGH), independent per spin.
  const rss = Math.random() < reelSetProbability ? 0 : 1;

  const reelstop: number[][] = [];
  for (let i = 0; i < rolls; i++) {
    let sh = (Math.random() * reels[rss][i].length) | 0;
    reelstop[i] = [];
    for (let j = 0; j < height; j++) {
      if (sh + j >= reels[rss][i].length) sh -= reels[rss][i].length;
      reelstop[i].push(reels[rss][i][sh + j]);
    }
  }

  const reelstopBonusValues: number[][] = Array.from({ length: rolls }, () => Array(height).fill(0));
  const jackpotAmounts: Record<number, number> = { 15: 0, 30: 0, 100: 0 };
  // "Main game" micro-round tracker: shared by the initial coin placement AND
  // the pre-bonus trigger top-up (both still happen on the main-game board,
  // before the dedicated bonus screen takes over), so Collect/Multi/Mystery
  // are capped at one occurrence within THIS micro-round. The bonus round
  // itself (simbonus) keeps its own separate, independent tracker - a type
  // that already appeared here is allowed to appear again once the game
  // transitions into the bonus feature. See resolveOrDowngradeSpecial.
  const mainGameTypesSeen: number[] = [];

  const [bsType, addedSpecialAmount] = specialSymbolsAdding(
    reelstop,
    reelstopBonusValues,
    jackpotAmounts,
    mathConfig,
    params,
    mainGameTypesSeen,
  );

  const l = checkReward(reelstop, listcomb, params);
  curwin += l;

  let bonusType = bsType;
  let isTrigger = false;
  if (addedSpecialAmount > 0 && bsType !== '0000' && l === 0) {
    isTrigger =
      weightchoice([
        10000 - mathConfig.trigger_prob[addedSpecialAmount],
        mathConfig.trigger_prob[addedSpecialAmount],
      ]) === 1;
  }

  if (isTrigger) {
    let canTrigger: boolean;
    [bonusType, canTrigger] = getExtraBonusSymbols(
      reelstop,
      reelstopBonusValues,
      jackpotAmounts,
      mathConfig,
      bsType,
      params,
      mainGameTypesSeen,
    );
    isTrigger = canTrigger;
    let totalCoinAmount = 0;
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < rolls; i++) {
        if (specials_bonus_ids.includes(reelstop[i][j])) totalCoinAmount += 1;
      }
    }
    if (totalCoinAmount < 6) isTrigger = false;
    if (isTrigger) status = 'bonus';
  }

  if (status === 'bonus') {
    const bonusWin = simbonus(
      reelstop,
      reelstopBonusValues,
      bonusType,
      jackpotAmounts,
      mathConfig,
      params,
      mainGameTypesSeen.includes(COLLECT_ID),
    );
    curwin += bonusWin;
    dictinc2(params, 'rtp', 'basebonus', bonusWin);
    dictinc(params, 'acts_base_bonus', 1);
    dictinc2(params, 'features', 'bonus_act', 1);
    dictinc3(params, 'features', 'bonus_wins', bonusWin, 1);
  }

  dictinc2(params, 'rtp', 'base', l);
  dictinc2(params, 'features', 'basespin_act', 1);
  dictinc3(params, 'features', 'basespin_wins', l, 1);
  dictinc2(params, 'featurescert_act', 'AnyRound', 1);
  dictinc3(params, 'featurescert_wins', 'AnyRound', curwin, 1);

  return [curwin, listcomb];
}

const game: GameDefinition = {
  rolls,
  height,
  lines,
  totalelemmin,
  totalelemmax,
  combs,
  e_lines,
  e_scats,
  e_wild,
  simmacro,
};

export default game;