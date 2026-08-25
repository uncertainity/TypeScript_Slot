
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

type MathConfig = typeof M_low;
type coinKind = "cash" | "white" | "blue" | "red";
interface Coin {
    kind:coinKind;
    value:number | null;
}
type Cell = Coin | null;

interface holdAndSpinResult{
    board:Cell[],
    win:number,

}

const M_low = {
    //Initial coins
    initialCoinCounts: [1,2,3],
    initialCoinWeights: [1,1,1],

    initialCoinValues: [1,2,3,4,5,10],
    intialCoinWeights: [4200,4500,2000,700,500,150],
    
    regCoinValues: [1,2,3,4,5,10,15,20,25,50],
    regCoinWeights: [4902,4500,2000,500,300,100,70,50,30,10],

    coinTypes: ["cash", "white", "blue", "red"] as coinKind[],
    regCoinTypeWeights: [16,3,3,10],

    multiplierValues: [1,2,3],
    multiplierWeights: [7,1,1],

    respinMax: 3,
    pCoin: 0.05,

};




function drawInitialCoinCount(m:MathConfig): number {
    const idx = weightchoice(m.initialCoinWeights);
    return m.initialCoinCounts[idx];
}

function drawInitialCashValue(m:MathConfig): number {
    const idx = weightchoice(m.initialCoinWeights);
    return m.initialCoinValues[idx];
}

function drawRegCashValue(m:MathConfig): Cell {
    const kind = weightchoice(m.regCoinTypeWeights);
    const idx = weightchoice(m.regCoinWeights);
    if (m.coinTypes[kind] !== "cash"){
        return{
            kind:m.coinTypes[kind],
            value:null
        }
    }
    else{
        return{
            kind:m.coinTypes[kind],
            value:m.regCoinValues[idx]
        }
    }
     
    
}


function chooseRandomCells(count: number): number[] {
    const cells = Array.from({length:15},(_,i) => i);

    for(let i = 0; i < count; i++){
        const j = i + Math.floor(Math.random() * (cells.length - 1));
        [cells[i],cells[j]] = [cells[j],cells[i]];
    }
    return cells.slice(0,count);

}

function createInitialBoard(m:MathConfig): Cell[] {
    const board = Array(15).fill(null);
    const init_coin_counts = drawInitialCoinCount(m);
    const init_positions = chooseRandomCells(init_coin_counts);
    for(let i = 0; i < init_positions.length; i++){
        board[init_positions[i]] = {
            kind: "cash",
            value: drawInitialCashValue(m),
        };
    }
    return board;
}

function boostedCoin(m:MathConfig,cur:number): number{
    let next:number = cur;
    for(let i = 0; i < m.regCoinValues.length; i++){
        if(m.regCoinValues[i] === cur){
            if (i - 1 >= 0){
                next = m.regCoinValues[i-1];
            }
            else{
                next = cur;
            }
            break;
        }
    }
    return next;
}

function selectMultiplier(m:MathConfig): number {
    const mult_idx = weightchoice(m.multiplierWeights);
    return m.multiplierValues[mult_idx];
}


function applyBoost(m: MathConfig, board: Cell[]): Cell[] {

    for (let i = 0; i < board.length; i++) {

        const boost = board[i];

        if (boost !== null && boost.kind === "blue") {

            for (let j = 0; j < board.length; j++) {

                const coin = board[j];

                if (j !== i && coin !== null) {
                    if(coin.value !== null){
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

function applyMultiplier(m: MathConfig, board: Cell[]): Cell[]{
    for(let i = 0; i < board.length; i++){
        const multiplier = board[i];

        if(multiplier != null && multiplier.kind === "red"){
            const mult = selectMultiplier(m);
            for(let j = 0; j < board.length; j++){
                const coin = board[j];

                if(j !== i && coin !== null){
                    if(coin.value !== null){
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

function applyCollector(m: MathConfig,board: Cell[]): Cell[]{
    for(let i = 0; i < board.length; i++){
        const collector = board[i];

        if(collector != null && collector.kind === "white"){
            let collect:number = 0;
            for(let j = 0; j < board.length; j++){
                const coin = board[j];

                if(j !== i && coin !== null){
                    if(coin.value !== null){
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


function holdAndSpin(m:MathConfig): holdAndSpinResult {
    let board:Cell[] = createInitialBoard(m);
    console.log("Initial Board:",board);
    let respinLeft = m.respinMax;
    let total_spins:number = 0;
    while (respinLeft > 0){
        let coinLanded = false;
        for(let i = 0; i < board.length; i++){
            if(board[i] !== null){
                continue;
            }
            if(Math.random() < m.pCoin){
                board[i] = drawRegCashValue(m);
                coinLanded = true;
            }
        }
        total_spins ++;
        console.log("Spin:",total_spins);
        console.log("Board:",board);

        board = applyBoost(m,board);
        console.log("After Boost:",board);
        board = applyMultiplier(m,board);
        console.log("After Multiplier:",board);
        board = applyCollector(m,board);
        console.log("After Collector:",board);
        
        if (coinLanded === true){
            respinLeft = m.respinMax;
        }
        else{
            respinLeft --;
        }
    }
    let win = 0;

    for (const coin of board) {
        if (coin !== null) {
            if (coin.value !== null){
                win += coin.value;
            }
        }
    }
    
    return {
        board,
        win
    };
}


const collect = holdAndSpin(M_low);
console.log("Win:", collect.win);
console.log("Board:", collect.board);




