/**
 * rubikSolver.js
 * ---------------------------------------------------------------------------
 * Solver de cubo de Rubik 3x3 (método de principiantes y CFOP).
 *
 * Es código PURO: no importa nada de tu proyecto. Recibe el array `pieces`
 * (el que devuelve getCubeState()) y devuelve la lista de movimientos.
 *
 *   const plan = solveBeginner(getCubeState());
 *   const plan = solveCFOP(getCubeState());
 *   // plan = { method, moves, stages, moveCount }
 *
 * Los movimientos usan la notación estándar del cubo en el sistema de
 * coordenadas REAL de tu cubo (U=+y, D=-y, R=+x, L=-x, F=+z, B=-z):
 *   U D L R F B  (cuarto de vuelta horario mirando la cara)
 *   U' (antihorario)  U2 (media vuelta)  M E S (capas centrales)
 *
 * Internamente el solver "gira" el cubo virtualmente para dejar siempre la
 * cara de la cruz (blanca) abajo, así todos los algoritmos son los estándar.
 * Al final los movimientos se convierten de vuelta a coordenadas reales.
 */

// ============================================================================
// 1. GEOMETRÍA Y MODELO DEL CUBO
// ============================================================================
const AXIS_INDEX = { x: 0, y: 1, z: 2 };
const KEY_VEC = {
  px: [1, 0, 0], nx: [-1, 0, 0],
  py: [0, 1, 0], ny: [0, -1, 0],
  pz: [0, 0, 1], nz: [0, 0, -1],
};
const FACE_VEC = {
  R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1],
};
const FACE_KEY = { R: 'px', L: 'nx', U: 'py', D: 'ny', F: 'pz', B: 'nz' };
const KEY_FACE = Object.fromEntries(Object.entries(FACE_KEY).map(([f, k]) => [k, f]));
const FACE_LIST = ['U', 'D', 'L', 'R', 'F', 'B'];

/** Gira el vector v q cuartos de vuelta (regla de la mano derecha) alrededor de `axis`. */
function rotVec(v, axis, q) {
  q = ((q % 4) + 4) % 4;
  let [x, y, z] = v;
  for (let i = 0; i < q; i++) {
    if (axis === 'x') [y, z] = [-z, y];
    else if (axis === 'y') [x, z] = [z, -x];
    else [x, y] = [-y, x];
  }
  return [x + 0, y + 0, z + 0]; // "+ 0" elimina -0
}

function vecToKey(v) {
  for (const k in KEY_VEC) {
    const w = KEY_VEC[k];
    if (w[0] === v[0] && w[1] === v[1] && w[2] === v[2]) return k;
  }
  throw new Error('Vector de cara inválido: ' + v);
}

const addVec = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const eqVec = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// [eje, capa, dirección "mano derecha" del cuarto de vuelta horario de esa cara]
const BASE = {
  U: ['y', 1, -1], D: ['y', -1, 1],
  R: ['x', 1, -1], L: ['x', -1, 1],
  F: ['z', 1, -1], B: ['z', -1, 1],
  M: ['x', 0, 1], E: ['y', 0, 1], S: ['z', 0, -1], // M sigue a L, E sigue a D, S sigue a F
};
// Movimientos anchos -> cara + capa central
const WIDE = {
  r: ['R', "M'"], l: ['L', 'M'], u: ['U', "E'"], d: ['D', 'E'], f: ['F', 'S'], b: ['B', "S'"],
};

