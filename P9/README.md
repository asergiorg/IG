# Trabajo realizado

Esta práctica consiste en un prototipo de una app web que permite a sus usuarios manejar un cubo de Rubik. Esta puede ser usada para resolver el cubo o aprender a resolverlo, ya que se han implementado, mediante Inteligencia Artificial, dos resoluciones para el cubo, la implementación para principiantes, que posee una menor cantidad de algoritmos que memorizar para la resolución, y una versión algo más compleja, llamada CFOP, que permite reducir el tiempo de resolución del cubo a costa de tener que memorizar una mayor cantidad de algoritmos.

Para el desarrollo de esta práctica se ha dividido la lógica en diferentes ficheros para mejorar la legibilidad y la calidad del código, resultando en la siguiente estructura:

```text
P9
├── index.html
├── README.md
├── src
│   ├── cube_controller.js
│   ├── cube_input.js
│   ├── cube.js
│   ├── index.js
│   ├── position_manager.js
│   ├── rubik_solver.js
│   └── ui_manager.js
└── styles.css
```

De estos ficheros, los siguientes fueron desarrollados con Inteligencia Artificial, por lo que no se explicarán de forma detallada en este documento, a excepción de alguna función que sea relevante: `cube_controller.js`, `rubik_solver.js` y `cube_input.js`.

Con el fin de obtener una explicación más clara, se va a dividir el proceso de desarrollo de la aplicación en 3 fases, que serán:
- **Dibujado del cubo.**
- **Manejo interactivo del cubo.**
- **Interfaz gráfica para el control del cubo.**

## 1. Dibujado del cubo

En esta fase intervienen dos ficheros, que son `cube.js` y `position_manager.js`. El primero se encarga de dibujar el cubo y aplicar las rotaciones pertinentes tras cada movimiento; y el segundo almacena la información correspondiente a la orientación de los 26 cubos que componen el cubo de Rubik.

### Fichero `cube.js`

En primer lugar, se lee el estado inicial del cubo y se crea el cubo (con la función `createCube`), que es la colección de los 26 cubos, a los que se llamará piezas para evitar confusiones, generados a partir de la función `createPiece`. Con esta función se mapean las caras de cada pieza para asignarles un color, se coloca en la posición correspondiente y se añade a la malla que permite al usuario rotar las capas del cubo.

```javascript
function createPiece({ position, faces }) {
  const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);

  const materials = FACE_ORDER.map((face) =>
    new THREE.MeshBasicMaterial({
      color: faces[face] !== undefined ? COLORS[faces[face]] : INNER_COLOR,
    })
  );

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.position.set(position[0] * STEP, position[1] * STEP, position[2] * STEP);

  mesh.userData.grid = new THREE.Vector3(...position);
  return mesh;
}
```

En segundo lugar, la función más compleja es `rotateLayer` que aplica las rotaciones a cada capa del cubo, conteniendo, por tanto, la sección con los tween. En esta, se crea un nuevo grupo, que corresponderá a la capa que rota del cubo. Una vez añadidas las piezas, se rota esta capa en la dirección especificada (horaria o antihoraria), y con la finalización de esta acción se reasignan las piezas al grupo principal, se redondean sus coordenadas visuales para evitar errores de coma flotante y se llama a `applyMove` para actualizar el estado lógico en `position_manager.js`.

```javascript
export function rotateLayer(axis, layer, dir = 1, duration = 400) {
  const pivot = new THREE.Group();
  cubeGroup.add(pivot);

  const selected = cubies.filter(
    (c) => Math.round(c.userData.grid[axis]) === layer
  );
  selected.forEach((c) => pivot.attach(c));

  return new Promise((resolve) => {
    const tween = new TWEEN.Tween({ angle: 0 })
      .to({ angle: dir * Math.PI / 2 }, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(({ angle }) => {
        pivot.rotation[axis] = angle;
      })
      .onComplete(() => {
        pivot.updateMatrixWorld(true);
        selected.forEach((c) => {
          cubeGroup.attach(c);
          c.userData.grid.set(
            Math.round(c.position.x / STEP),
            Math.round(c.position.y / STEP),
            Math.round(c.position.z / STEP)
          );
          c.position.set(
            c.userData.grid.x * STEP,
            c.userData.grid.y * STEP,
            c.userData.grid.z * STEP
          );
        });
        cubeGroup.remove(pivot);
        tweenGroup.remove(tween);

        applyMove(axis, layer, dir);

        resolve();
      });

    tweenGroup.add(tween);
    tween.start();
  });
}
```

