import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createMap, createLights } from "./map_drawer.js";

let scene, renderer, camera, controls;
let info;
let mapa; 

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
  info.innerHTML = "three.js - mapa Fortnite";
  document.getElementById("app").appendChild(info);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b4b7a);
  camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 3000);
  camera.position.set(0, 45, 95);

  const canvas = document.getElementById("miCanvas");
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(800, 600, false);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.05;

  createLights(scene);
  createMap(scene, { renderer })
    .then((m) => {
      mapa = m;
      info.innerHTML = "Mapa Fortnite";
    })
    .catch((err) => {
      console.error(err);
      info.style.color = "#ff8080";
      info.innerHTML = "Error al crear el mapa: " + err.message;
    });
}

// Bucle de animación
function animationLoop() {
  requestAnimationFrame(animationLoop);

  controls.update();
  renderer.render(scene, camera);
}