function parseToken(t) {
  const m = /^([UDLRFBMES])(2|')?$/.exec(t);
  if (!m) throw new Error(`Movimiento no válido: ${t}`);
  const [axis, layer, rh] = BASE[m[1]];
  const q = m[2] === '2' ? 2 : m[2] === "'" ? -rh : rh;
  return { base: m[1], axis, layer, q };
}

function applySuffix(tok, s) {
  if (s === '') return tok;
  if (s === '2') return tok[0] + '2';
  return tok.endsWith("'") ? tok[0] : tok[0] + "'";
}

/** "R U R' f" -> ["R","U","R'","F","S"] (expande anchos, devuelve solo movimientos base). */
export function expandAlg(alg) {
  const raw = Array.isArray(alg) ? alg : alg.trim().split(/\s+/);
  const out = [];
  for (const t of raw) {
    if (!t) continue;
    const m = /^([a-zA-Z])(2|')?$/.exec(t);
    if (!m) throw new Error(`Movimiento no válido: ${t}`);
    const [, b, s = ''] = m;
    if (WIDE[b]) WIDE[b].forEach((p) => out.push(applySuffix(p, s)));
    else out.push(t);
  }
  return out;
}

function invertAlg(alg) {
  return expandAlg(alg).reverse().map((t) => (t.endsWith('2') ? t : t.endsWith("'") ? t[0] : t + "'"));
}

/** Elimina cancelaciones triviales (R R' -> nada, R R -> R2, ...). */
function simplify(tokens) {
  const out = [];
  for (const t of tokens) {
    const base = t[0];
    const q = t.endsWith('2') ? 2 : t.endsWith("'") ? 3 : 1;
    const prev = out[out.length - 1];
    if (prev && prev.base === base) {
      prev.q = (prev.q + q) % 4;
      if (prev.q === 0) out.pop();
    } else out.push({ base, q });
  }
  return out.map(({ base, q }) => base + (q === 1 ? '' : q === 2 ? '2' : "'"));
}

class Cube {
  constructor(src) {
    this.p = src.map((p) => ({ pos: [...(p.pos || p.position)], faces: { ...p.faces } }));
  }
  clone() { return new Cube(this.p); }

  prim(axis, layer, q) {
    const ai = AXIS_INDEX[axis];
    for (const p of this.p) {
      if (p.pos[ai] !== layer) continue;
      p.pos = rotVec(p.pos, axis, q);
      const nf = {};
      for (const k in p.faces) nf[vecToKey(rotVec(KEY_VEC[k], axis, q))] = p.faces[k];
      p.faces = nf;
    }
  }
  rotateAll(axis, q) {
    for (const l of [-1, 0, 1]) this.prim(axis, l, q);
  }
  move(token) { const t = parseToken(token); this.prim(t.axis, t.layer, t.q); }
  run(alg) { for (const t of expandAlg(alg)) this.move(t); return this; }

  at(x, y, z) { return this.p.find((p) => p.pos[0] === x && p.pos[1] === y && p.pos[2] === z); }
  find(colors) {
    for (const p of this.p) {
      const vals = Object.values(p.faces);
      if (vals.length === colors.length && colors.every((c) => vals.includes(c))) return p;
    }
    throw new Error('Pieza no encontrada: ' + colors.join('/') + ' (¿estado de cubo inválido?)');
  }
  isSolved() {
    const center = {};
    for (const p of this.p) {
      const ks = Object.keys(p.faces);
      if (ks.length === 1) center[ks[0]] = p.faces[ks[0]];
    }
    return this.p.every((p) => Object.entries(p.faces).every(([k, c]) => center[k] === c));
  }
}

const keyOf = (piece, color) => Object.keys(piece.faces).find((k) => piece.faces[k] === color);
const sideFace = (pos) => (pos[0] !== 0 ? (pos[0] > 0 ? 'R' : 'L') : pos[2] > 0 ? 'F' : 'B');

/** ¿Es un estado resuelto? (cada cara de un solo color). Útil para verificar. */
export function isCubeSolved(pieces) { return new Cube(pieces).isSolved(); }

// ============================================================================
// 2. CAMBIO DE MARCO: cara de la cruz siempre abajo
// ============================================================================
function findFrame(pieces, crossColor) {
  const real = new Cube(pieces);
  const wc = real.p.find((p) => {
    const v = Object.values(p.faces);
    return v.length === 1 && v[0] === crossColor;
  });
  if (!wc) throw new Error(`No se encontró el centro de color '${crossColor}'`);
  for (const axis of ['x', 'y', 'z']) {
    for (let q = 0; q < 4; q++) {
      const r = rotVec(wc.pos, axis, q);
      if (r[0] === 0 && r[1] === -1 && r[2] === 0) return { axis, q };
    }
  }
  throw new Error('No se pudo orientar el cubo');
}

/** Convierte un movimiento del marco virtual al marco real. */
function toRealToken(token, rv) {
  const { axis, layer, q } = parseToken(token);
  const e = [0, 0, 0];
  e[AXIS_INDEX[axis]] = 1;
  const e2 = rotVec(e, rv.axis, -rv.q);
  const ai = e2.findIndex((v) => v !== 0);
  const s = e2[ai];
  const axis2 = 'xyz'[ai];
  const layer2 = layer * s;
  const q2 = q * s;
  const base = Object.keys(BASE).find((b) => BASE[b][0] === axis2 && BASE[b][1] === layer2);
  const rh = BASE[base][2];
  const qq = ((q2 % 4) + 4) % 4;
  if (qq === 2) return base + '2';
  return base + (qq === ((rh % 4) + 4) % 4 ? '' : "'");
}

/**
 * Convierte un movimiento real en {axis, layer, q}.
 * q es el giro en "regla de la mano derecha": +1 = antihorario mirando desde
 * el semieje positivo hacia el origen (convención de three.js); |q|=2 es media vuelta.
 */
export function tokenToTurn(token) {
  const { axis, layer, q } = parseToken(token);
  return { axis, layer, q };
}

// ============================================================================
// 3. CONTEXTO DE RESOLUCIÓN
// ============================================================================
const CYCLE = ['F', 'R', 'B', 'L']; // "derecha de F es R", "derecha de R es B", ...
const SLOTS = [['F', 'R'], ['R', 'B'], ['B', 'L'], ['L', 'F']]; // [frente, derecha]
const rightOf = (f) => CYCLE[(CYCLE.indexOf(f) + 1) % 4];

/** Reorienta un algoritmo escrito para "frente = F" a otra cara frontal. */
function mapAlg(alg, front) {
  const k = CYCLE.indexOf(front);
  const map = { F: CYCLE[k], R: CYCLE[(k + 1) % 4], B: CYCLE[(k + 2) % 4], L: CYCLE[(k + 3) % 4] };
  return expandAlg(alg).map((t) => (map[t[0]] ? map[t[0]] + t.slice(1) : t));
}

function slotOfPos(pos) {
  const fx = pos[0] > 0 ? 'R' : 'L';
  const fz = pos[2] > 0 ? 'F' : 'B';
  return SLOTS.find((s) => s.includes(fx) && s.includes(fz));
}

class Ctx {
  constructor(cube, rv, crossColor) {
    this.cube = cube;
    this.rv = rv;
    this.W = crossColor;
    this.moves = [];
    this.stages = [];
    this.centers = {};
    for (const f of FACE_LIST) {
      const c = cube.at(...FACE_VEC[f]);
      this.centers[f] = c.faces[FACE_KEY[f]];
    }
    this.faceOfColor = Object.fromEntries(Object.entries(this.centers).map(([f, c]) => [c, f]));
    this.Y = this.centers.U;
  }
  do(alg, front) {
    const toks = front ? mapAlg(alg, front) : expandAlg(alg);
    for (const t of toks) { this.cube.move(t); this.moves.push(t); }
  }
  stage(name, fn) {
    const i = this.moves.length;
    fn();
    const mv = simplify(this.moves.splice(i));
    this.moves.push(...mv);
    this.stages.push({ name, moves: mv });
  }
  pieceSolved(p) {
    return Object.entries(p.faces).every(([k, c]) => this.centers[KEY_FACE[k]] === c);
  }
  homePos(colors) {
    return colors.reduce((a, c) => addVec(a, FACE_VEC[this.faceOfColor[c]]), [0, 0, 0]);
  }
  get sideColors() { return ['F', 'R', 'B', 'L'].map((f) => this.centers[f]); }
}

// ============================================================================
// 4. MÉTODO DE PRINCIPIANTES (capa por capa)
// ============================================================================
const BEG = {
  LIFT: "R U R' U'", // sexy move: saca/mete esquinas blancas
  MID_RIGHT: "U R U' R' U' F' U F",
  MID_LEFT: "U' L' U L U F U' F'",
  CROSS_LINE: "F R U R' U' F'",
  CROSS_L: "F U R U' R' F'",
  EDGES: "R U R' U R U2 R' U",
  CORNER_CYCLE: "U R U' L' U R' U' L",
  CORNER_TWIST: "R' D' R D",
};

// --- Paso 1: cruz blanca (margarita + alinear) ---
function begCross(ctx) {
  const { cube, W } = ctx;
  const edges = () => ctx.sideColors.map((c) => cube.find([W, c]));
  const isPetal = (e) => e.pos[1] === 1 && e.faces.py === W;
  const clearAbove = (face) => {
    const v = FACE_VEC[face];
    for (let i = 0; i < 4; i++) {
      if (!isPetal(cube.at(v[0], 1, v[2]))) return;
      ctx.do('U');
    }
  };

  // 1a) Margarita: las 4 aristas blancas en la capa U con el blanco hacia arriba
  for (let guard = 0; guard < 40; guard++) {
    const e = edges().find((x) => !isPetal(x));
    if (!e) break;
    const wk = keyOf(e, W);
    if (e.pos[1] === -1) {
      const f = sideFace(e.pos);
      clearAbove(f);
      if (wk === 'ny') ctx.do(f + '2');
      else ctx.do(f); // blanco de lado: la bajamos a la capa media
    } else if (e.pos[1] === 0) {
      const o = KEY_FACE[Object.keys(e.faces).find((k) => k !== wk)];
      clearAbove(o);
      const colors = Object.values(e.faces);
      for (const t of [o, o + "'"]) {
        const sim = cube.clone();
        sim.move(t);
        if (keyOf(sim.find(colors), W) === 'py') { ctx.do(t); break; }
      }
    } else {
      ctx.do(KEY_FACE[wk]); // en la capa U con blanco de lado: bajarla a la capa media
    }
  }

  // 1b) Alinear cada pétalo con su centro y girar esa cara 180°
  for (let guard = 0; guard < 30; guard++) {
    const petals = edges().filter((e) => e.pos[1] === 1);
    if (!petals.length) break;
    let done = false;
    for (let r = 0; r < 4 && !done; r++) {
      for (const e of petals) {
        const f = sideFace(e.pos);
        if (e.faces[FACE_KEY[f]] === ctx.centers[f]) { ctx.do(f + '2'); done = true; break; }
      }
      if (!done) ctx.do('U');
    }
  }
}

// --- Paso 2: esquinas blancas ---
function begCorners(ctx) {
  const { cube, W } = ctx;
  for (const [fr, rt] of SLOTS) {
    const c = cube.find([W, ctx.centers[fr], ctx.centers[rt]]);
    for (let g = 0; g < 14 && !ctx.pieceSolved(c); g++) {
      if (c.pos[1] === -1) {
        ctx.do(BEG.LIFT, slotOfPos(c.pos)[0]); // sacarla / seguir repitiendo
      } else {
        const tv = addVec(FACE_VEC[fr], FACE_VEC[rt]);
        const above = [tv[0], 1, tv[2]];
        for (let i = 0; i < 4 && !eqVec(c.pos, above); i++) ctx.do('U');
        ctx.do(BEG.LIFT, fr);
      }
    }
  }
}

// --- Paso 3: segunda capa ---
function begMiddle(ctx) {
  const { cube } = ctx;
  for (const [fr, rt] of SLOTS) {
    const e = cube.find([ctx.centers[fr], ctx.centers[rt]]);
    for (let g = 0; g < 10 && !ctx.pieceSolved(e); g++) {
      if (e.pos[1] === 0) { ctx.do(BEG.MID_RIGHT, slotOfPos(e.pos)[0]); continue; }
      for (let r = 0; r < 4; r++) {
        const f = sideFace(e.pos);
        if (e.faces[FACE_KEY[f]] === ctx.centers[f]) break;
        ctx.do('U');
      }
      const f = sideFace(e.pos);
      if (e.faces.py === ctx.centers[rightOf(f)]) ctx.do(BEG.MID_RIGHT, f);
      else ctx.do(BEG.MID_LEFT, f);
    }
  }
}

const upEdges = (cube) => cube.p.filter((p) => p.pos[1] === 1 && Object.keys(p.faces).length === 2);
const upCorners = (cube) => cube.p.filter((p) => p.pos[1] === 1 && Object.keys(p.faces).length === 3);

// --- Paso 4: cruz amarilla ---
function begYellowCross(ctx) {
  const { cube, Y } = ctx;
  const count = (c) => upEdges(c).filter((e) => e.faces.py === Y).length;
  for (let g = 0; g < 8; g++) {
    const n = count(cube);
    if (n === 4) return;
    if (n === 0) { ctx.do(BEG.CROSS_LINE); continue; } // punto -> L
    const ys = upEdges(cube).filter((e) => e.faces.py === Y);
    const opposite = ys[0].pos[0] + ys[1].pos[0] === 0 && ys[0].pos[2] + ys[1].pos[2] === 0;
    const alg = opposite ? BEG.CROSS_LINE : BEG.CROSS_L;
    let ok = false;
    for (let k = 0; k < 4 && !ok; k++) {
      const sim = cube.clone();
      sim.run('U '.repeat(k) + alg);
      if (count(sim) === 4) { ctx.do('U '.repeat(k).trim() || []); ctx.do(alg); ok = true; }
    }
    if (!ok) ctx.do(alg);
  }
}

// --- Paso 5: colocar aristas amarillas ---
function edgeMatches(ctx, cube) {
  return upEdges(cube).filter((e) => {
    const f = sideFace(e.pos);
    return e.faces[FACE_KEY[f]] === ctx.centers[f];
  }).length;
}
function bestU(ctx, cube, scoreFn) {
  let best = -1, bk = 0;
  for (let k = 0; k < 4; k++) {
    const s = cube.clone();
    for (let i = 0; i < k; i++) s.move('U');
    const v = scoreFn(s);
    if (v > best) { best = v; bk = k; }
  }
  return { best, k: bk };
}
function begYellowEdges(ctx) {
  const score = (c) => edgeMatches(ctx, c);
  for (let g = 0; g < 10; g++) {
    const { best, k } = bestU(ctx, ctx.cube, score);
    for (let i = 0; i < k; i++) ctx.do('U');
    if (best === 4) return;
    let applied = false;
    for (const front of CYCLE) {
      const sim = ctx.cube.clone();
      mapAlg(BEG.EDGES, front).forEach((t) => sim.move(t));
      if (bestU(ctx, sim, score).best === 4) { ctx.do(BEG.EDGES, front); applied = true; break; }
    }
    if (!applied) ctx.do(BEG.EDGES, 'F');
  }
}

// --- Paso 6: colocar esquinas amarillas (sin importar orientación) ---
function begYellowCornerPos(ctx) {
  const placed = (c) => upCorners(c).filter((p) => eqVec(p.pos, ctx.homePos(Object.values(p.faces))));
  for (let g = 0; g < 10; g++) {
    const ok = placed(ctx.cube);
    if (ok.length === 4) return;
    if (ok.length === 0) { ctx.do(BEG.CORNER_CYCLE, 'F'); continue; }
    const front = slotOfPos(ok[0].pos)[0]; // esa esquina queda en "frente-derecha"
    for (let i = 0; i < 2 && placed(ctx.cube).length < 4; i++) ctx.do(BEG.CORNER_CYCLE, front);
  }
}

// --- Paso 7: orientar esquinas amarillas ---
function begYellowCornerTwist(ctx) {
  const { cube, Y } = ctx;
  for (let i = 0; i < 4; i++) {
    for (let g = 0; g < 6 && cube.at(1, 1, 1).faces.py !== Y; g++) ctx.do(BEG.CORNER_TWIST);
    ctx.do('U');
  }
  for (let i = 0; i < 4 && !cube.isSolved(); i++) ctx.do('U');
}

function beginnerPipeline(ctx) {
  ctx.stage('1. Cruz blanca', () => begCross(ctx));
  ctx.stage('2. Esquinas blancas (primera capa)', () => begCorners(ctx));
  ctx.stage('3. Segunda capa', () => begMiddle(ctx));
  ctx.stage('4. Cruz amarilla', () => begYellowCross(ctx));
  ctx.stage('5. Posicionar aristas amarillas', () => begYellowEdges(ctx));
  ctx.stage('6. Posicionar esquinas amarillas', () => begYellowCornerPos(ctx));
  ctx.stage('7. Orientar esquinas amarillas', () => begYellowCornerTwist(ctx));
}

// ============================================================================
// 5. CFOP
// ============================================================================

// ---- 5.1 Tablas de transición para piezas "rastreadas" (cruz y F2L) ----
const MOVES18 = [];
for (const f of FACE_LIST) {
  for (const s of ['', "'", '2']) {
    const p = parseToken(f + s);
    MOVES18.push({ face: f, token: f + s, axis: p.axis, layer: p.layer, q: p.q });
  }
}
const FACE_OF_MOVE = MOVES18.map((m) => m.face);
const MOVE_INDEX = Object.fromEntries(MOVES18.map((m, i) => [m.token, i]));

function buildStateSpace(isCorner) {
  const pos = [], key = [], ids = new Map();
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
    const nz = [x, y, z].filter((v) => v !== 0).length;
    if (nz !== (isCorner ? 3 : 2)) continue;
    for (let a = 0; a < 3; a++) {
      const p = [x, y, z];
      if (p[a] === 0) continue;
      const v = [0, 0, 0]; v[a] = p[a];
      const k = vecToKey(v);
      ids.set(p.join() + '|' + k, pos.length);
      pos.push(p); key.push(k);
    }
  }
  const next = new Uint8Array(18 * 24);
  MOVES18.forEach((m, mi) => {
    for (let id = 0; id < pos.length; id++) {
      let p2 = pos[id], k2 = key[id];
      if (pos[id][AXIS_INDEX[m.axis]] === m.layer) {
        p2 = rotVec(p2, m.axis, m.q);
        k2 = vecToKey(rotVec(KEY_VEC[k2], m.axis, m.q));
      }
      next[mi * 24 + id] = ids.get(p2.join() + '|' + k2);
    }
  });
  const up = Uint8Array.from(pos, (p) => (p[1] === 1 ? 1 : 0));
  return { pos, key, ids, next, up };
}
const CS = buildStateSpace(true);
const ES = buildStateSpace(false);
const SPACES = [CS, ES]; // tipo 0 = esquina, 1 = arista

/** Estado actual y objetivo de una pieza (identificada por sus colores). */
function track(ctx, cube, colors, ref) {
  const piece = cube.find(colors);
  const type = colors.length === 3 ? 0 : 1;
  const sp = SPACES[type];
  const s = sp.ids.get(piece.pos.join() + '|' + keyOf(piece, ref));
  const g = sp.ids.get(ctx.homePos(colors).join() + '|' + FACE_KEY[ctx.faceOfColor[ref]]);
  return { type, s, g };
}

function ida({ types, start, goal, moves, h, goalFn, maxDepth }) {
  const n = types.length;
  const NEXT = [CS.next, ES.next];
  const buf = Array.from({ length: maxDepth + 2 }, () => new Uint8Array(n));
  const path = [];
  buf[0].set(start);
  const isGoal = goalFn || ((s) => { for (let i = 0; i < n; i++) if (s[i] !== goal[i]) return false; return true; });
  let limit = 0;
  const dfs = (d, last) => {
    const s = buf[d];
    if (isGoal(s)) { path.length = d; return true; }
    if (d === limit) return false;
    if (h && d + h(s) > limit) return false;
    const t = buf[d + 1];
    for (const m of moves) {
      const f = FACE_OF_MOVE[m];
      if (f === last) continue;
      for (let i = 0; i < n; i++) t[i] = NEXT[types[i]][m * 24 + s[i]];
      path[d] = m;
      if (dfs(d + 1, f)) return true;
    }
    return false;
  };
  for (limit = 0; limit <= maxDepth; limit++) if (dfs(0, null)) return path.map((m) => MOVES18[m].token);
  return null;
}

const movesOfFaces = (faces) => faces.flatMap((f) => ["", "'", '2'].map((s) => MOVE_INDEX[f + s]));

// ---- 5.2 Cruz: BFS óptimo sobre las 4 aristas ----
function cfopCross(ctx) {
  const { cube, W } = ctx;
  const tr = ctx.sideColors.map((c) => track(ctx, cube, [W, c], W));
  const enc = (a) => ((a[0] * 24 + a[1]) * 24 + a[2]) * 24 + a[3];
  const start = tr.map((t) => t.s), goal = tr.map((t) => t.g);
  const N = 24 ** 4;
  const parent = new Int32Array(N).fill(-1);
  const pmove = new Int8Array(N);
  const sId = enc(start), gId = enc(goal);
  parent[sId] = sId;
  const queue = new Int32Array(N);
  let qh = 0, qt = 0;
  queue[qt++] = sId;
  while (qh < qt && parent[gId] === -1) {
    const cur = queue[qh++];
    const a = [(cur / 13824) | 0, ((cur / 576) | 0) % 24, ((cur / 24) | 0) % 24, cur % 24];
    for (let m = 0; m < 18; m++) {
      const b = enc([ES.next[m * 24 + a[0]], ES.next[m * 24 + a[1]], ES.next[m * 24 + a[2]], ES.next[m * 24 + a[3]]]);
      if (parent[b] === -1) { parent[b] = cur; pmove[b] = m; queue[qt++] = b; }
    }
  }
  const sol = [];
  for (let c = gId; c !== sId; c = parent[c]) sol.push(MOVES18[pmove[c]].token);
  ctx.do(sol.reverse());
}

// ---- 5.3 F2L: extracción + inserción por búsqueda restringida a la ranura ----
function pairDistTable(moves, gc, ge) {
  const dist = new Int8Array(576).fill(-1);
  const q = [gc * 24 + ge];
  dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = (q[i] / 24) | 0, e = q[i] % 24;
    for (const m of moves) {
      const s2 = CS.next[m * 24 + c] * 24 + ES.next[m * 24 + e];
      if (dist[s2] < 0) { dist[s2] = dist[q[i]] + 1; q.push(s2); }
    }
  }
  return dist;
}