Por último, en cada frame se refresca la posición del cubo, avanzando las interpolaciones activas del grupo:

```javascript
export function animateCube() { tweenGroup.update(); }
```

### Fichero `position_manager.js`

Este fichero se usa por los ficheros que calculan los algoritmos de resolución del cubo, por lo que la función más destacable es `getCubeState`, ya que sin ella no tendría sentido la existencia de este. Esta se limita a devolver una copia profunda del array que contiene las posiciones:

```javascript
export function getCubeState() {
  return structuredClone(pieces);
}
```

El objeto que se retorna es una copia de la copia del array de objetos de Javascript que contiene el estado inicial del cubo. Este se define para la primera representación del cubo, y se escogió este formato para representarlo ya que simplifica la información y permite aplicar las transformaciones correspondientes de forma sencilla.

```javascript
const INITIAL_PIECES = [
  // esquinas
  { position: [1, 1, 1],    faces: { px: 'red', py: 'white', pz: 'blue' } },
  { position: [1, 1, -1],   faces: { px: 'red', py: 'white', nz: 'green' } },
  { position: [1, -1, 1],   faces: { px: 'red', ny: 'yellow', pz: 'blue' } },
  { position: [1, -1, -1],  faces: { px: 'red', ny: 'yellow', nz: 'green' } },
  { position: [-1, 1, 1],   faces: { nx: 'orange', py: 'white', pz: 'blue' } },
  { position: [-1, -1, 1],  faces: { nx: 'orange', ny: 'yellow', pz: 'blue' } },
  { position: [-1, 1, -1],  faces: { nx: 'orange', py: 'white', nz: 'green' } },
  { position: [-1, -1, -1], faces: { nx: 'orange', ny: 'yellow', nz: 'green' } },
  // aristas
  { position: [1, 1, 0],   faces: { px: 'red', py: 'white' } },
  { position: [1, -1, 0],  faces: { px: 'red', ny: 'yellow' } },
  { position: [1, 0, 1],   faces: { px: 'red', pz: 'blue' } },
  { position: [1, 0, -1],  faces: { px: 'red', nz: 'green' } },
  { position: [-1, 1, 0],  faces: { nx: 'orange', py: 'white' } },
  { position: [-1, 0, 1],  faces: { nx: 'orange', pz: 'blue' } },
  { position: [-1, 0, -1], faces: { nx: 'orange', nz: 'green' } },
  { position: [-1, -1, 0], faces: { nx: 'orange', ny: 'yellow' } },
  { position: [0, 1, 1],   faces: { py: 'white', pz: 'blue' } },
  { position: [0, 1, -1],  faces: { py: 'white', nz: 'green' } },
  { position: [0, -1, 1],  faces: { ny: 'yellow', pz: 'blue' } },
  { position: [0, -1, -1], faces: { ny: 'yellow', nz: 'green' } },
  // centros
  { position: [0, 1, 0],  faces: { py: 'white' } },
  { position: [0, -1, 0], faces: { ny: 'yellow' } },
  { position: [1, 0, 0],  faces: { px: 'red' } },
  { position: [-1, 0, 0], faces: { nx: 'orange' } },
  { position: [0, 0, 1],  faces: { pz: 'blue' } },
  { position: [0, 0, -1], faces: { nz: 'green' } },
]

let pieces = structuredClone(INITIAL_PIECES);
```

Previo a las funciones que transforman la orientación de las piezas y, en consecuencia, del cubo, se definen tres constantes que serán importantes para estas. En primer lugar, `AXIS_INDEX`, que simplifica la traducción del eje al índice al que corresponde el eje en que se va a elegir la capa a rotar. En segundo lugar, `FACE_DIRS`, que especifica las orientaciones positivas y negativas de las capas del cubo. Y, por último, `faceKeyOf`, que es una función lambda que, dado un vector, retorna la orientación a la que corresponde a partir de `FACE_DIRS`.

```javascript
const AXIS_INDEX = { x: 0, y: 1, z: 2 };

const FACE_DIRS = {
  px: [1, 0, 0], nx: [-1, 0, 0],
  py: [0, 1, 0], ny: [0, -1, 0],
  pz: [0, 0, 1], nz: [0, 0, -1],
};

const faceKeyOf = (vector) =>
  Object.keys(FACE_DIRS).find((k) => FACE_DIRS[k].every((n, i) => n === vector[i]));
```

Por último, para actualizar las orientaciones de las piezas tras cada movimiento se usa `applyMove`, que para cada pieza de la capa rotada, actualiza la posición y el color correspondiente a cada cara de la pieza en función del signo de la dirección. Para aplicar los cambios se utiliza una función auxiliar llamada `rotateVec`, que retorna el vector transformado para simplificar la lógica.

