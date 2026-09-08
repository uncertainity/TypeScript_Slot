"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simmacro = simmacro;
exports.printOneSimmacroResult = printOneSimmacroResult;
function weightchoice(weights) {
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
        const w = weights[i];
        if (w > 0)
            total += w;
    }
    const r = Math.random() * total;
    let s = 0;
    for (let i = 0; i < weights.length; i++) {
        const w = weights[i];
        if (w > 0)
            s += w;
        if (s > r)
            return i;
    }
    return weights.length - 1;
}
function dictinc(d, key, value) {
    var _a;
    const bag = d;
    bag[key] = ((_a = bag[key]) !== null && _a !== void 0 ? _a : 0) + value;
}
function dictinc2(d, key, innerKey, value) {
    var _a, _b;
    const inner = (_a = d[key]) !== null && _a !== void 0 ? _a : {};
    inner[innerKey] = ((_b = inner[innerKey]) !== null && _b !== void 0 ? _b : 0) + value;
    d[key] = inner;
}
/** Values are multiples of total bet, indexed by matching-symbol count. */
const BASE_PAYTABLE = {
    WILD: [0, 0, 0, 0, 0, 0],
    H1: [0, 0, 0.05, 0.25, 0.80, 1.25],
    H2: [0, 0, 0, 0.20, 0.50, 1.00],
    H3: [0, 0, 0, 0.20, 0.40, 1.00],
    H4: [0, 0, 0, 0.20, 0.25, 0.80],
    L1: [0, 0, 0, 0.10, 0.20, 0.30],
    L2: [0, 0, 0, 0.10, 0.20, 0.30],
    L3: [0, 0, 0, 0.10, 0.20, 0.30],
    L4: [0, 0, 0, 0.10, 0.20, 0.30],
    SC: [0, 0, 0, 0, 0, 0],
};
/** Each entry contains the row (top=0, middle=1, bottom=2) used on each reel. */
const BASE_PAYLINES = [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [0, 0, 1, 0, 0],
    [2, 2, 1, 2, 2],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 1, 1, 0],
];
/** Temporary strips used only to exercise the base-game spin and line evaluator. */
const DUMMY_REELSET = [
    ["H1", "L1", "L2", "H2", "L3", "L1", "WILD", "L4", "H3", "L2", "H4", "L3", "L1", "L4", "L2"],
    ["L2", "H2", "L1", "SC", "L3", "H1", "L4", "L2", "WILD", "L1", "H3", "L3", "H4", "L4", "L1", "L2"],
    ["L1", "L3", "H3", "L2", "L4", "SC", "H1", "L1", "L2", "WILD", "H2", "L3", "L4", "H4", "L2", "L1"],
    ["L4", "L1", "H4", "L2", "L3", "WILD", "L1", "H2", "SC", "L4", "L2", "H1", "L3", "L1", "H3", "L2"],
    ["H2", "L2", "L4", "H1", "L1", "L3", "H3", "L2", "L1", "WILD", "L4", "H4", "L3", "L1", "L2"],
];
function spinBaseReels(reelset) {
    return reelset.map((strip) => {
        const stop = Math.floor(Math.random() * strip.length);
        return [strip[stop], strip[(stop + 1) % strip.length], strip[(stop + 2) % strip.length]];
    });
}
function evaluateBaseLines(reels) {
    var _a;
    let win = 0;
    const lineWins = [];
    for (let lineIndex = 0; lineIndex < BASE_PAYLINES.length; lineIndex++) {
        const payline = BASE_PAYLINES[lineIndex];
        const symbols = payline.map((row, reel) => reels[reel][row]);
        const payingSymbol = symbols.find((symbol) => symbol !== "WILD");
        // The GDD defines Wild as substitute-only, so an all-Wild line has no own award.
        if (payingSymbol === undefined)
            continue;
        let count = 0;
        for (const symbol of symbols) {
            if (symbol === payingSymbol || symbol === "WILD")
                count++;
            else
                break;
        }
        const lineWin = (_a = BASE_PAYTABLE[payingSymbol][count]) !== null && _a !== void 0 ? _a : 0;
        if (lineWin === 0)
            continue;
        win += lineWin;
        lineWins.push({
            payline: lineIndex + 1,
            symbol: payingSymbol,
            count,
            win: lineWin,
        });
    }
    return { win: Math.round(win * 100) / 100, lineWins };
}
function playBaseGame() {
    const reels = spinBaseReels(DUMMY_REELSET);
    const evaluated = evaluateBaseLines(reels);
    return {
        reels,
        regularLineWins: evaluated.lineWins,
        lineWins: evaluated.lineWins,
        regularWin: evaluated.win,
        expansion: null,
        win: evaluated.win,
    };
}
function logBaseGameResult(result) {
    const rowNames = ["Top", "Middle", "Bottom"];
    const makeGrid = (reels) => Object.fromEntries(rowNames.map((name, row) => [
        name,
        Object.fromEntries(reels.map((reel, index) => [`Reel ${index + 1}`, reel[row]])),
    ]));
    console.log("\n=== Base Game Result ===");
    console.table(makeGrid(result.reels));
    if (result.regularLineWins.length > 0) {
        console.table(result.regularLineWins);
    }
    else {
        console.log("Regular line wins: none");
    }
    console.log(`Regular win: ${result.regularWin}x total bet`);
    if (result.expansion !== null) {
        console.log(`\n=== Expanding Symbol Feature: ${result.expansion.symbol} ===`);
        console.table(makeGrid(result.expansion.reels));
        if (result.expansion.lineWins.length > 0) {
            console.table(result.expansion.lineWins);
        }
        else {
            console.log("Expansion line wins: none");
        }
        console.log(`Expansion win: ${result.expansion.win}x total bet`);
    }
    else {
        console.log("Expanding Symbol feature: not triggered");
    }
    console.log(`Final base-game win: ${result.win}x total bet`);
}
const M_low = {
    //Initial coins
    initialCoinCounts: [1, 2, 3],
    initialCoinWeights: [1, 1, 1],
    initialCoinValues: [1, 2, 3, 4, 5, 10],
    intialCoinWeights: [4200, 4500, 2000, 700, 500, 150],
    regCoinValues: [1, 2, 3, 4, 5, 10, 15, 20, 25, 50],
    regCoinWeights: [4902, 4500, 2000, 500, 300, 100, 70, 50, 30, 10],
    coinTypes: ["cash", "white", "blue", "red"],
    regCoinTypeWeights: [16, 3, 3, 10],
    multiplierValues: [1, 2, 3],
    multiplierWeights: [7, 1, 1],
    respinMax: 3,
    expandingSymbolProbability: 0.2,
    pCoinByColumnsCleared: [
        0.0700, 0.0675, 0.0650, 0.0625, 0.0600,
        0.0575, 0.0550, 0.0525, 0.0500, 0.0475,
        0.0450, 0.0425, 0.0400, 0.0375, 0.0350,
    ],
    columnClearTargets: [3, 6, 9, 12, 15],
    columnJackpotValues: [5, 25, 100, 500, 1000],
    initialStarTypes: ["red", "blue", "white"],
    initialStarWeights: [1, 1, 1],
    onlyRedWeights: [260, 5],
    onlyRedTypes: ["None", "Red"],
    onlyWhiteWeights: [260, 5],
    onlyWhiteTypes: ["None", "White"],
    onlyBlueWeights: [260, 5],
    onlyBlueTypes: ["None", "Blue"],
    RedWhiteWeights: [180, 9, 9, 15],
    RedWhiteTypes: ["None", "Red", "White", "Red_White"],
    RedBlueWeights: [110, 9, 9, 13],
    RedBlueTypes: ["None", "Red", "Blue", "Red_Blue"],
    BlueWhiteWeights: [180, 8, 8, 12],
    BlueWhiteTypes: ["None", "Blue", "White", "Blue_White"],
    RedWhiteBlueWeights: [225, 15, 15, 15, 30, 30, 30, 75],
    RedWhiteBlueTypes: ["None", "Red", "White", "Blue", "Red_White", "Blue_White", "Red_Blue", "Red_Blue_White"]
};
function drawInitialCoinCount(m) {
    const idx = weightchoice(m.initialCoinWeights);
    return m.initialCoinCounts[idx];
}
function drawInitialCashValue(m) {
    const idx = weightchoice(m.initialCoinWeights);
    return m.initialCoinValues[idx];
}
function drawRegCashValue(m) {
    const kind = weightchoice(m.regCoinTypeWeights);
    const idx = weightchoice(m.regCoinWeights);
    if (m.coinTypes[kind] !== "cash") {
        return {
            kind: m.coinTypes[kind],
            value: null
        };
    }
    else {
        return {
            kind: m.coinTypes[kind],
            value: m.regCoinValues[idx]
        };
    }
}
function chooseRandomCells(count) {
    const cells = Array.from({ length: 15 }, (_, i) => i);
    for (let i = 0; i < count; i++) {
        const j = i + Math.floor(Math.random() * (cells.length - i));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells.slice(0, count);
}
function createInitialBoard(m, initialStars = []) {
    const board = Array(15).fill(null);
    const init_coin_counts = drawInitialCoinCount(m);
    const init_positions = chooseRandomCells(init_coin_counts + initialStars.length);
    for (let i = 0; i < init_coin_counts; i++) {
        board[init_positions[i]] = {
            kind: "cash",
            value: drawInitialCashValue(m),
        };
    }
    for (let i = 0; i < initialStars.length; i++) {
        board[init_positions[init_coin_counts + i]] = {
            kind: initialStars[i],
            value: null,
        };
    }
    return board;
}
function boostedCoin(m, cur) {
    let next = cur;
    for (let i = 0; i < m.regCoinValues.length; i++) {
        if (m.regCoinValues[i] === cur) {
            if (i + 1 < m.regCoinValues.length) {
                next = m.regCoinValues[i + 1];
            }
            else {
                next = cur;
            }
            break;
        }
    }
    return next;
}
function selectMultiplier(m) {
    const mult_idx = weightchoice(m.multiplierWeights);
    return m.multiplierValues[mult_idx];
}
function applyBoost(m, board) {
    for (let i = 0; i < board.length; i++) {
        const boost = board[i];
        if (boost !== null && boost.kind === "blue") {
            for (let j = 0; j < board.length; j++) {
                const coin = board[j];
                if (j !== i && coin !== null) {
                    if (coin.value !== null) {
                        coin.value = boostedCoin(m, coin.value);
                    }
                }
            }
            const idx = weightchoice(m.regCoinWeights);
            boost.value = m.regCoinValues[idx];
            boost.kind = "cash";
        }
    }
    return board;
}
function applyMultiplier(m, board) {
    for (let i = 0; i < board.length; i++) {
        const multiplier = board[i];
        if (multiplier != null && multiplier.kind === "red") {
            const mult = selectMultiplier(m);
            for (let j = 0; j < board.length; j++) {
                const coin = board[j];
                if (j !== i && coin !== null) {
                    if (coin.value !== null) {
                        coin.value = coin.value * mult;
                    }
                }
            }
            const idx = weightchoice(m.regCoinWeights);
            multiplier.value = m.regCoinValues[idx];
            multiplier.kind = "cash";
        }
    }
    return board;
}
function applyCollector(m, board) {
    for (let i = 0; i < board.length; i++) {
        const collector = board[i];
        if (collector != null && collector.kind === "white") {
            let collect = 0;
            for (let j = 0; j < board.length; j++) {
                const coin = board[j];
                if (j !== i && coin !== null) {
                    if (coin.value !== null) {
                        collect = collect + coin.value;
                    }
                }
            }
            collector.value = collect;
            collector.kind = "cash";
        }
    }
    return board;
}
function clearCompletedColumns(board) {
    let columnsCleared = 0;
    let win = 0;
    for (let column = 0; column < 5; column++) {
        const positions = [column, column + 5, column + 10];
        if (!positions.every((position) => board[position] !== null))
            continue;
        for (const position of positions) {
            const coin = board[position];
            if ((coin === null || coin === void 0 ? void 0 : coin.value) !== null && (coin === null || coin === void 0 ? void 0 : coin.value) !== undefined) {
                win += coin.value;
            }
            board[position] = null;
        }
        columnsCleared++;
    }
    return { columnsCleared, win };
}
function getCrossedJackpots(m, previousColumnsCleared, columnsCleared) {
    let win = 0;
    const triggered = [];
    for (let i = 0; i < m.columnClearTargets.length; i++) {
        const target = m.columnClearTargets[i];
        if (previousColumnsCleared < target && columnsCleared >= target) {
            win += m.columnJackpotValues[i];
            triggered.push(i + 1);
        }
    }
    return { win, triggered };
}
function emptySpecialSymbolCount() {
    return { total: 0, exactlyTwo: 0, exactlyThree: 0 };
}
function recordSpecialLandings(result, landedThisSpin) {
    result.total += landedThisSpin;
    if (landedThisSpin === 2)
        result.exactlyTwo++;
    if (landedThisSpin === 3)
        result.exactlyThree++;
}
function emptySpecialCombinations() {
    return {
        "Collector": 0,
        "Multiplier": 0,
        "Booster": 0,
        "Collector + Multiplier": 0,
        "Collector + Booster": 0,
        "Multiplier + Booster": 0,
        "Collector + Multiplier + Booster": 0,
    };
}
function recordSpecialCombination(combinations, collectors, multipliers, boosters) {
    const landedTypes = [];
    if (collectors > 0)
        landedTypes.push("Collector");
    if (multipliers > 0)
        landedTypes.push("Multiplier");
    if (boosters > 0)
        landedTypes.push("Booster");
    if (landedTypes.length === 0)
        return;
    const combination = landedTypes.join(" + ");
    combinations[combination]++;
}
function lockAndSpin(m, initialStars = []) {
    let board = createInitialBoard(m, initialStars);
    let respinLeft = m.respinMax;
    let total_spins = 0;
    let columnsCleared = 0;
    let columnClearWin = 0;
    let jackpotWin = 0;
    const jackpotsTriggered = [];
    const multipliers = emptySpecialSymbolCount();
    const collectors = emptySpecialSymbolCount();
    const boosters = emptySpecialSymbolCount();
    const specialCombinations = emptySpecialCombinations();
    recordSpecialLandings(multipliers, initialStars.filter((star) => star === "red").length);
    recordSpecialLandings(collectors, initialStars.filter((star) => star === "white").length);
    recordSpecialLandings(boosters, initialStars.filter((star) => star === "blue").length);
    recordSpecialCombination(specialCombinations, initialStars.filter((star) => star === "white").length, initialStars.filter((star) => star === "red").length, initialStars.filter((star) => star === "blue").length);
    while (respinLeft > 0) {
        let coinLanded = false;
        let multipliersLanded = 0;
        let collectorsLanded = 0;
        let boostersLanded = 0;
        const pCoin = m.pCoinByColumnsCleared[Math.min(columnsCleared, m.pCoinByColumnsCleared.length - 1)];
        for (let i = 0; i < board.length; i++) {
            if (board[i] !== null) {
                continue;
            }
            if (Math.random() < pCoin) {
                const coin = drawRegCashValue(m);
                board[i] = coin;
                coinLanded = true;
                if ((coin === null || coin === void 0 ? void 0 : coin.kind) === "red")
                    multipliersLanded++;
                if ((coin === null || coin === void 0 ? void 0 : coin.kind) === "white")
                    collectorsLanded++;
                if ((coin === null || coin === void 0 ? void 0 : coin.kind) === "blue")
                    boostersLanded++;
            }
        }
        recordSpecialLandings(multipliers, multipliersLanded);
        recordSpecialLandings(collectors, collectorsLanded);
        recordSpecialLandings(boosters, boostersLanded);
        recordSpecialCombination(specialCombinations, collectorsLanded, multipliersLanded, boostersLanded);
        total_spins++;
        board = applyBoost(m, board);
        board = applyMultiplier(m, board);
        board = applyCollector(m, board);
        const cleared = clearCompletedColumns(board);
        const previousColumnsCleared = columnsCleared;
        columnsCleared += cleared.columnsCleared;
        columnClearWin += cleared.win;
        const jackpotAward = getCrossedJackpots(m, previousColumnsCleared, columnsCleared);
        jackpotWin += jackpotAward.win;
        jackpotsTriggered.push(...jackpotAward.triggered);
        if (coinLanded === true) {
            respinLeft = m.respinMax;
        }
        else {
            respinLeft--;
        }
    }
    let win = columnClearWin + jackpotWin;
    for (const coin of board) {
        if (coin !== null) {
            if (coin.value !== null) {
                win += coin.value;
            }
        }
    }
    return {
        board,
        win,
        columnsCleared,
        columnClearWin,
        jackpotWin,
        jackpotsTriggered,
        totalSpins: total_spins,
        multipliers,
        collectors,
        boosters,
        specialCombinations,
    };
}
function drawTrigger(weights, types) {
    const selected = types[weightchoice(weights)];
    if (selected === "None")
        return [];
    return selected.split("_").map((color) => color.toLowerCase());
}
function selectTrigger(m, red, blue, white) {
    const hasRed = red > 0;
    const hasBlue = blue > 0;
    const hasWhite = white > 0;
    if (hasRed && hasBlue && hasWhite) {
        return drawTrigger(m.RedWhiteBlueWeights, m.RedWhiteBlueTypes);
    }
    if (hasRed && hasWhite)
        return drawTrigger(m.RedWhiteWeights, m.RedWhiteTypes);
    if (hasRed && hasBlue)
        return drawTrigger(m.RedBlueWeights, m.RedBlueTypes);
    if (hasBlue && hasWhite)
        return drawTrigger(m.BlueWhiteWeights, m.BlueWhiteTypes);
    if (hasRed)
        return drawTrigger(m.onlyRedWeights, m.onlyRedTypes);
    if (hasWhite)
        return drawTrigger(m.onlyWhiteWeights, m.onlyWhiteTypes);
    if (hasBlue)
        return drawTrigger(m.onlyBlueWeights, m.onlyBlueTypes);
    return [];
}
function applyExpandingSymbol(reels, symbol) {
    const expandingColumns = reels.filter((reel) => reel.includes(symbol));
    const otherColumns = reels.filter((reel) => !reel.includes(symbol));
    return [
        ...expandingColumns.map(() => [symbol, symbol, symbol]),
        ...otherColumns.map((reel) => [...reel]),
    ];
}
function runBaseExpansion(m, reels) {
    if (Math.random() >= m.expandingSymbolProbability)
        return null;
    const eligibleSymbols = reels.flat().filter((symbol) => symbol !== "SC");
    if (eligibleSymbols.length === 0)
        return null;
    const symbol = eligibleSymbols[Math.floor(Math.random() * eligibleSymbols.length)];
    const expandedReels = applyExpandingSymbol(reels, symbol);
    const evaluated = evaluateBaseLines(expandedReels);
    return {
        symbol,
        reels: expandedReels,
        lineWins: evaluated.lineWins,
        win: evaluated.win,
    };
}
function oneSpin(m) {
    var _a, _b;
    const reels = spinBaseReels(DUMMY_REELSET);
    const evaluated = evaluateBaseLines(reels);
    const expansion = runBaseExpansion(m, reels);
    const baseGame = {
        reels,
        regularLineWins: evaluated.lineWins,
        lineWins: [
            ...evaluated.lineWins,
            ...((_a = expansion === null || expansion === void 0 ? void 0 : expansion.lineWins) !== null && _a !== void 0 ? _a : []),
        ],
        regularWin: evaluated.win,
        expansion,
        win: Math.round((evaluated.win + ((_b = expansion === null || expansion === void 0 ? void 0 : expansion.win) !== null && _b !== void 0 ? _b : 0)) * 100) / 100,
    };
    const landedStars = [];
    let red = 0;
    let blue = 0;
    let white = 0;
    for (let i = 0; i < reels.length; i++) {
        for (let j = 0; j < reels[i].length; j++) {
            if (reels[i][j] === "SC") {
                let idx = weightchoice(m.initialStarWeights);
                let star_type = m.initialStarTypes[idx];
                landedStars.push(star_type);
                if (star_type == "red") {
                    red++;
                }
                else if (star_type == "white") {
                    white++;
                }
                else if (star_type == "blue") {
                    blue++;
                }
            }
        }
    }
    const triggeredStars = selectTrigger(m, red, blue, white);
    const lockAndSpinResult = triggeredStars.length > 0
        ? lockAndSpin(m, triggeredStars)
        : null;
    return {
        baseGame,
        landedStars,
        triggeredStars,
        lockAndSpin: lockAndSpinResult,
    };
}
function logOneSpinResult(result) {
    logBaseGameResult(result.baseGame);
    console.log(`SC stars landed: ${result.landedStars.length > 0 ? result.landedStars.join(", ") : "none"}`);
    console.log(`Lock & Spin trigger: ${result.triggeredStars.length > 0 ? result.triggeredStars.join(" + ") : "none"}`);
    if (result.lockAndSpin !== null)
        logLockAndSpinResult(result.lockAndSpin);
}
function formatCell(cell) {
    if (cell === null)
        return "--";
    if (cell.value === null)
        return cell.kind.toUpperCase();
    return String(cell.value);
}
function logLockAndSpinResult(result) {
    const rowNames = ["Top", "Middle", "Bottom"];
    const rows = Object.fromEntries(Array.from({ length: 3 }, (_, row) => {
        const cells = result.board.slice(row * 5, row * 5 + 5);
        return [rowNames[row], Object.fromEntries(cells.map((cell, column) => [`Column ${column + 1}`, formatCell(cell)]))];
    }));
    console.log("\n=== Lock & Spin Result ===");
    console.table(rows);
    console.table({
        Feature: { Spins: result.totalSpins, Total: "-", "Exactly 2": "-", "Exactly 3": "-" },
        Multipliers: { Spins: "-", Total: result.multipliers.total, "Exactly 2": result.multipliers.exactlyTwo, "Exactly 3": result.multipliers.exactlyThree },
        Collectors: { Spins: "-", Total: result.collectors.total, "Exactly 2": result.collectors.exactlyTwo, "Exactly 3": result.collectors.exactlyThree },
        Boosters: { Spins: "-", Total: result.boosters.total, "Exactly 2": result.boosters.exactlyTwo, "Exactly 3": result.boosters.exactlyThree },
    });
    console.log("Exact special combinations (respins):");
    console.table(result.specialCombinations);
    console.table({
        "Cleared columns": { Count: result.columnsCleared, Win: result.columnClearWin },
        "Triggered jackpots": {
            Count: result.jackpotsTriggered.length,
            Win: result.jackpotWin,
        },
    });
    console.log(`Jackpots triggered: ${result.jackpotsTriggered.length > 0
        ? result.jackpotsTriggered.map((jackpot) => `Jackpot ${jackpot}`).join(", ")
        : "none"}`);
    console.log(`Total win: ${result.win}`);
}
// ---------------------------------------------------------------------------
// Simulation entry point
// ---------------------------------------------------------------------------
const rolls = 5;
const height = 3;
const lines = 10;
const MAX_WIN_X = 5000;
const BASE_SYMBOL_IDS = {
    WILD: 1,
    H1: 2,
    H2: 3,
    H3: 4,
    H4: 5,
    L1: 6,
    L2: 7,
    L3: 8,
    L4: 9,
    SC: 10,
};
function recordBaseCombos(params, listcomb, lineWins) {
    var _a, _b;
    for (const lineWin of lineWins) {
        const symbol = BASE_SYMBOL_IDS[lineWin.symbol];
        const row = (_a = listcomb[lineWin.count]) !== null && _a !== void 0 ? _a : (listcomb[lineWin.count] = []);
        row[symbol] = ((_b = row[symbol]) !== null && _b !== void 0 ? _b : 0) + 1;
        dictinc2(params, "combsbase", `${lineWin.count}_${lineWin.symbol}`, 1);
    }
}
function recordLockAndSpin(params, result, winCoins) {
    dictinc(params, "lockspin_act", 1);
    dictinc(params, "lockwin_total", 1);
    dictinc(params, "lockwin_win_total", winCoins);
    dictinc2(params, "lockwin_hist", String(winCoins), 1);
    dictinc(params, `respins${result.totalSpins}`, 1);
    dictinc(params, "lockwin_multipliers", result.multipliers.total);
    dictinc(params, "lockwin_collectors", result.collectors.total);
    dictinc(params, "lockwin_boosters", result.boosters.total);
    dictinc(params, "lockwin_multiplier_pairs", result.multipliers.exactlyTwo);
    dictinc(params, "lockwin_multiplier_triples", result.multipliers.exactlyThree);
    dictinc(params, "lockwin_collector_pairs", result.collectors.exactlyTwo);
    dictinc(params, "lockwin_collector_triples", result.collectors.exactlyThree);
    dictinc(params, "lockwin_booster_pairs", result.boosters.exactlyTwo);
    dictinc(params, "lockwin_booster_triples", result.boosters.exactlyThree);
    for (const [combination, count] of Object.entries(result.specialCombinations)) {
        const key = combination.toLowerCase().split(" + ").join("_");
        dictinc(params, `lockwin_combination_${key}`, count);
    }
}
/**
 * Play one complete paid round: one base spin and an optional Lock & Spin.
 * Returns wins in simulation coins, where the 10-coin bet equals 1x total bet.
 * The surrounding runner calls this function repeatedly for large simulations.
 */
function simmacro(listcomb, params) {
    var _a;
    var _b;
    const round = oneSpin(M_low);
    const baseCoins = Math.round(round.baseGame.win * lines);
    const lockAndSpinCoins = Math.round(((_b = (_a = round.lockAndSpin) === null || _a === void 0 ? void 0 : _a.win) !== null && _b !== void 0 ? _b : 0) * lines);
    dictinc2(params, "features", "basespin_act", 1);
    dictinc2(params, "rtp", "base", baseCoins);
    dictinc2(params, "rtp", "bonus", lockAndSpinCoins);
    dictinc2(params, "basewin_hist", String(baseCoins), 1);
    dictinc(params, `sc_count${round.landedStars.length}`, 1);
    for (const star of round.landedStars)
        dictinc(params, `sc_${star}`, 1);
    if (baseCoins > 0)
        dictinc(params, "basehit_act", 1);
    recordBaseCombos(params, listcomb, round.baseGame.lineWins);
    const triggerKey = round.triggeredStars.length > 0
        ? round.triggeredStars.join("_")
        : "none";
    dictinc(params, `lockspin_trigger_${triggerKey}`, 1);
    if (round.lockAndSpin !== null) {
        recordLockAndSpin(params, round.lockAndSpin, lockAndSpinCoins);
    }
    const totalCoins = Math.min(baseCoins + lockAndSpinCoins, MAX_WIN_X * lines);
    return [totalCoins, listcomb];
}
/** Run one simmacro round and print everything recorded for that round. */
function printOneSimmacroResult() {
    var _a, _b, _c, _d, _e;
    const params = {};
    const listcomb = Array.from({ length: rolls + 1 }, () => Array(11).fill(0));
    const [totalCoins] = simmacro(listcomb, params);
    const rtp = (_a = params.rtp) !== null && _a !== void 0 ? _a : {};
    console.log("\n=== One simmacro Round ===");
    console.table({
        "Total bet": { Coins: lines, "Total-bet multiple": "1.00x" },
        "Base win": { Coins: (_b = rtp.base) !== null && _b !== void 0 ? _b : 0, "Total-bet multiple": `${(((_c = rtp.base) !== null && _c !== void 0 ? _c : 0) / lines).toFixed(2)}x` },
        "Lock & Spin win": { Coins: (_d = rtp.bonus) !== null && _d !== void 0 ? _d : 0, "Total-bet multiple": `${(((_e = rtp.bonus) !== null && _e !== void 0 ? _e : 0) / lines).toFixed(2)}x` },
        "Total win": { Coins: totalCoins, "Total-bet multiple": `${(totalCoins / lines).toFixed(2)}x` },
    });
    console.log("Recorded statistics:");
    console.dir(params, { depth: null });
    const recordedCombinations = listcomb.flat().reduce((sum, count) => sum + count, 0);
    if (recordedCombinations > 0) {
        console.log("Line-win combinations by match count and symbol ID:");
        console.table(listcomb);
    }
    else {
        console.log("Line-win combinations: none");
    }
}
const paytableInCoins = (symbol) => BASE_PAYTABLE[symbol].map((winX) => Math.round(winX * lines));
const game = {
    rolls,
    height,
    lines,
    totalelemmin: 1,
    totalelemmax: 10,
    combs: [
        ["", 0, 0, 0, 0, 0, 0],
        ["wild", ...paytableInCoins("WILD"), "WILD"],
        ["line", ...paytableInCoins("H1"), "H1"],
        ["line", ...paytableInCoins("H2"), "H2"],
        ["line", ...paytableInCoins("H3"), "H3"],
        ["line", ...paytableInCoins("H4"), "H4"],
        ["line", ...paytableInCoins("L1"), "L1"],
        ["line", ...paytableInCoins("L2"), "L2"],
        ["line", ...paytableInCoins("L3"), "L3"],
        ["line", ...paytableInCoins("L4"), "L4"],
        ["scat", ...paytableInCoins("SC"), "SC"],
    ],
    e_lines: [2, 3, 4, 5, 6, 7, 8, 9],
    e_scats: [10],
    e_wild: [1],
    simmacro,
    printOneSimmacroResult,
};
exports.default = game;
const TEST_TO_RUN = "all";
function check(condition, message) {
    if (!condition)
        throw new Error(`FAILED: ${message}`);
}
function checkEqual(actual, expected, message) {
    check(actual === expected, `${message}; expected ${String(expected)}, received ${String(actual)}`);
}
function printForcedBoard(title, board) {
    const rowNames = ["Top", "Middle", "Bottom"];
    const rows = Object.fromEntries(Array.from({ length: 3 }, (_, row) => [
        rowNames[row],
        Object.fromEntries(Array.from({ length: 5 }, (_, column) => {
            const position = row * 5 + column;
            return [`Column ${column + 1}`, formatCell(board[position])];
        })),
    ]));
    console.log(`\n${title}`);
    console.table(rows);
}
function printForcedReels(title, reels) {
    const rowNames = ["Top", "Middle", "Bottom"];
    const rows = Object.fromEntries(rowNames.map((name, row) => [
        name,
        Object.fromEntries(reels.map((reel, column) => [
            `Column ${column + 1}`,
            reel[row],
        ])),
    ]));
    console.log(`\n${title}`);
    console.table(rows);
}
function runStarChecks() {
    var _a, _b, _c, _d, _e, _f, _g;
    const boosterBoard = Array(15).fill(null);
    boosterBoard[0] = { kind: "blue", value: null };
    boosterBoard[1] = { kind: "cash", value: 1 };
    boosterBoard[2] = { kind: "cash", value: 5 };
    printForcedBoard("Booster board before", boosterBoard);
    applyBoost(M_low, boosterBoard);
    printForcedBoard("Booster board after", boosterBoard);
    checkEqual((_a = boosterBoard[1]) === null || _a === void 0 ? void 0 : _a.value, 2, "Booster raises 1 to 2");
    checkEqual((_b = boosterBoard[2]) === null || _b === void 0 ? void 0 : _b.value, 10, "Booster raises 5 to 10");
    checkEqual((_c = boosterBoard[0]) === null || _c === void 0 ? void 0 : _c.kind, "cash", "Booster converts to cash");
    const forcedMultiplierMath = {
        ...M_low,
        multiplierValues: [2],
        multiplierWeights: [1],
    };
    const multiplierBoard = Array(15).fill(null);
    multiplierBoard[0] = { kind: "red", value: null };
    multiplierBoard[1] = { kind: "cash", value: 5 };
    printForcedBoard("Multiplier board before (forced 2x)", multiplierBoard);
    applyMultiplier(forcedMultiplierMath, multiplierBoard);
    printForcedBoard("Multiplier board after", multiplierBoard);
    checkEqual((_d = multiplierBoard[1]) === null || _d === void 0 ? void 0 : _d.value, 10, "Multiplier applies forced 2x");
    checkEqual((_e = multiplierBoard[0]) === null || _e === void 0 ? void 0 : _e.kind, "cash", "Multiplier converts to cash");
    const collectorBoard = Array(15).fill(null);
    collectorBoard[0] = { kind: "white", value: null };
    collectorBoard[1] = { kind: "cash", value: 2 };
    collectorBoard[2] = { kind: "cash", value: 5 };
    printForcedBoard("Collector board before", collectorBoard);
    applyCollector(M_low, collectorBoard);
    printForcedBoard("Collector board after", collectorBoard);
    checkEqual((_f = collectorBoard[0]) === null || _f === void 0 ? void 0 : _f.value, 7, "Collector collects all other cash");
    checkEqual((_g = collectorBoard[0]) === null || _g === void 0 ? void 0 : _g.kind, "cash", "Collector converts to cash");
    console.log("PASS: star effects");
}
function runExpansionChecks() {
    const reels = [
        ["H2", "L1", "L2"],
        ["L1", "L2", "L3"],
        ["L4", "H2", "L1"],
        ["L2", "L3", "L4"],
        ["H2", "H1", "L3"],
    ];
    printForcedReels("Expansion board before (selected symbol: H2)", reels);
    const expanded = applyExpandingSymbol(reels, "H2");
    printForcedReels("Expansion board after", expanded);
    check(expanded.slice(0, 3).every((reel) => reel.every((symbol) => symbol === "H2")), "Columns 1, 3 and 5 move left and fully expand");
    checkEqual(expanded[3][0], reels[1][0], "Original column 2 moves to column 4");
    checkEqual(expanded[4][0], reels[3][0], "Original column 4 moves to column 5");
    const expansionWin = evaluateBaseLines(expanded);
    console.log(`Expansion line wins: ${expansionWin.lineWins.length}`);
    console.log(`Expansion win: ${expansionWin.win}x total bet`);
    checkEqual(expansionWin.lineWins.length, 10, "Three expanded columns win all 10 lines");
    checkEqual(expansionWin.win, 2, "Ten 3-H2 wins total 2x bet");
    console.log("PASS: expanding symbol and column shifting");
}
function runColumnChecks() {
    const board = Array(15).fill(null);
    board[0] = { kind: "cash", value: 1 };
    board[5] = { kind: "cash", value: 2 };
    board[10] = { kind: "cash", value: 3 };
    board[2] = { kind: "cash", value: 4 };
    board[7] = { kind: "cash", value: 5 };
    board[12] = { kind: "cash", value: 10 };
    board[1] = { kind: "cash", value: 25 };
    printForcedBoard("Column-clear board before", board);
    const result = clearCompletedColumns(board);
    printForcedBoard("Column-clear board after", board);
    console.table({
        "Clear result": {
            "Columns cleared": result.columnsCleared,
            "Collected win": result.win,
        },
    });
    checkEqual(result.columnsCleared, 2, "Two simultaneous full columns are counted");
    checkEqual(result.win, 25, "All values in cleared columns are collected");
    check([0, 5, 10, 2, 7, 12].every((position) => board[position] === null), "Full columns are cleared");
    check(board[1] !== null, "An incomplete column remains on the board");
    console.log("PASS: simultaneous column clearing");
}
function runJackpotChecks() {
    let counter = 0;
    let totalJackpotWin = 0;
    const triggered = [];
    const progression = [];
    for (const nextCounter of [1, 2, 4, 5, 6, 9, 12, 15]) {
        const award = getCrossedJackpots(M_low, counter, nextCounter);
        totalJackpotWin += award.win;
        triggered.push(...award.triggered);
        progression.push({
            "Previous counter": counter,
            "New counter": nextCounter,
            "Jackpots triggered": award.triggered.length > 0
                ? award.triggered.map((jackpot) => `Jackpot ${jackpot}`).join(" + ")
                : "none",
            "Award this step": award.win,
            "Cumulative jackpot win": totalJackpotWin,
        });
        counter = nextCounter;
    }
    console.log("\nForced jackpot counter progression");
    console.table(progression);
    checkEqual(triggered.join(","), "1,2,3,4,5", "Every crossed jackpot triggers once");
    checkEqual(totalJackpotWin, 1630, "All five configured jackpots are cumulative");
    const jumpedMilestones = getCrossedJackpots(M_low, 2, 7);
    checkEqual(jumpedMilestones.triggered.join(","), "1,2", "A counter jump crosses every milestone");
    checkEqual(jumpedMilestones.win, 30, "A counter jump pays both crossed jackpots");
    console.log("PASS: cumulative jackpot thresholds");
}
function runForcedChecks(testName) {
    console.log(`\n=== Forced mechanic checks: ${testName} ===`);
    if (testName === "all" || testName === "stars")
        runStarChecks();
    if (testName === "all" || testName === "expansion")
        runExpansionChecks();
    if (testName === "all" || testName === "columns")
        runColumnChecks();
    if (testName === "all" || testName === "jackpots")
        runJackpotChecks();
    console.log("All selected checks passed.");
}
runForcedChecks(TEST_TO_RUN);