function makePair(ctx, fA, fB) {
  const A = ctx.centers[fA], B = ctx.centers[fB];
  return { fA, fB, cc: [ctx.W, A, B], ec: [A, B], A, B };
}

function planPair(ctx, pair, solvedPairs) {
  const W = ctx.W;
  const sim = ctx.cube.clone();
  const tokens = [];
  const tc = [...addVec(FACE_VEC[pair.fA], FACE_VEC[pair.fB])]; tc[1] = -1;
  const te = addVec(FACE_VEC[pair.fA], FACE_VEC[pair.fB]);

  const preserved = () => {
    const list = ctx.sideColors.map((c) => track(ctx, sim, [W, c], W));
    for (const p of solvedPairs) { list.push(track(ctx, sim, p.cc, W)); list.push(track(ctx, sim, p.ec, p.A)); }
    return list;
  };

  for (let guard = 0; guard < 8; guard++) {
    const corner = sim.find(pair.cc), edge = sim.find(pair.ec);
    if (ctx.pieceSolved(corner) && ctx.pieceSolved(edge)) return tokens;
    const cScope = corner.pos[1] === 1 || eqVec(corner.pos, tc);
    const eScope = edge.pos[1] === 1 || eqVec(edge.pos, te);
    let sol;
    if (cScope && eScope) {
      const tracked = [track(ctx, sim, pair.cc, W), track(ctx, sim, pair.ec, pair.A), ...preserved()];
      const types = tracked.map((t) => t.type);
      const moves = movesOfFaces(['U', pair.fA, pair.fB]);
      const dist = pairDistTable(moves, tracked[0].g, tracked[1].g);
      sol = ida({
        types, start: tracked.map((t) => t.s), goal: tracked.map((t) => t.g), moves, maxDepth: 15,
        h: (s) => { const d = dist[s[0] * 24 + s[1]]; return d < 0 ? 99 : d; },
      });
    } else {
      const out = !cScope ? corner : edge;
      const outTr = !cScope ? track(ctx, sim, pair.cc, W) : track(ctx, sim, pair.ec, pair.A);
      const tracked = [outTr, ...preserved()];
      const types = tracked.map((t) => t.type);
      const faces = ['U', out.pos[0] > 0 ? 'R' : 'L', out.pos[2] > 0 ? 'F' : 'B'];
      const up = SPACES[outTr.type].up;
      sol = ida({
        types, start: tracked.map((t) => t.s), goal: tracked.map((t) => t.g), maxDepth: 7,
        moves: movesOfFaces(faces),
        goalFn: (s) => {
          if (!up[s[0]]) return false;
          for (let i = 1; i < tracked.length; i++) if (s[i] !== tracked[i].g) return false;
          return true;
        },
      });
    }
    if (!sol) throw new Error('F2L: no se encontró solución para el par ' + pair.A + '/' + pair.B);
    sim.run(sol);
    tokens.push(...sol);
  }
  throw new Error('F2L: demasiadas iteraciones');
}