```javascript
export function applyMove(axis, layer, dir) {
  const d = Math.sign(dir);
  const idx = AXIS_INDEX[axis];

  pieces.forEach((piece) => {
    if (piece.position[idx] !== layer) return;

    piece.position = rotateVec(piece.position, axis, d);

    const newFaces = {};
    for (const [face, color] of Object.entries(piece.faces)) {
      newFaces[faceKeyOf(rotateVec(FACE_DIRS[face], axis, d))] = color;
    }
    piece.faces = newFaces;
  });
}

function rotateVec([x, y, z], axis, dir) {
  let r;
  if (dir > 0) {
    if (axis === 'x') r = [x, -z, y];
    else if (axis === 'y') r = [z, y, -x];
    else r = [-y, x, z];
  } else {
    if (axis === 'x') r = [x, z, -y];
    else if (axis === 'y') r = [-z, y, x];
    else r = [y, -x, z];
  }
  return r.map((n) => n + 0);
}
```

## 2. Manejo interactivo del cubo

Este apartado se desarrolló principalmente con Inteligencia Artificial, ya que consta únicamente de un fichero, `cube_input.js`. En este fichero se manejan los eventos de la pulsación, movimiento y la liberación del ratón. A partir de los dos primeros eventos se determina la dirección del movimiento que se debe aplicar sobre el cubo. Para ello, se tienen en cuenta también las rotaciones de la cámara. En este punto, cobra principal relevancia la malla que se añadió a cada pieza individual del cubo, ya que gracias a esta se identifica el cubo sobre el que se está picando, y esto complementado con el movimiento del ratón permite aplicar la rotación sobre la capa en la que sea posible.

### Demostración

https://github.com/user-attachments/assets/a2e3c723-9fd7-4fd9-a6c6-728827828378

## 3. Interfaz gráfica

Como opción adicional, y en busca de una aplicación más lúdica, se ha añadido una interfaz gráfica con la que el usuario puede deshacer el cubo, y resolverlo aplicando dos algoritmos de diferente complejidad, manejando la velocidad de resolución para que los usuarios puedan aprender a resolverlo y entender mejor la complejidad de la resolución de cada método.

Para añadir la interfaz gráfica se ha desarrollado el fichero `ui_manager.js`, desde el que se pueden manejar las acciones sobre el cubo con el fichero `cube_controller.js`, que actúa de controlador sobre `rubik_solver.js`.

### Fichero `ui_manager.js`

En este fichero se crea la interfaz gráfica que incluye 4 parámetros, que son el método, la velocidad de los movimientos que se aplican, y dos botones, que son para ejecutar la resolución del cubo y para desordenarlo. Por último, cada vez que se ejecuta un botón se marca como ocupado el cubo para evitar que se realicen acciones que se interrumpan entre sí o resulten en un comportamiento inesperado.

```javascript
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
```

### Fichero `cube_controller.js` y fichero `rubik_solver.js`

Estos dos ficheros fueron creados por la IA. En ellos se calcula la secuencia de movimientos necesarios para poder resolver el cubo. El primero conecta el cubo creado con el segundo fichero, enviándole información sobre el estado del cubo y aplicando la secuencia de movimientos que calcula el segundo script. El segundo actúa únicamente como resolver, retornando la secuencia de movimientos en función del algoritmo para una posición determinada.

### Demostraciones

#### Deshacer el cubo

https://github.com/user-attachments/assets/40264564-c66e-4533-b304-0b1cf3e2d4a3

#### Resolución para principiantes

https://github.com/user-attachments/assets/b436be7c-f95a-47f5-9060-cda54b203a8d

#### Resolución CFOP

https://github.com/user-attachments/assets/f45dbbed-e8da-4f3c-a5c0-7734d1be650a

# Fuentes

## Conversaciones con Inteligencia Artificial

- Para establecer las referencias de colores en el cubo: https://claude.ai/share/55a72669-4ccf-49ea-89e4-22056c167aab

- Para permitir el movimiento del cubo usando el ratón: https://claude.ai/share/1662a94b-b376-44a0-9934-3682a4ad2ba4

- Para conocer los métodos de resolución del cubo de Rubik: https://share.gemini.google/iPGPXdzHy62h

- Para desarrollar los algoritmos de resolución del cubo: https://claude.ai/share/c331dfcf-9f84-4347-a742-5b8dfd8c9ba4
