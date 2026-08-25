/**
 * Aztec Train — in-house math REFERENCE model (`simmacro`).
 *
 * Unlike our other titles, Aztec Train had NO external mathematician's prototype: the base
 * data was reverse-engineered from the live Greentube NRGS demo and the feature economy was
 * calibrated to ~189k harvested real rounds. This file is the in-house SPEC that plays that
 * role here — a self-contained, `Math.random()`-only transliteration of the calibrated math
 * (base lines + Add Wild + Lock & Spin + trucks/convoys + Free Games + 4-tier jackpots),
 * structured exactly like the `python-math` reference models in `foundry-candy-store-math`
 * and `foundry-bounty-hunter-math` so all three games read the same way.
 *
 * The shipped `src/rules.ts` is a faithful port of THIS model onto the `@elhra/foundry`
 * primitives. Both consume the RNG stream in the identical order (a reel stop = one
 * `Math.random()` = `random(len)`; a weighted pick = one `Math.random()` walked over integer
 * weights = `weightedIndex`), so `sim/verify.ts equiv` proves them round-for-round identical
 * on one seeded PRNG. `Math.random()` here is seeded by the caller (verify.ts) or left
 * unseeded (ref_stats.ts statistical baseline).
 *
 * Everything is in coins; total bet = LINES coins. `simmacro` returns `[winInCoins, listcomb]`
 * and accumulates the dictinc breakdown into `params` (see the leaf list at the bottom).
 */

// ---------------------------------------------------------------------------
// Self-contained: everything this file needs from the shared src/ framework,
// copied in verbatim (not imported) so this game has zero relative-path
// dependency on anything outside this single file.
// ---------------------------------------------------------------------------

type StatsParams = Record<string, unknown>;
type CombKind = "line" | "scat" | "wild" | "";
type CombRow = [CombKind, ...number[]] | [CombKind, ...Array<number | string>];

interface GameDefinition {
  rolls: number;
  height: number;
  lines: number;
  totalelemmin: number;
  totalelemmax: number;
  tablesize?: number;
  combs: CombRow[];
  e_lines: number[];
  e_scats: number[];
  e_wild: number[];
  simmacro(listcomb: number[][], params: StatsParams): [number, number[][]];
}

// verbatim copy of src/game-helpers.ts
function dictinc(d: StatsParams | Record<number, number>, k: string | number, v: number): void {
  const bag = d as Record<string, number>;
  bag[String(k)] = (bag[String(k)] ?? 0) + v;
}
function dictinc2(d: StatsParams, k: string, k2: string, v: number): void {
  const inner = (d[k] as Record<string, number> | undefined) ?? {};
  inner[k2] = (inner[k2] ?? 0) + v;
  d[k] = inner;
}
function dictinc3(d: StatsParams, k: string, k2: string, k3: string | number, v: number): void {
  const l1 = (d[k] as Record<string, Record<string, number>> | undefined) ?? {};
  const l2 = l1[k2] ?? {};
  const key = String(k3);
  l2[key] = (l2[key] ?? 0) + v;
  l1[k2] = l2;
  d[k] = l1;
}
function weightchoice(weights: number[]): number {
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    if (w > 0) total += w;
  }
  const r = Math.random() * total;
  let s = 0;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    if (w > 0) s += w;
    if (s > r) return i;
  }
  return weights.length - 1;
}

// verbatim copy of src/sim-guard.ts, minus the setStrictUndefined/isStrictUndefined
// toggle plumbing (this game reads the env var once at load, same as the shared
// module's default state - it just can't be flipped at runtime via --no-strict,
// since that call target lives in the shared module this file no longer imports).
const strictUndefined =
  process.env.BONANZ_STRICT_UNDEFINED !== "0" && process.env.BONANZ_STRICT_UNDEFINED !== "false";