function cfopF2L(ctx) {
  const pairs = SLOTS.map(([fr, rt]) => makePair(ctx, fr, rt));
  const isDone = (p) => ctx.pieceSolved(ctx.cube.find(p.cc)) && ctx.pieceSolved(ctx.cube.find(p.ec));
  const solvedPairs = pairs.filter(isDone);
  let remaining = pairs.filter((p) => !isDone(p));
  let n = 1;
  while (remaining.length) {
    let best = null;
    for (const p of remaining) {
      const tokens = planPair(ctx, p, solvedPairs);
      if (!best || tokens.length < best.tokens.length) best = { p, tokens };
    }
    ctx.stage(`F2L ${n++} (${best.p.A}-${best.p.B})`, () => ctx.do(best.tokens));
    solvedPairs.push(best.p);
    remaining = remaining.filter((x) => x !== best.p);
  }
}

// ---- 5.4 OLL y PLL: tablas de algoritmos con reconocimiento por simulación ----
const OLL_ALGS = {
  'OLL 1': "R U2 R2 F R F' U2 R' F R F'",
  'OLL 2': "F R U R' U' F' f R U R' U' f'",
  'OLL 3': "f R U R' U' f' U' F R U R' U' F'",
  'OLL 4': "f R U R' U' f' U F R U R' U' F'",
  'OLL 5': "r' U2 R U R' U r",
  'OLL 6': "r U2 R' U' R U' r'",
  'OLL 7': "r U R' U R U2 r'",
  'OLL 8': "r' U' R U' R' U2 r",
  'OLL 9': "R U R' U' R' F R2 U R' U' F'",
  'OLL 10': "R U R' U R' F R F' R U2 R'",
  'OLL 11': "r U R' U R' F R F' R U2 r'",
  'OLL 12': "F R U R' U' F' U F R U R' U' F'",
  'OLL 13': "F U R U2 R' U' R U R' F'",
  'OLL 14': "R' F R U R' F' R F U' F'",
  'OLL 15': "r' U' r R' U' R U r' U r",
  'OLL 16': "r U r' R U R' U' r U' r'",
  'OLL 17': "R U R' U R' F R F' U2 R' F R F'",
  'OLL 18': "r U R' U R U2 r2 U' R U' R' U2 r",
  'OLL 19': "r' R U R U R' U' r R2 F R F'",
  'OLL 20': "r U R' U' M2 U R U' R' U' M'",
  'OLL 21': "R U2 R' U' R U R' U' R U' R'",
  'OLL 22': "R U2 R2 U' R2 U' R2 U2 R",
  'OLL 23': "R2 D' R U2 R' D R U2 R",
  'OLL 24': "r U R' U' r' F R F'",
  'OLL 25': "F' r U R' U' r' F R",
  'OLL 26': "R U2 R' U' R U' R'",
  'OLL 27': "R U R' U R U2 R'",
  'OLL 28': "r U R' U' r' R U R U' R'",
  'OLL 29': "R U R' U' R U' R' F' U' F R U R'",
  'OLL 30': "F R' F R2 U' R' U' R U R' F2",
  'OLL 31': "R' U' F U R U' R' F' R",
  'OLL 32': "R U B' U' R' U R B R'",
  'OLL 33': "R U R' U' R' F R F'",
  'OLL 34': "R U R2 U' R' F R U R U' F'",
  'OLL 35': "R U2 R2 F R F' R U2 R'",
  'OLL 36': "R' U' R U' R' U R U R B' R' B",
  'OLL 37': "F R' F' R U R U' R'",
  'OLL 38': "R U R' U R U' R' U' R' F R F'",
  'OLL 39': "R U R' F' U' F U R U2 R'",
  'OLL 40': "R' F R U R' U' F' U R",
  'OLL 41': "R U R' U R U2 R' F R U R' U' F'",
  'OLL 42': "R' U' R U' R' U2 R F R U R' U' F'",
  'OLL 43': "R' U' F' U F R",
  'OLL 44': "F U R U' R' F'",
  'OLL 45': "F R U R' U' F'",
  'OLL 46': "R' U' R' F R F' U R",
  'OLL 47': "R' U' R' F R F' R' F R F' U R",
  'OLL 48': "F R U R' U' R U R' U' F'",
  'OLL 49': "r U' r2 U r2 U r2 U' r",
  'OLL 50': "r' U r2 U' r2 U' r2 U r'",
  'OLL 51': "F U R U' R' U R U' R' F'",
  'OLL 52': "R U R' U R U' B U' B' R'",
  'OLL 53': "r' U' R U' R' U R U' R' U2 r",
  'OLL 54': "r U R' U R U' R' U R U2 r'",
  'OLL 55': "R U2 R2 U' R U' R' U2 F R F'",
  'OLL 56': "r U r' U R U' R' U R U' R' r U' r'",
  'OLL 57': "R U R' U' M' U R U' r'",
};

