import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createSolarSystem, renderSolarSystem } from "./solar_system.js";
import { initKeyboardControls, updateKeyboardControls } from "./keyboard_controls.js";
import { write } from "./ui-logic.js";
import { getNextData } from "./planets_info.js";

let scene, renderer, camera, controls, keyboard;
let info;
const clock = new THREE.Clock();

init();
animationLoop();

function init() {
  info = document.createElement("div");
  info.style.position = "absolute";
  info.style.top = "30px";
  info.style.width = "100%";
  info.style.textAlign = "center";
  info.style.color = "#fff";
  info.style.fontWeight = "bold";
  info.style.backgroundColor = "transparent";
  info.style.zIndex = "8";
  info.style.fontFamily = "Monospace";
  info.innerHTML = "three.js - sistema solar";
  document.getElementById("app").appendChild(info);

  // Escena y cámara
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 3000);
  camera.position.set(0, 45, 95);

  // Renderizador vinculado al canvas
  const canvas = document.getElementById("miCanvas");
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(800, 600, false);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  initKeyboardControls(camera, controls, {
    speed: 40,
    turnSpeed: 1.2,
    onSpace: () => {
      let data = getNextData();
      data = data["planet"] + "<br>" + data["fact"];
      write(data);
    },
  });

  // Todo el dibujo del sistema solar está en sistemaSolar.js
  createSolarSystem(scene);
}

// Bucle de animación
function animationLoop() {
  requestAnimationFrame(animationLoop);

  const delta = clock.getDelta();

  renderSolarSystem();
  updateKeyboardControls(delta);
  controls.update();
  renderer.render(scene, camera);
}