function assertSim<T>(value: T, label: string): T {
  if (!strictUndefined) return value;
  if (value === undefined) {
    throw new Error(`STRICT_SIM: undefined at ${label}`);
  }
  if (typeof value === "number" && Number.isNaN(value)) {
    throw new Error(`STRICT_SIM: NaN at ${label}`);
  }
  return value;
}
function assertSimNumber(value: number, label: string): number {
  assertSim(value, label);
  if (typeof value !== "number") {
    throw new Error(`STRICT_SIM: expected number at ${label}, got ${typeof value}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Static data (frozen copy of src/config.ts — the reference is self-contained by design).
// ---------------------------------------------------------------------------

const rolls = 5;
const height = 3;
const lines = 20;
const MAX_WIN_X = 10000;

const WILD = 1;
const BONUS = 13;
const isWild = (s: number) => s === WILD;
/** COIN — pays no line; its only job is to feed a Lock & Spin. */
const COIN_ID = 12;
const isScatter = (s: number) => s === COIN_ID || s === 13;

/**
 * v4 REVISION — the real Greentube Aztec Train paytable, taken from the in-game paytable
 * screens. Figures are coins per line: total bet 20 across 20 paylines is 1 per line, so the
 * EUR values transcribe directly (EUR 1.00 -> 1 coin). Symbols are assigned highest-paying
 * first, keeping the existing PIC4..PIC1 / A K Q J 10 9 slot order.
 *
 *   2  money bundle   1 / 5 / 16 / 25   (the only 2-of-a-kind pay)
 *   3  truck              4 / 10 / 20
 *   4  burger             4 /  8 / 20
 *   5  toolbox            4 /  5 / 16
 *   6..11  A K Q J 10 9   2 /  4 /  6
 *
 * No wild or scatter pay is listed, matching the model: WILD's row stays all zeros.
 */
const PAYS_LOW: Record<number, number[]> = {
  1: [0, 0, 0, 0, 0, 0],
  2: [0, 0, 1, 5, 16, 25],
  3: [0, 0, 0, 4, 10, 20],
  4: [0, 0, 0, 4, 8, 20],
  5: [0, 0, 0, 4, 5, 16],
  6: [0, 0, 0, 2, 4, 6],
  7: [0, 0, 0, 2, 4, 6],
  8: [0, 0, 0, 2, 4, 6],
  9: [0, 0, 0, 2, 4, 6],
  10: [0, 0, 0, 2, 4, 6],
  11: [0, 0, 0, 2, 4, 6],
  12: [0, 0, 0, 0, 0, 0],
  13: [0, 0, 0, 0, 0, 0],
};
/**
 * v3 CHANGE 1 — single paytable.
 *
 * PAYS_HIGH is now an alias of PAYS_LOW, so the round plays the same table whichever way the
 * `probconfig` draw lands. The draw itself is deliberately KEPT (see `simmacro`) so the RNG
 * stream stays byte-aligned with the original model and the two can still be compared
 * spin-for-spin on a shared seed.
 *
 * Knock-on: `combs` at the bottom of this file is built from PAYS_HIGH, so log.txt's symbol
 * table now displays the LOW numbers — i.e. the table actually in play.
 */
const PAYS_HIGH: Record<number, number[]> = PAYS_LOW;

const PAYLINES: number[][] = [
  [0, 0, 0, 0, 0],   // line 1
  [1, 1, 1, 1, 1],   // line 2
  [2, 2, 2, 2, 2],   // line 3
  [0, 0, 1, 0, 0],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [2, 2, 1, 2, 2],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [2, 1, 2, 1, 2],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 2, 2, 2, 1],
  [0, 2, 2, 2, 0],
  [2, 0, 0, 0, 2],
  [0, 1, 2, 1, 0],
];

const STRIP_SET0_BASE: number[][] = [
  [
    3, 3, 3, 2, 2, 2, 2, 11, 12, 12, 12, 5, 5, 10, 3, 3, 3, 9,
    12, 8, 9, 2, 2, 2, 12, 4, 4, 4, 6, 3, 3, 3, 3, 9, 12, 12,
    5, 5, 10, 3, 3, 2, 2, 2, 11, 12, 12, 12, 9, 2, 2, 7, 4, 4,
    4, 6, 3, 3,
  ],
  [
    1, 3, 3, 3, 6, 6, 2, 7, 12, 1, 2, 8, 4, 4, 4, 5, 11, 3,
    3, 2, 2, 2, 2, 12, 12, 9, 5, 1, 10, 3, 3, 3, 6, 6, 2, 1,
    12, 11, 2, 8, 4, 4, 4, 5, 11, 3, 3, 3, 3, 2, 2, 9, 12, 9,
    5, 8,
  ],
  [
    1, 3, 3, 11, 4, 4, 4, 4, 6, 2, 2, 2, 2, 10, 1, 5, 5, 12,
    8, 3, 3, 12, 7, 2, 7, 1, 2, 2, 2, 3, 3, 3, 3, 12, 7, 2,
    7, 9, 2, 2, 3, 3, 1, 4, 4, 4, 4, 6, 2, 2, 2, 10, 10, 5,
    5, 12,
  ],
  [
    1, 2, 2, 8, 2, 2, 2, 8, 12, 10, 3, 1, 4, 4, 4, 4, 12, 4,
    4, 4, 9, 5, 9, 3, 3, 3, 3, 4, 4, 4, 7, 1, 2, 2, 2, 8,
    2, 2, 8, 12, 10, 3, 1, 4, 4, 9, 5, 9, 3, 3, 4, 4, 12, 4,
    4, 7, 11, 2,
  ],
  [
    12, 4, 4, 1, 5, 5, 9, 3, 3, 3, 11, 6, 2, 2, 2, 1, 8, 12,
    4, 4, 8, 8, 1, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4, 10,
    5, 5, 9, 3, 3, 2, 2, 4, 4, 4, 4, 12, 12, 7, 3, 3, 3, 1,
    6, 2, 2, 2, 8, 8,
  ],
];

/** Calibrated Lock & Spin / Free Games / jackpot parameters (x-bet units). */
/**
 * v4 CHANGE 8 — two complete math variants.
 *
 * `probconfig` picks one per round and EVERYTHING in the feature economy then comes from that
 * variant: coin ladder weights, drop weights and probability, respin/unlock rates, truck and
 * convoy weights. The paytable and the bet are deliberately NOT threaded — both variants share
 * one paytable (PAYS_LOW) and one 20-coin bet, exactly as specified.
 *
 * The mechanism already existed (`probconfig` + the 'low' | 'high' string) but only reached the
 * payline evaluator. v4 threads it through `mathFor()` into every RNG-consuming feature call.
 */
const M_LOW = {
  // --- v4 CHANGE 3/6: coin drop + board-read trigger -----------------------------------
  // Every spin rolls `pCoinDrop`; on a hit a weighted pick among `coinDropCounts` decides how
  // many coins land, and Lock & Win triggers when the TOTAL coins on screen reach
  // `triggerCoins`. There are no scatters on the reelset any more, so there is no free-games
  // mode and no second trigger rate: this is the game's only feature entry.
  pCoinDrop: 0.007440,
  coinDropCounts: [3, 4, 5, 6],
  coinDropWeights: [25, 25, 25, 25],
  // ------------------------------------------------------------------------------------
  lockCellsBase: 15,
  lockCellsFull: 30,
  respinsMax: 3,
  respinRefill: 0.061,
  /** v4 CHANGE 10: raised so ~1 in 3 features opens all six rows. ACTIVE-field GO only. */
  pGo: 0.1173,
  /** Chance per respin a GO lands under a shutter and sleeps there — its own dial; feeds the chain. */
  pGoDormant: 0.03,
  pAztecTrain: 0.001,
  pDormant: 0.06,
  /** Chance the HAULIN' GOLD tile lands under a shutter and sleeps there — its own dial (see port). */
  pTruckDormant: 0.06,
  /** Coins on screen needed to trigger Lock & Win (read off the board, never assumed). */
  triggerCoins: 6,
  // --- v4 CHANGE 7: coin ladder ---------------------------------------------------------
  // Exactly the eight values requested (note: no 5). Multiplied by `lines` at payout, so a
  // coin of value v pays v x total bet, unchanged from every earlier version.
  coinValues: [1, 2, 3, 4, 6, 7, 8, 9],
  coinWeights: [292, 193, 122, 74, 41, 26, 14, 9],
  // --- v4 CHANGE 4: green truck removed -------------------------------------------------
  // pTruckGreen is zeroed rather than deleted, so the green convoy code stays in place but is
  // unreachable (weightchoice skips zero weights). Nothing was redistributed: the chance of
  // ANY truck landing therefore falls from 0.23 to 0.20.
  pTruckRed: 0.1,
  pTruckPurple: 0.05,
  pTruckBlue: 0.05,
  pTruckGreen: 0,
  // --- v4: truck + gold values rescaled into the new 1..9 ladder range ------------------
  truckMultValues: [1, 2, 3, 5, 9],
  truckMultWeights: [64, 20, 10, 4, 2],
  purpleBoostCoinsMax: 2,
  greenCashCoins: [3, 4, 5, 6],
  greenCashCountW: [40, 30, 20, 10],
  greenCashValues: [1, 2, 3, 4, 5],
  greenCashWeights: [60, 25, 10, 4, 1],
  goldCashValues: [2, 3, 4, 6, 8, 15, 20, 25],
  goldCashWeights: [30, 26, 20, 12, 8, 3, 1.2, 0.4],
  goldCoins: [5, 7, 9, 11, 13],
  goldCoinsW: [30, 28, 22, 14, 6],
  /** Jackpots unchanged, per spec. */
  jackpotValues: [5, 10, 50, 1000],
  // MINI is now 1 in 3 gold coins. drawGoldCoin walks these CUMULATIVELY, so raising the
  // first entry leaves MINOR/MAJOR/GRAND at their unchanged absolute probabilities
  // (0.02 / 0.004 / 0.0004); only the cash fall-through shrinks, 91.56% -> 64.23%.
  goldJackW: [1 / 3, 0.02, 0.004, 0.0004],
};

const M_HIGH = {
  // --- v4 CHANGE 3/6: coin drop + board-read trigger -----------------------------------
  // Every spin rolls `pCoinDrop`; on a hit a weighted pick among `coinDropCounts` decides how
  // many coins land, and Lock & Win triggers when the TOTAL coins on screen reach
  // `triggerCoins`. There are no scatters on the reelset any more, so there is no free-games
  // mode and no second trigger rate: this is the game's only feature entry.
  pCoinDrop: 0.007440,
  coinDropCounts: [3, 4, 5, 6],
  coinDropWeights: [25, 25, 25, 25],
  // ------------------------------------------------------------------------------------
  lockCellsBase: 15,
  lockCellsFull: 30,
  respinsMax: 3,
  respinRefill: 0.061,
  /** v4 CHANGE 10: raised so ~1 in 3 features opens all six rows. ACTIVE-field GO only. */
  pGo: 0.1173,
  /** Chance per respin a GO lands under a shutter and sleeps there — its own dial; feeds the chain. */
  pGoDormant: 0.03,
  pAztecTrain: 0.001,
  pDormant: 0.06,
  /** Chance the HAULIN' GOLD tile lands under a shutter and sleeps there — its own dial (see port). */
  pTruckDormant: 0.06,
  /** Coins on screen needed to trigger Lock & Win (read off the board, never assumed). */
  triggerCoins: 6,
  // --- v4 CHANGE 7: coin ladder ---------------------------------------------------------
  // Exactly the eight values requested (note: no 5). Multiplied by `lines` at payout, so a
  // coin of value v pays v x total bet, unchanged from every earlier version.
  coinValues: [1, 2, 3, 4, 6, 7, 8, 9],
  coinWeights: [257, 229, 182, 146, 113, 85, 66, 53],
  // --- v4 CHANGE 4: green truck removed -------------------------------------------------
  // pTruckGreen is zeroed rather than deleted, so the green convoy code stays in place but is
  // unreachable (weightchoice skips zero weights). Nothing was redistributed: the chance of
  // ANY truck landing therefore falls from 0.23 to 0.20.
  pTruckRed: 0.1,
  pTruckPurple: 0.05,
  pTruckBlue: 0.05,
  pTruckGreen: 0,
  // --- v4: truck + gold values rescaled into the new 1..9 ladder range ------------------
  truckMultValues: [1, 2, 3, 5, 9],
  truckMultWeights: [64, 20, 10, 4, 2],
  purpleBoostCoinsMax: 2,
  greenCashCoins: [3, 4, 5, 6],
  greenCashCountW: [40, 30, 20, 10],
  greenCashValues: [1, 2, 3, 4, 5],
  greenCashWeights: [60, 25, 10, 4, 1],
  goldCashValues: [2, 3, 4, 6, 8, 15, 20, 25],
  goldCashWeights: [30, 26, 20, 12, 8, 3, 1.2, 0.4],
  goldCoins: [5, 7, 9, 11, 13],
  goldCoinsW: [30, 28, 22, 14, 6],
  /** Jackpots unchanged, per spec. */
  jackpotValues: [5, 10, 50, 1000],
  // MINI is now 1 in 3 gold coins. drawGoldCoin walks these CUMULATIVELY, so raising the
  // first entry leaves MINOR/MAJOR/GRAND at their unchanged absolute probabilities
  // (0.02 / 0.004 / 0.0004); only the cash fall-through shrinks, 91.56% -> 64.23%.
  goldJackW: [1 / 3, 0.02, 0.004, 0.0004],
};

type MathConfig = typeof M_LOW;
const mathFor = (config: "low" | "high"): MathConfig => (config === "low" ? M_LOW : M_HIGH);

/** Add Wild. Threaded like the rest. Raised from 0.03 to 0.0347 and paired with 4 natural
 *  WILDs per strip on reels 2-5, which is what brings base RTP back to 40% on the real paytable. */
const PRESENTATION_LOW = { pAddWild: 0.0347, addWildMin: 4, addWildMax: 7 };
const PRESENTATION_HIGH = { pAddWild: 0.0347, addWildMin: 4, addWildMax: 7 };
type PresConfig = typeof PRESENTATION_LOW;
const presentationFor = (config: "low" | "high"): PresConfig =>
  config === "low" ? PRESENTATION_LOW : PRESENTATION_HIGH;

const JACKPOTS = { MINI: 5, MINOR: 10, MAJOR: 50, GRAND: 1000 };
const JACKPOT_TIERS = ["MINI", "MINOR", "MAJOR", "GRAND"] as const;
type JackpotTier = (typeof JACKPOT_TIERS)[number];

/**
 * The 94-tier blend probability (= MODES.main.probconfig / PROBCONFIG in src/config.ts).
 * MUST equal RTP_TIERS["94"] over there — `sim/verify.ts equiv` diverges the moment they differ,
 * which is exactly what caught the last re-calibration. Re-measure with `npm run calibrate`.
 */
const probconfig = 0.636122;

const GRID_CELLS = rolls * height;

// ---------------------------------------------------------------------------
// RNG-consuming primitives — the `Math.random()` twins of the `@elhra/foundry` calls the
// port uses. Draw order/transforms match byte-for-byte (see the file header).
// ---------------------------------------------------------------------------

const rf = () => Math.random();

/** Twin of foundry `generateReels`: one `random(strip.length)` per reel, cyclic window. */
function generateReels(strips: number[][]): number[][] {
  const reels: number[][] = [];
  for (let reel = 0; reel < strips.length; reel++) {
    const strip = strips[reel];
    const stop = Math.floor(rf() * strip.length);
    const col: number[] = [];
    for (let row = 0; row < height; row++) {
      col.push(strip[(stop + row) % strip.length]);
    }
    reels.push(col);
  }
  return reels;
}

function countSymbol(reels: number[][], symbol: number): number {
  let n = 0;
  for (const reel of reels) {
    for (const cell of reel) {
      if (cell === symbol) {
        n++;
      }
    }
  }
  return n;
}

interface LineWin {
  paylineIndex: number;
  symbol: number;
  length: number;
  coins: number;
}
const NO_WIN = { coins: 0, symbol: 0, length: 0 };
const payOf = (pays: Record<number, number[]>, symbol: number, length: number) =>
  (pays[symbol] && pays[symbol][length]) || 0;

/** Twin of foundry `evaluatePaylines` (left-aligned; best of plain-run vs pure-wild-prefix). */
function evaluatePaylines(
  reels: number[][],
  pays: Record<number, number[]>,
): { coins: number; lineWins: LineWin[] } {
  let total = 0;
  const lineWins: LineWin[] = [];
  for (let i = 0; i < PAYLINES.length; i++) {
    const payline = PAYLINES[i];
    const line: number[] = [];
    for (let reel = 0; reel < payline.length; reel++) {
      line.push(reels[reel][payline[reel]]);
    }
    // calcLeft: leftmost run of (wild | first non-wild symbol).
    let main = -1;
    for (let k = 0; k < line.length; k++) {
      if (!isWild(line[k])) {
        main = line[k];
        break;
      }
    }
    let best = NO_WIN;
    if (main !== -1 && !isScatter(main)) {
      let length = 0;
      for (let k = 0; k < line.length; k++) {
        if (isWild(line[k]) || line[k] === main) {
          length++;
        } else {
          break;
        }
      }
      best = { coins: payOf(pays, main, length), symbol: main, length };
    }
    // calcLeftWild: a pure-wild prefix paid as the wild symbol.
    let wl = 0;
    for (let k = 0; k < line.length; k++) {
      if (isWild(line[k])) {
        wl++;
      } else {
        break;
      }
    }
    if (wl > 0) {
      const wildWin = { coins: payOf(pays, line[0], wl), symbol: line[0], length: wl };
      if (wildWin.coins > best.coins) {
        best = wildWin;
      }
    }
    total += best.coins;
    if (best.coins > 0) {
      lineWins.push({
        paylineIndex: i,
        symbol: best.symbol,
        length: best.length,
        coins: best.coins,
      });
    }
  }
  return { coins: total, lineWins };
}

const drawCoin = (m: MathConfig) => m.coinValues[weightchoice(m.coinWeights)];

/**
 * Snap an x-bet coin value back onto the 0.01 grid — the twin of the port's `xbet`.
 *
 * Every value added up here is a multiple of 0.1 (the coin ladder) or 0.5 (the truck increments), so
 * the sums are exact in decimal and inexact only in binary (0.6+0.3+0.9+0.9+0.2+0.5 →
 * 3.4000000000000004). These are the numbers printed on a coin and they reach the client verbatim,
 * so both sides snap them identically — a divergence here would fail the equivalence gate.
 */
const xbet = (v: number) => Math.round(v * 100) / 100;
const drawTruckMult = (m: MathConfig) => m.truckMultValues[weightchoice(m.truckMultWeights)];
const drawGreenCash = (m: MathConfig) => m.greenCashValues[weightchoice(m.greenCashWeights)];
function drawGoldCoin(m: MathConfig): { value: number; jackpot: JackpotTier | null } {
  const r = rf();
  let acc = 0;
  for (let t = 0; t < JACKPOT_TIERS.length; t++) {
    acc += m.goldJackW[t];
    if (r < acc) {
      return { value: m.jackpotValues[t], jackpot: JACKPOT_TIERS[t] };
    }
  }
  return {
    value: m.goldCashValues[weightchoice(m.goldCashWeights)],
    jackpot: null,
  };
}

// ---------------------------------------------------------------------------
// Lock & Spin (see src/rules.ts lockAndSpin — this is the same algorithm, draw-for-draw).
// ---------------------------------------------------------------------------

type TruckColor = "blue" | "purple" | "green" | "red";

interface CoinCollect {
  coinsX: number[];
  coins: number;
  jackpots: JackpotTier[];
  goldConvoy: boolean;
  finalCoinCount: number;
  /** Respin steps in the Lock & Spin (seed + each respin). */
  respinCount: number;
  /** Row-Unlock (GO) symbols that landed across the feature. */
  goCount: number;
  /** Colors of the trucks that landed (in land order). */
  truckColors: TruckColor[];
  /** Trucks that landed asleep under a shutter, and those of them that never woke (sim only). */
  truckDormant: number;
  truckForfeit: number;
  /** Which convoy fired, if any (gold wins the slot when both fire). */
  greenConvoy: boolean;
  /** Value (x-bet) of the summed seed coin. */
  seedValue: number;
  /** Every normal-ladder Coin drawn (seed trigger coins + refills), for the value histogram. */
  coinDrawsX: number[];
  // --- v3 reporting: symbol census -----------------------------------------------------
  // Rows the feature finished on. Starts at 3 and only ever increments (capped at 6), so this
  // is simultaneously the final AND the maximum — nothing in lockAndSpin ever closes a row.
  finalRows: number;
  /** RED truck's sum-coin: 1 when red landed, else 0. */
  redCoins: number;
  /** GREEN convoy cash coins (x-bet ladder `greenCashValues`). */
  greenCashCoins: number;
  /** GOLD convoy coins that paid cash rather than a jackpot. */
  goldCashCoins: number;
  /** GOLD convoy coins that paid a jackpot tier. */
  goldJackpotCoins: number;
  /** GREEN convoy's guaranteed MINI: 1 when green landed, else 0. */
  greenMiniCoins: number;
  /** Every prize the GOLD convoy awarded — jackpot coins AND cash coins together. */
  goldPrizeCoins: number;
  /** Coins paid by those gold prizes alone, excluding the ladder coins already on the board. */
  goldPrizeWin: number;
}

/** A COIN standing on the base board: where it is, and what it is worth. */
export interface BoardCoin {
  cell: number;
  value: number;
}

/**
 * Give every COIN the reels landed a value.
 *
 * The live game prints one on every coin, triggering or not (see the main-game capture: 0.80 /
 * 0.60 / 0.40 sitting on a board with no bonus). COIN pays no line — its only job is to feed a
 * Lock & Spin — but it is never valueless on screen, so the value is drawn HERE, on the spin that
 * landed it, not invented later if a bonus happens to fire.
 */
function valueBoardCoins(reels: number[][], m: MathConfig): BoardCoin[] {
  const coins: BoardCoin[] = [];
  for (let row = 0; row < height; row++) {
    for (let reel = 0; reel < rolls; reel++) {
      if (reels[reel][row] === COIN_ID) {
        coins.push({ cell: row * rolls + reel, value: drawCoin(m) });
      }
    }
  }
  return coins;
}

/**
 * v3 CHANGE 4 — placement guards.
 *
 * Neither an added Wild nor a dropped Coin may land on a cell that already holds a COIN, a WILD
 * or the BONUS scatter. The only symbols either can overwrite are the paying symbols 2..11.
 *
 * Cell numbering is row-major, matching `valueBoardCoins`: cell = row * rolls + reel, so
 * reel = cell % rolls and row = floor(cell / rolls).
 */
function symbolAt(reels: number[][], cell: number): number {
  return reels[cell % rolls][Math.floor(cell / rolls)];
}
function isProtectedCell(reels: number[][], cell: number): boolean {
  const s = symbolAt(reels, cell);
  // v4 CHANGE 6: a dropped Coin or an added Wild may never overwrite a Coin or a Wild. BONUS is
  // no longer part of the reelset (CHANGE 3) so it cannot occur, but it stays in the guard as a
  // cheap invariant — if a 13 ever reappeared, neither placement would silently destroy it.
  return s === COIN_ID || s === WILD || s === BONUS;
}

/**
 * Shuffle `pool` in place just far enough to expose `count` random entries at the front.
 * Same partial Fisher-Yates the original Add Wild used, factored out so the Wild placement and
 * the new Coin drop consume RNG identically.
 */
function takeRandomCells(pool: number[], count: number): number[] {
  const n = Math.min(count, pool.length); // v3: place as many as fit
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rf() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).sort((a, b) => a - b);
}

/**
 * v3 CHANGE 3 — the coin drop.
 *
 * Replaces `addTriggerCoins`. That function only ran AFTER a `pLock` roll had already decided the
 * feature was happening, and existed purely to make the screen agree with the banner. This one is
 * causal instead: it runs on every spin, on its own probability, BEFORE anything is evaluated, and
 * what it leaves on the board is what the trigger later counts.
 *
 * Returns how many coins were actually placed.
 */
function dropCoins(reels: number[][], m: MathConfig): number {
  if (rf() >= m.pCoinDrop) {
    return 0;
  }
  const want = m.coinDropCounts[weightchoice(m.coinDropWeights)];
  const pool: number[] = [];
  for (let cell = 0; cell < GRID_CELLS; cell++) {
    // v3: any reel is fair game for a coin (the no-reel-1 rule is Wild-only), but never on
    // top of an existing COIN / WILD / BONUS.
    if (!isProtectedCell(reels, cell)) {
      pool.push(cell);
    }
  }
  const placed = takeRandomCells(pool, want);
  for (const cell of placed) {
    reels[cell % rolls][Math.floor(cell / rolls)] = COIN_ID;
  }
  return placed.length;
}

/**
 * @param sweptCoins every coin standing on the base board when the sweep starts — the ones the
 *   reels landed plus the trigger rain. Their values were already drawn and shown to the player.
 */
function lockAndSpin(sweptCoins: BoardCoin[], m: MathConfig): CoinCollect {
  const inc = () => drawTruckMult(m);
  const truckColors: TruckColor[] = [];
  // Sim instrumentation only (pairs with the port's truckdormant_act / truckforfeit_act): how many
  // HAULIN' GOLD tiles landed asleep under a shutter, and how many of those never woke.
  let truckDormant = 0;
  let truckForfeit = 0;
  let goCount = 0;

  let cells = m.lockCellsBase;
  let respinsLeft = m.respinsMax;

  // Every swept coin came off the same `drawCoin()` ladder the seed always used, so the sum's
  // distribution is what it always was — what changed is that the player watched them land first.
  const triggerCoins: number[] = sweptCoins.map((c) => c.value);
  const coinDrawsX: number[] = [...triggerCoins];
  const seedValue = xbet(triggerCoins.reduce((a, b) => a + b, 0));
  const startCell = Math.floor(rf() * cells);

  interface BoardCoin {
    cell: number;
    value: number;
    dormant: boolean;
    bornStep: number; // respin index it landed on (0 = seed); truck at landIdx sees bornStep <= landIdx
  }
  const board: BoardCoin[] = [
    { cell: startCell, value: seedValue, dormant: false, bornStep: 0 },
  ];
  const occupied = new Set<number>([startCell]);
  const rowOf = (cell: number) => Math.floor(cell / 5);

  const pickFree = (): number => {
    const pool: number[] = [];
    for (let c = 0; c < m.lockCellsFull; c++) {
      if (!occupied.has(c)) {
        pool.push(c);
      }
    }
    if (pool.length === 0) {
      return -1;
    }
    const cell = pool[Math.floor(rf() * pool.length)];
    occupied.add(cell);
    return cell;
  };

  let unlockedRows = 3;
  let garageOpen = false;
  let steps = 0;
  // rows unlocked AT each respin index (0 = seed); a truck effect at step s may only touch a coin whose
  // row is open at s — CAUSAL: each micro-round acts on the board as it stands THEN, never the future.
  const rowsAtStep: number[] = [3];
  const goCellsAll = new Set<number>(); // cells a GO used — trucks must avoid them (see port)
  // GO tiles that landed under a still-closed shutter: they HOLD their cell (so nothing else can
  // land there) and fire only when their row opens — see fireUnlock's chain below.
  const dormantGo = new Set<number>();
  for (;;) {
    if (respinsLeft <= 0) {
      break;
    }
    let added = 0;
    const activeCells = unlockedRows * 5;
    for (let c = 0; c < activeCells; c++) {
      if (occupied.has(c)) {
        continue;
      }
      if (rf() < m.respinRefill) {
        const value = drawCoin(m);
        coinDrawsX.push(value);
        occupied.add(c);
        board.push({ cell: c, value, dormant: false, bornStep: steps + 1 });
        added++;
      }
    }
    if (unlockedRows < 6 && rf() < m.pDormant) {
      const shutteredFree: number[] = [];
      for (let c = activeCells; c < m.lockCellsFull; c++) {
        if (!occupied.has(c)) {
          shutteredFree.push(c);
        }
      }
      if (shutteredFree.length) {
        const c = shutteredFree[Math.floor(rf() * shutteredFree.length)];
        const value = drawCoin(m);
        coinDrawsX.push(value);
        occupied.add(c);
        board.push({ cell: c, value, dormant: true, bornStep: steps + 1 });
      }
    }
    let go = 0;
    // In-bonus Aztec Train: guaranteed Row Unlock (see src/rules.ts). Drawn BEFORE pGo and
    // short-circuits it — must consume RNG in the same order as the port.
    const canUnlock = unlockedRows < 6 || !garageOpen;
    const rr = canUnlock && rf() < m.pAztecTrain;

    /**
     * Fire ONE Row Unlock: lift the bottom-most shutter (or open the garage once all six rows are
     * up), wake the coins the newly-opened row was holding, and CHAIN — a GO that had been sitting
     * dormant in that row now fires in turn, which can open the next row, and so on. This mirrors
     * the vendor client, whose unlock pass re-scans the board after every row it opens
     * (`isExtraRow` → unlock active non-coins → re-run the scan), so one respin can raise several
     * shutters at once. Consumes NO RNG: the chain is fully determined by where the dormant GOs
     * already are, which keeps the draw order identical for the port.
     */
    const fireUnlock = (): void => {
      if (unlockedRows >= 6) {
        garageOpen = true;
        return;
      }
      const opening = unlockedRows;
      unlockedRows++;
      for (const bc of board) {
        if (bc.dormant && rowOf(bc.cell) === opening) {
          bc.dormant = false;
        }
      }
      // A dormant GO in the row that just opened fires now and frees its cell (a GO tile always
      // disappears once its shutter is up), so later coins may land there.
      for (const cell of [...dormantGo]) {
        if (rowOf(cell) !== opening) {
          continue;
        }
        dormantGo.delete(cell);
        occupied.delete(cell);
        goCellsAll.add(cell);
        go++;
        goCount++;
        if (unlockedRows < 6 || !garageOpen) {
          fireUnlock();
        }
      }
    };

    if (canUnlock && (rr || rf() < m.pGo)) {
      // An ACTIVE-field GO: lands in a free open cell and fires on the spot. A COMPLETELY FULL
      // active field means nothing happens — no tile, no shutter: every position is its own reel and
      // an occupied cell is locked out of the spin, so there is no open reel left to land on. That
      // is a DEAD END by design (nothing can reset the counter either), exactly as in the original.
      // Draws no RNG in that branch.
      const activeFree: number[] = [];
      for (let c = 0; c < unlockedRows * 5; c++) {
        if (!occupied.has(c)) {
          activeFree.push(c);
        }
      }
      if (activeFree.length) {
        goCellsAll.add(activeFree[Math.floor(rf() * activeFree.length)]);
        go++;
        goCount++;
        fireUnlock();
      }
    }
    // A SHUTTERED-field GO on its own dial (each board position runs its own reel strip in the
    // vendor original, so this rate is independent of the active-field one). Lands DORMANT: holds
    // its cell, fires only when its row opens — that is what feeds the chain. Rolled AFTER the
    // active GO so the port consumes RNG in the same order.
    if (unlockedRows < 6 && rf() < m.pGoDormant) {
      const shutteredFree: number[] = [];
      for (let c = unlockedRows * 5; c < m.lockCellsFull; c++) {
        if (!occupied.has(c)) {
          shutteredFree.push(c);
        }
      }
      if (shutteredFree.length) {
        const gc = shutteredFree[Math.floor(rf() * shutteredFree.length)];
        occupied.add(gc);
        dormantGo.add(gc);
      }
    }
    rowsAtStep.push(unlockedRows); // rows open at this respin (index = coins' bornStep)
    const newSymbol = added > 0 || go > 0;
    if (newSymbol) {
      respinsLeft = m.respinsMax;
    } else {
      respinsLeft--;
    }
    steps++;
    // NB: the garage opening does NOT end the feature — respins continue over the full 30-cell
    // board until 3 dry respins ("GOLD CONVOY BONUS — STARTS AFTER FEATURE"); no further GO can
    // land (canUnlock is false once the garage is open), so no extra unlock RNG is drawn.
  }
  const goldConvoy = garageOpen;
  cells = unlockedRows * 5;

  const jackpotX: number[] = [];
  const jackpots: JackpotTier[] = [];

  const pickFreeActive = (rows: number = unlockedRows): number => {
    const active = rows * 5;
    const pool: number[] = [];
    for (let c = 0; c < active; c++) {
      if (!occupied.has(c) && !goCellsAll.has(c)) {
        pool.push(c);
      }
    }
    if (pool.length === 0) {
      return -1;
    }
    const cell = pool[Math.floor(rf() * pool.length)];
    occupied.add(cell);
    return cell;
  };
  /** A free cell under a still-closed shutter — where a dormant HAULIN' GOLD sleeps (see port). */
  const pickFreeShuttered = (rows: number): number => {
    const pool: number[] = [];
    for (let c = rows * 5; c < m.lockCellsFull; c++) {
      if (!occupied.has(c) && !goCellsAll.has(c)) {
        pool.push(c);
      }
    }
    if (pool.length === 0) {
      return -1;
    }
    const cell = pool[Math.floor(rf() * pool.length)];
    occupied.add(cell);
    return cell;
  };
  /**
   * Mirrors the port's `landTruck`: the shuttered rows spin too, so with `pTruckDormant` the
   * HAULIN' GOLD tile lands asleep under a closed shutter and applies NOTHING until its row opens
   * — and nothing at all if it never does. Returns the respin its effect fires on (-1 = never).
   */
  const landTruck = (land: number): number => {
    const rows = rowsAtStep[land];
    let cell = -1;
    let locked = false;
    if (rows < 6 && rf() < m.pTruckDormant) {
      cell = pickFreeShuttered(rows);
      locked = cell >= 0; // no free shuttered cell → it lands in the open field instead
    }
    if (!locked) {
      pickFreeActive(rows);
      return land;
    }
    truckDormant++;
    const row = rowOf(cell);
    for (let s = land; s <= steps; s++) {
      if (rowsAtStep[s] > row) {
        return s;
      }
    }
    truckForfeit++;
    return -1;
  };

  // BLUE truck — one-time additive on every active coin.
  // HAULIN' GOLD — one square symbol lands in a cell and BECOMES one of the four trucks.
  // Each colour keeps its exact per-Lock&Spin rate: P(c) = ΣpTruck × pTruck_c / ΣpTruck = pTruck_c.
  // A HAULIN' GOLD yields ONE truck, so a bonus can no longer show two (see src/rules.ts).
  const TRUCK_COLORS: TruckColor[] = ["red", "purple", "blue", "green"];
  const truckWeights = [m.pTruckRed, m.pTruckPurple, m.pTruckBlue, m.pTruckGreen];
  const pHaulinGold = truckWeights.reduce((a, b) => a + b, 0);
  const hgColor: TruckColor | null =
    rf() < pHaulinGold ? TRUCK_COLORS[weightchoice(truckWeights)] : null;

  if (hgColor === "blue") {
    const landIdx = Math.floor(rf() * (steps + 1)); // random respin (see src/rules.ts)
    const fires = landTruck(landIdx); // landing respin, or the one that lifts its shutter
    truckColors.push("blue");
    if (fires >= 0) {
      const rows = rowsAtStep[fires];
      for (const c of board) {
        // CAUSAL: only coins ACTIVE when it morphs — present (born by then) AND their row open.
        if (c.bornStep > fires || rowOf(c.cell) >= rows) {
          continue;
        }
        c.value = xbet(c.value + inc());
      }
    }
  }

  // PURPLE truck — persistent additive on 1..purpleBoostCoinsMax coins each remaining respin.
  if (hgColor === "purple") {
    const land = Math.floor(rf() * Math.max(steps, 1));
    const landStep = Math.min(steps, land + 1);
    const fires = landTruck(landStep); // it boosts from the respin it MORPHS on, never before
    truckColors.push("purple");
    for (let si = fires; si >= 0 && si <= steps; si++) {
      const rows = rowsAtStep[si];
      const boosts = 1 + Math.floor(rf() * m.purpleBoostCoinsMax);
      // CAUSAL: pick from the coins ACTIVE right now (present at si AND unlocked) — never future coins.
      const present = board.filter((c) => c.bornStep <= si && rowOf(c.cell) < rows);
      for (let b = 0; b < boosts; b++) {
        if (present.length === 0) {
          break;
        }
        const c = present[Math.floor(rf() * present.length)];
        c.value = xbet(c.value + inc());
      }
    }
  }

  const normalX: number[] = board.filter((c) => !c.dormant).map((c) => c.value);

  // v3 reporting: census of the special (non-ladder) coins this feature produced.
  let greenCashCoinCount = 0;
  let greenMiniCoinCount = 0;
  let goldCashCoinCount = 0;
  let goldJackpotCoinCount = 0;
  let goldPrizeCoinCount = 0;
  let goldPrizeValueX = 0;
  let redCoinCount = 0;

  // GREEN Convoy — cash trucks (x0.1…x4) + one MINI jackpot.
  let greenFired = false;
  if (hgColor === "green") {
    const greenLand = Math.floor(rf() * (steps + 1)); // random respin for the step (value-independent)
    const fires = landTruck(greenLand); // asleep to the end → the convoy never drives at all
    truckColors.push("green");
    if (fires >= 0) {
      greenFired = true;
      const n = m.greenCashCoins[weightchoice(m.greenCashCountW)];
      for (let i = 0; i < n; i++) {
        const v = drawGreenCash(m);
        normalX.push(v);
        pickFree();
      }
      greenCashCoinCount = n;
      jackpotX.push(JACKPOTS.MINI);
      jackpots.push("MINI");
      greenMiniCoinCount = 1;
    }
  }

  // GOLD Convoy — gold trucks (x2…x25 cash OR any jackpot).
  if (goldConvoy) {
    const gc = m.goldCoins[weightchoice(m.goldCoinsW)];
    goldPrizeCoinCount = gc; // one prize per draw, cash or jackpot
    for (let i = 0; i < gc; i++) {
      const c = drawGoldCoin(m);
      goldPrizeValueX += c.value;
      if (c.jackpot) {
        jackpotX.push(c.value);
        jackpots.push(c.jackpot);
        goldJackpotCoinCount++;
      } else {
        normalX.push(c.value);
        goldCashCoinCount++;
      }
    }
  }

  // RED truck — BOOST: a new coin = Σ visible coins; originals stay → ≈2×.
  if (hgColor === "red") {
    const landIdx = Math.floor(rf() * (steps + 1)); // random respin
    const fires = landTruck(landIdx); // no sum-coin at all if it sleeps to the end
    truckColors.push("red");
    if (fires >= 0) {
      const rows = rowsAtStep[fires];
      // CAUSAL: sum the coins VISIBLE when it morphs — present AND their row open right then.
      const visibleSumX = xbet(
        board
          .filter((c) => c.bornStep <= fires && rowOf(c.cell) < rows)
          .reduce((a, c) => a + c.value, 0),
      );
      normalX.push(visibleSumX);
      redCoinCount = 1;
    }
  }

  const coinsX = [...normalX, ...jackpotX];
  const sumX = xbet(coinsX.reduce((a, b) => a + b, 0));

  return {
    coinsX,
    coins: Math.round(sumX * lines),
    jackpots,
    goldConvoy,
    finalCoinCount: coinsX.length,
    respinCount: steps + 1, // seed step + each respin
    goCount,
    truckColors,
    truckDormant,
    truckForfeit,
    greenConvoy: greenFired,
    seedValue,
    coinDrawsX,
    finalRows: unlockedRows,
    redCoins: redCoinCount,
    greenCashCoins: greenCashCoinCount,
    goldCashCoins: goldCashCoinCount,
    goldJackpotCoins: goldJackpotCoinCount,
    greenMiniCoins: greenMiniCoinCount,
    goldPrizeCoins: goldPrizeCoinCount,
    goldPrizeWin: Math.round(xbet(goldPrizeValueX) * lines),
  };
}

// ---------------------------------------------------------------------------
// One spin + the whole round.
// ---------------------------------------------------------------------------

interface SpinOut {
  lineCoins: number;
  lineWins: LineWin[];
  collect: CoinCollect | null;
  coins: number;
  bonusCount: number;
  addWildCount: number;
  /** v3: coins added by the drop this spin (0 when it didn't fire). */
  dropCount: number;
  /** v3: total coins standing on the board when the trigger was checked. */
  boardCoinCount: number;
}

/**
 * v3 CHANGE 3 — the spin now resolves in the order the player sees it.
 *
 *   1. spin the reels
 *   2. add Wilds
 *   3. add Coins
 *   4. evaluate paylines        <- sees the Wilds AND the Coins
 *   5. count BONUS              <- read after the modifiers, not before
 *   6. check Lock & Win         <- off the total coins actually on screen
 *
 * `inFG` no longer changes anything: the drop probability, the trigger threshold and the whole
 * sequence are identical in base and free games. It is kept on the signature so callers read the
 * same and so a free-games-specific tuning knob can be reintroduced without touching call sites.
 */
function oneSpin(inFG: boolean, config: "low" | "high"): SpinOut {
  void inFG;
  const m = mathFor(config);
  const pres = presentationFor(config);
  const reels = generateReels(STRIP_SET0_BASE);

  // --- 2. Add Wild ---------------------------------------------------------------------
  // Fires in base AND free spins alike (official rules: the modifier stays active during Free
  // Games). v3: still never on reel 1, and now never on top of a COIN / WILD / BONUS either.
  let addWildCount = 0;
  if (rf() < pres.pAddWild) {
    const candidates: number[] = [];
    for (let c = 0; c < GRID_CELLS; c++) {
      if (c % rolls !== 0 && !isProtectedCell(reels, c)) {
        candidates.push(c);
      }
    }
    const span = pres.addWildMax - pres.addWildMin + 1;
    const want = pres.addWildMin + Math.floor(rf() * span);
    const placed = takeRandomCells(candidates, want);
    for (const cell of placed) {
      reels[cell % rolls][Math.floor(cell / rolls)] = WILD;
    }
    addWildCount = placed.length;
  }

  // --- 3. Coin drop --------------------------------------------------------------------
  const dropCount = dropCoins(reels, m);

  // Every coin now standing on the board — reel-landed and dropped alike — gets its value here,
  // on the spin the player sees it, whether or not this round reaches a Lock & Win.
  const boardCoins = valueBoardCoins(reels, m);

  // --- 4. Paylines ---------------------------------------------------------------------
  // NB v3: a dropped coin overwrote a paying symbol, so unlike the original model the drop CAN
  // cost this spin a line win. That is the direct consequence of resolving the board first.
  const pays = config === "low" ? PAYS_LOW : PAYS_HIGH;
  const evald = evaluatePaylines(reels, pays);
  const lineCoins = evald.coins;

  // --- 5. Free games -------------------------------------------------------------------
  // Read after the modifiers. In practice unchanged from the original, because neither a Wild
  // nor a Coin is allowed to overwrite a BONUS symbol.
  const bonusCount = countSymbol(reels, BONUS);

  // --- 6. Lock & Win -------------------------------------------------------------------
  // Purely a board read: no hidden probability, no retroactive rain. Checked on every spin, so a
  // board that landed 6+ coins on its own triggers with no drop at all.
  let collect: CoinCollect | null = null;
  if (boardCoins.length >= m.triggerCoins) {
    collect = lockAndSpin(boardCoins, m);
  }
  const coins = lineCoins + (collect?.coins ?? 0);

  return {
    lineCoins,
    lineWins: evald.lineWins,
    collect,
    coins,
    bonusCount,
    addWildCount,
    dropCount,
    boardCoinCount: boardCoins.length,
  };
}

/** Tally line-win combinations into `listcomb[length][symbol]` (parity with the port). */
function recordCombos(
  params: StatsParams,
  listcomb: number[][],
  lineWins: LineWin[],
  phase: "base" | "free",
): void {
  for (const w of lineWins) {
    listcomb[w.length][w.symbol] += 1;
    dictinc2(params, `combs${phase}`, `${w.length}_${w.symbol}`, 1);
  }
}

/** Record a Lock & Spin collect's COUNT leaves (coin sums live in rtp.base/rtp.bonus). */
function recordCollect(
  params: StatsParams,
  collect: CoinCollect,
  actKey: "lockspin_act" | "lockspinfg_act",
): void {
  dictinc(params, actKey, 1);

  // --- v3 reporting additions ----------------------------------------------------------
  // (1) Combined occurrence counter. `lockspin_act` / `lockspinfg_act` keep their original
  //     names and meanings (base / free games); this is simply their sum, so the log carries
  //     the total without you having to add the two modes by hand.
  dictinc(params, "lockwin_total", 1);

  // (2) Active-rows distribution — one row per feature, filed under the row count it FINISHED
  //     on. Because `unlockedRows` only ever increments, that is also the maximum it reached.
  //     rows3 = never unlocked, rows6 = fully open. The four leaves sum to lockwin_total.
  dictinc(params, "lockwin_rows" + collect.finalRows, 1);

  // (3) Census of the special, non-ladder symbols. Each is an independent running total across
  //     every feature, NOT a per-feature histogram. The plain ladder-coin total is deliberately
  //     absent for now — its definition (does the seed count as 1 symbol or as the 6+ coins
  //     swept to build it? do never-woken dormant coins count?) is still open.
  dictinc(params, "lockwin_coins_red", collect.redCoins);
  dictinc(params, "lockwin_coins_green", collect.greenCashCoins);
  dictinc(params, "lockwin_coins_gold", collect.goldCashCoins);
  dictinc(params, "lockwin_coins_jackpot", collect.goldJackpotCoins);
  dictinc(params, "lockwin_coins_greenmini", collect.greenMiniCoins);
  // Total prizes handed out by the Gold Convoy = jackpot coins + cash coins. Always equals
  // lockwin_coins_gold + lockwin_coins_jackpot, so it doubles as an integrity check.
  dictinc(params, "lockwin_gold_prizes", collect.goldPrizeCoins);

  // --- v4: frequency + average-win census -----------------------------------------------
  // Every "_win_" leaf is a SUM of feature payouts in coins; divide by its paired count leaf to
  // get the average. Categories deliberately OVERLAP — one session can carry a truck, three row
  // unlocks and a Gold Convoy at once — so each average is conditional, not a partition.
  const win = collect.coins;
  dictinc(params, "lockwin_win_total", win);
  // v4: win-frequency histogram for the LOCK & WIN feature alone — one entry per feature, keyed
  // on that feature's payout. Denominator is lockwin_total, not the spin count.
  dictinc2(params, "lockwin_hist", String(win), 1);

  // trucks: pair with the existing truck_red / truck_purple / truck_blue counts
  for (const color of collect.truckColors) {
    dictinc(params, "lockwin_win_" + color, win);
  }
  // …and the two dormant-truck counters the port records (src/rules.ts recordCollect).
  if (collect.truckDormant) {
    dictinc(params, "truckdormant_act", collect.truckDormant);
  }
  if (collect.truckForfeit) {
    dictinc(params, "truckforfeit_act", collect.truckForfeit);
  }

  // row unlocks: cumulative EVENT counts. finalRows starts at 3 and only climbs, so a session
  // ending on 6 performed all three unlocks and is counted in unlock1, unlock2 and unlock3.
  for (let step = 1; step <= 3; step++) {
    if (collect.finalRows >= 3 + step) {
      dictinc(params, "lockwin_unlock" + step, 1);
      dictinc(params, "lockwin_win_unlock" + step, win);
    }
  }

  // GO / row-unlock symbol: lockwin_sym_go already totals the symbols themselves. This pairs
  // the count of SESSIONS showing at least one with their payout. NB goCount can reach 4 — the
  // fourth GO opens the garage rather than a row — so symbols outnumber unlocks.
  if (collect.goCount > 0) {
    dictinc(params, "lockwin_go_sessions", 1);
    dictinc(params, "lockwin_win_go", win);
  }

  // gold truck / Gold Convoy: the whole session payout AND the convoy's own prizes in isolation
  if (collect.goldConvoy) {
    dictinc(params, "lockwin_win_goldconvoy", win);
    dictinc(params, "lockwin_win_goldcoins", collect.goldPrizeWin);
  }
  // --------------------------------------------------------------------------------------
  dictinc(params, "lockwin_sym_go", collect.goCount);
  dictinc(params, "lockwin_sym_truck", collect.truckColors.length);
  // -------------------------------------------------------------------------------------

  dictinc(params, "lockcoins" + collect.finalCoinCount, 1);
  dictinc(params, "respins" + collect.respinCount, 1);
  dictinc(params, "go" + collect.goCount, 1);
  if (collect.goldConvoy) {
    dictinc(params, "goldconvoy_act", 1);
  }
  if (collect.greenConvoy) {
    dictinc(params, "convoy_green", 1);
  }
  if (collect.goldConvoy) {
    dictinc(params, "convoy_gold", 1);
  }
  for (const color of collect.truckColors) {
    dictinc(params, "truck_" + color, 1);
  }
  for (const t of collect.jackpots) {
    dictinc(params, "jackpot_" + t, 1);
  }
  for (const v of collect.coinDrawsX) {
    dictinc(params, "coinval" + v, 1);
  }
}

/**
 * Play one whole round: base spin + (on 3+ BONUS) 8 free spins. Returns `[coins, listcomb]`
 * and accumulates the dictinc breakdown into `params`. See src/rules.ts `playRound`.
 *
 * RTP is split two ways (house convention): `rtp.base` = base LINE coins; `rtp.bonus` =
 * everything else (the base Lock & Spin + all in-Free-Games wins). Every other leaf is a
 * COUNT (feature acts, coin-count histogram, jackpot tiers, line-win combos) so the log
 * comparison's Poisson gate is valid.
 */
function simmacro(listcomb: number[][], params: StatsParams): [number, number[][]] {
  const config: "low" | "high" = rf() < probconfig ? "low" : "high";

  const base = oneSpin(false, config);
  let coins = base.coins;
  let bonusCoins = base.collect?.coins ?? 0;

  dictinc2(params, "rtp", "base", base.lineCoins);
  dictinc2(params, "features", "basespin_act", 1);
  // v4: win-frequency histogram for the BASE GAME alone — payline coins on this spin, zeros
  // included, exactly as the global `volat` counts whole-round wins. Any params key ending
  // "_hist" is routed by run.ts to its own winhist_<game>.txt and kept out of log.txt and
  // data_<game>.txt, so these large tables never clutter the main reports.
  dictinc2(params, "basewin_hist", String(base.lineCoins), 1);
  dictinc(params, "bonuscount" + base.bonusCount, 1);
  recordCombos(params, listcomb, base.lineWins, "base");
  if (base.lineCoins > 0) {
    dictinc(params, "basehit_act", 1);
  }
  if (base.addWildCount > 0) {
    dictinc(params, "addwild_act", 1);
    dictinc(params, "addwild" + base.addWildCount, 1);
  }
  // v3: drop + board-state leaves, so the new trigger can be verified against its parameters.
  if (base.dropCount > 0) {
    dictinc(params, "coindrop_act", 1);
    dictinc(params, "coindrop" + base.dropCount, 1);
  }
  dictinc(params, "boardcoins" + base.boardCoinCount, 1);
  if (base.collect) {
    recordCollect(params, base.collect, "lockspin_act");
  }

  // v4 CHANGE 3: symbol 13 no longer exists on any reel strip, so `bonusCount` is always 0 and
  // there is no Free Games mode at all. The branch that played M.fsSpins free spins is removed
  // rather than left unreachable. `bonuscount0` still appears in the log (equal to the spin
  // count) as a standing check that no scatter can land.

  coins = Math.min(coins, MAX_WIN_X * lines);
  dictinc2(params, "rtp", "bonus", bonusCoins);
  assertSimNumber(coins, "round coins");
  return [coins, listcomb];
}

// combs/e_lines/e_scats/e_wild/totalelem* exist only for the surrounding framework
// (report generation via run.ts, listcomb sizing via core.ts's createListcomb) -
// simmacro never reads them, it evaluates lines itself via evaluatePaylines() +
// PAYS_LOW/PAYS_HIGH. Without these fields totalelemmax is undefined, so
// core.ts's createListcomb(ts, undefined) sizes every listcomb row to length 0
// (Array.from({length: NaN}) -> []), and recordCombos's `listcomb[w.length][w.symbol]
// += 1` then silently writes NaN into a JS array's out-of-bounds index instead of
// throwing - the round's own `coins` stays a valid number throughout (assertSimNumber
// never fires), so this corrupts only the (for this game, purely cosmetic/unused)
// combos histogram, not the RTP. combs values below are PAYS_HIGH (display only).
const totalelemmin = 1;
const totalelemmax = 13;
const combs: CombRow[] = [
  ["", 0, 0, 0, 0, 0, 0],
  ["wild", ...(PAYS_HIGH[1] as number[]), "WILD"],
  ["line", ...(PAYS_HIGH[2] as number[]), "MONEY"],
  ["line", ...(PAYS_HIGH[3] as number[]), "TRUCK"],
  ["line", ...(PAYS_HIGH[4] as number[]), "BURGER"],
  ["line", ...(PAYS_HIGH[5] as number[]), "TOOLBOX"],
  ["line", ...(PAYS_HIGH[6] as number[]), "A"],
  ["line", ...(PAYS_HIGH[7] as number[]), "K"],
  ["line", ...(PAYS_HIGH[8] as number[]), "Q"],
  ["line", ...(PAYS_HIGH[9] as number[]), "J"],
  ["line", ...(PAYS_HIGH[10] as number[]), "10"],
  ["line", ...(PAYS_HIGH[11] as number[]), "9"],
  ["scat", ...(PAYS_HIGH[12] as number[]), "COIN"],
  ["scat", ...(PAYS_HIGH[13] as number[]), "BONUS"],
];
const e_lines = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const e_scats = [12, 13];
const e_wild = [1];

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