const PLL_ALGS = {
  'Aa': "R' F R' B2 R F' R' B2 R2",
  'Ab': "R2 B2 R F R' B2 R F' R",
  'E': "R B' R' F R B R' F' R B R' F R B' R' F'",
  'F': "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
  'Ga': "R2 U R' U R' U' R U' R2 D U' R' U R D'",
  'Gb': "R' U' R U D' R2 U R' U R U' R U' R2 D",
  'Gc': "R2 U' R U' R U R' U R2 D' U R U' R' D",
  'Gd': "R U R' U' D R2 U' R U' R' U R' U R2 D'",
  'H': "M2 U M2 U2 M2 U M2",
  'Ja': "R' U L' U2 R U' R' U2 R L",
  'Jb': "R U R' F' R U R' U' R' F R2 U' R'",
  'Na': "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
  'Nb': "R' U R U' R' F' U' F R U R' F R' F' R U' R",
  'Ra': "R U' R' U' R U R D R' U' R D' R' U2 R'",
  'Rb': "R2 F R U R U' R' F' R U2 R' U2 R",
  'T': "R U R' U' R' F R2 U' R' U' R U R' F'",
  'Ua': "R U' R U R U R U' R' U' R2",
  'Ub': "R2 U R U R' U' R' U' R' U R'",
  'V': "R' U R' U' R D' R' D R' U D' R2 U' R2 D R2",
  'Y': "F R U' R' U' R U R' F' R U R' U' R' F R F'",
  'Z': "M' U M2 U M2 U M' U2 M2",
};

