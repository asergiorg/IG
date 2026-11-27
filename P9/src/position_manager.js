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

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

const FACE_DIRS = {
  px: [1, 0, 0], nx: [-1, 0, 0],
  py: [0, 1, 0], ny: [0, -1, 0],
  pz: [0, 0, 1], nz: [0, 0, -1],
};

const faceKeyOf = (vector) =>
  Object.keys(FACE_DIRS).find((k) => FACE_DIRS[k].every((n, i) => n === vector[i]));

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

export function getCubeState() {
  return structuredClone(pieces);
}