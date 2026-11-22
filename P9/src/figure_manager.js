import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

import { getCubeState } from './position_manager'

const SIZE = 1;
const GAP = 0.05;
const STEP = SIZE + GAP;

const FACE_ORDER = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

const COLORS = {
  red: 0xb71234,
  orange: 0xff5800,
  white: 0xffffff,
  yellow: 0xffd500,
  blue: 0x0046ad,
  green: 0x009b48,
};
const INNER_COLOR = 0x111111;

export const cubeGroup = new THREE.Group();
export const cubies = [];

export function createCube() {
  const pieces = getCubeState();
  pieces.forEach((piece) => {
    const mesh = createPiece(piece);
    cubeGroup.add(mesh);
    cubies.push(mesh);
  });
  return cubeGroup;
}

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

export function rotateLayer(axis, layer, dir = 1, duration = 400) {
  const pivot = new THREE.Group();
  cubeGroup.add(pivot);

  const selected = cubies.filter(
    (c) => Math.round(c.userData.grid[axis]) === layer
  );
  selected.forEach((c) => pivot.attach(c));

  return new Promise((resolve) => {
    new TWEEN.Tween({ angle: 0 })
      .to({ angle: dir * Math.PI / 2 }, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(({ angle }) => {
        console.log("angle", angle);
        pivot.rotation[axis] = angle;
      })
      .onComplete(() => {
        console.log("complete");
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
        resolve();
      })
      .start();
  });
}

export function animateCube() { TWEEN.update(); }