/** Cubo canónico resuelto: cada pegatina lleva la letra de su cara como "color". */
function canonicalCube() {
  const pieces = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
    if (!x && !y && !z) continue;
    const faces = {};
    [[x, 'x'], [y, 'y'], [z, 'z']].forEach(([v, a]) => {
      if (v) { const k = (v > 0 ? 'p' : 'n') + a; faces[k] = KEY_FACE[k]; }
    });
    pieces.push({ position: [x, y, z], faces });
  }
  return new Cube(pieces);
}

const lastLayerPieces = (cube) =>
  cube.p.filter((p) => p.pos[1] === 1 && Object.keys(p.faces).length >= 2)
    .sort((a, b) => a.pos[0] - b.pos[0] || a.pos[2] - b.pos[2]);
const ollSig = (cube, top) => lastLayerPieces(cube).map((p) => keyOf(p, top)).join(',');
const pllSig = (cube, c2f) => lastLayerPieces(cube)
  .map((p) => Object.keys(p.faces).sort().map((k) => k + ':' + c2f[p.faces[k]]).join('')).join('|');

/** Comprueba que el algoritmo solo toca la última capa (la F2L y los centros quedan intactos). */
function preservesF2L(alg) {
  const c = canonicalCube();
  c.run(alg);
  return c.p.every((p) => p.pos[1] === 1 ? true : Object.entries(p.faces).every(([k, col]) => KEY_FACE[k] === col))
    && c.p.filter((p) => p.pos[1] === 1).every((p) => Object.keys(p.faces).length !== 1 || p.faces.py === 'U');
}

