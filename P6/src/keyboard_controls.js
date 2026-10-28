import * as THREE from "three";

// Estado del módulo
let camera, controls;
let speed = 40;     // unidades por segundo (avance)
let turnSpeed = 1.2; // radianes por segundo (giro)

const keys = { w: false, a: false, s: false, d: false };

// Vectores reutilizables
const forward = new THREE.Vector3();
const offset = new THREE.Vector3();
const move = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function setKey(e, pressed) {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = pressed;
}

function onKeyDown(e) {
  setKey(e, true);
}

function onKeyUp(e) {
  setKey(e, false);
}

export function initKeyboardControls(cam, orbitControls, options = {}) {
  camera = cam;
  controls = orbitControls;
  speed = options.speed ?? speed;
  turnSpeed = options.turnSpeed ?? turnSpeed;

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
}

export function updateKeyboardControls(delta) {
  const { w, a, s, d } = keys;

  // --- Giro sobre uno mismo (A/D) ---
  const turn = (a ? 1 : 0) - (d ? 1 : 0);
  if (turn !== 0) {
    offset.copy(controls.target).sub(camera.position);
    offset.applyAxisAngle(UP, turn * turnSpeed * delta);
    controls.target.copy(camera.position).add(offset);
  }

  // --- Avance / retroceso (W/S) ---
  const advance = (w ? 1 : 0) - (s ? 1 : 0);
  if (advance !== 0) {
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    move.copy(forward).multiplyScalar(advance * speed * delta);
    camera.position.add(move);
    controls.target.add(move);
  }
}

export function disposeKeyboardControls() {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  keys.w = keys.a = keys.s = keys.d = false;
}