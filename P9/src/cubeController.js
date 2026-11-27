/**
 * cubeController.js
 * Conecta el solver (rubikSolver.js) con tu cubo:
 *   - lee el estado con getCubeState()
 *   - ejecuta los movimientos con rotateLayer(axis, layer, dir, duration)
 */
import { getCubeState } from './position_manager.js';
import { rotateLayer } from "./figure_manager.js";
import { solveBeginner, solveCFOP, tokenToTurn, isCubeSolved } from './rubikSolver.js';

// ---------------------------------------------------------------------------
// CONFIGURACIÓN
// ---------------------------------------------------------------------------
export const DIR_SIGN = 1;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ejecuta una lista de movimientos en notación estándar (["R","U'","F2",...]). */
export async function executeMoves(moves, { duration = 400, pause = 0, onMove } = {}) {
  for (let i = 0; i < moves.length; i++) {
    const { axis, layer, q } = tokenToTurn(moves[i]);
    const dir = Math.sign(q) * DIR_SIGN;
    for (let k = 0; k < Math.abs(q); k++) await rotateLayer(axis, layer, dir, duration); // 180° = 2 cuartos
    if (onMove) onMove(moves[i], i, moves.length);
    if (pause) await sleep(pause);
  }
}

/** Solo calcula (sin mover nada). */
export const planBeginner = (opts) => solveBeginner(getCubeState(), opts);
export const planCFOP = (opts) => solveCFOP(getCubeState(), opts);

async function runPlan(plan, opts) {
  await executeMoves(plan.moves, opts);
  return { ...plan, solved: isCubeSolved(getCubeState()) };
}

/** Resuelve con el método de principiantes y anima el resultado. */
export async function solveBeginnerMethod(opts = {}) {
  return runPlan(planBeginner(opts), opts);
}

/** Resuelve con CFOP (Cross, F2L, OLL, PLL) y anima el resultado. */
export async function solveCFOPMethod(opts = {}) {
  return runPlan(planCFOP(opts), opts);
}

/** Genera una sucesión aleatoria de movimiento que desordena el cubo */
export async function scrambleCube(n = 20, opts = {}) {
  const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
  const mods = ['', "'", '2'];
  const moves = [];
  let last = '';
  while (moves.length < n) {
    const f = faces[Math.floor(Math.random() * faces.length)];
    if (f === last) continue;
    last = f;
    moves.push(f + mods[Math.floor(Math.random() * mods.length)]);
  }
  await executeMoves(moves, { duration: 100, ...opts });
  return moves;
}