let TABLES = null;
function getTables() {
  if (TABLES) return TABLES;
  const oll = new Map(), pll = new Map();
  const skipped = [];
  const solvedC = canonicalCube();
  for (const [name, alg] of Object.entries(OLL_ALGS)) {
    if (!preservesF2L(alg)) { skipped.push(name); continue; }
    const inv = invertAlg(alg);
    for (let a = 0; a < 4; a++) {
      const c = solvedC.clone();
      c.run(inv);
      for (let i = 0; i < (4 - a) % 4; i++) c.move('U');
      const sig = ollSig(c, 'U');
      if (!oll.has(sig)) oll.set(sig, { name, alg, pre: a });
    }
  }
  const ident = Object.fromEntries(FACE_LIST.map((f) => [f, f]));
  for (const [name, alg] of Object.entries(PLL_ALGS)) {
    if (!preservesF2L(alg)) { skipped.push(name); continue; }
    const probe = canonicalCube().run(alg);
    if (ollSig(probe, 'U') !== 'py,py,py,py,py,py,py,py') { skipped.push(name); continue; }
    const inv = invertAlg(alg);
    for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) {
      const c = solvedC.clone();
      for (let i = 0; i < (4 - b) % 4; i++) c.move('U');
      c.run(inv);
      for (let i = 0; i < (4 - a) % 4; i++) c.move('U');
      const sig = pllSig(c, ident);
      if (!pll.has(sig)) pll.set(sig, { name, alg, pre: a });
    }
  }
  TABLES = { oll, pll, skipped };
  return TABLES;
}
export function _debugTables() { return getTables(); }

