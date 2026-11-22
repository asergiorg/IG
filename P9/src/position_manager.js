const pieces = [
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

export function getCubeState() { return pieces; }