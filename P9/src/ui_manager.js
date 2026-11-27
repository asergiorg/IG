import GUI from 'lil-gui';
import { solveBeginnerMethod, solveCFOPMethod, scrambleCube } from './cube_controller';

let busy = false;
async function execute(fn) {
  if (busy) return;
  busy = true;
  try { await fn(); } finally { busy = false; }
}

const params = {
  method: 'Principiante',
  speed: 2,
  resolve() {
    const opts = { duration: 800 / params.speed, pause: 0 };
    execute(() =>
      params.method === 'Principiante'
        ? solveBeginnerMethod(opts)
        : solveCFOPMethod(opts)
    );
  },
  desordenar() {
    execute(() => scrambleCube(20, { duration: 800 / params.speed }));
  }
};

export function initInterface() {
  const gui = new GUI({ title: 'Controles' });
  gui.add(params, 'method', ['Principiante', 'CFOP']).name('Método');
  gui.add(params, 'speed', 0.1, 10, 0.1).name('Velocidad');
  gui.add(params, 'resolve').name('Resolver');
  gui.add(params, 'desordenar').name('Desordenar');
}