function cfopOLL(ctx) {
  const { oll } = getTables();
  const done = 'py,py,py,py,py,py,py,py';
  const sig = ollSig(ctx.cube, ctx.Y);
  if (sig === done) return 'OLL saltado';
  const e = oll.get(sig);
  if (!e) throw new Error('Caso OLL no encontrado: ' + sig);
  for (let i = 0; i < e.pre; i++) ctx.do('U');
  ctx.do(e.alg);
  if (ollSig(ctx.cube, ctx.Y) !== done) throw new Error('OLL falló: ' + e.name);
  return e.name;
}

function cfopPLL(ctx) {
  const { pll } = getTables();
  let name = 'PLL saltado';
  if (!ctx.cube.isSolved()) {
    const e = pll.get(pllSig(ctx.cube, ctx.faceOfColor));
    if (e) { for (let i = 0; i < e.pre; i++) ctx.do('U'); ctx.do(e.alg); name = e.name; }
    else {
      // puede estar resuelto salvo un AUF
      let ok = false;
      for (let i = 0; i < 4 && !ok; i++) { if (ctx.cube.isSolved()) ok = true; else ctx.do('U'); }
      if (!ok) throw new Error('Caso PLL no encontrado');
    }
  }
  for (let i = 0; i < 4 && !ctx.cube.isSolved(); i++) ctx.do('U'); // AUF final
  return name;
}

function cfopPipeline(ctx) {
  ctx.stage('Cruz', () => cfopCross(ctx));
  cfopF2L(ctx);
  let oll, pll;
  ctx.stage('OLL', () => { oll = cfopOLL(ctx); });
  ctx.stages[ctx.stages.length - 1].name = `OLL (${oll})`;
  ctx.stage('PLL', () => { pll = cfopPLL(ctx); });
  ctx.stages[ctx.stages.length - 1].name = `PLL (${pll})`;
}

// ============================================================================
// 6. API PÚBLICA
// ============================================================================
function run(pieces, pipeline, method, opts = {}) {
  const crossColor = opts.crossColor || 'white';
  const rv = findFrame(pieces, crossColor);
  const cube = new Cube(pieces);
  cube.rotateAll(rv.axis, rv.q);
  const ctx = new Ctx(cube, rv, crossColor);
  if (!cube.isSolved()) pipeline(ctx);
  if (!ctx.cube.isSolved()) throw new Error('El solver no llegó al estado resuelto (¿estado de cubo inválido?)');
  const real = (arr) => arr.map((t) => toRealToken(t, rv));
  const stages = ctx.stages.map((s) => ({ name: s.name, moves: real(s.moves) }));
  const moves = real(ctx.moves);
  return { method, moves, stages, moveCount: moves.length };
}

/** Método de principiantes (capa por capa). `pieces` = getCubeState(). */
export function solveBeginner(pieces, opts) { return run(pieces, beginnerPipeline, 'principiantes', opts); }
/** CFOP: Cross, F2L, OLL, PLL. `pieces` = getCubeState(). */
export function solveCFOP(pieces, opts) { return run(pieces, cfopPipeline, 'CFOP', opts); }

/** Aplica movimientos (notación estándar) a una copia de `pieces`; devuelve las piezas resultantes. */
export function applyMoves(pieces, moves) {
  const c = new Cube(pieces);
  c.run(moves);
  return c.p.map((p) => ({ position: p.pos, faces: p.faces }));
}
