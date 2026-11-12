import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { createMap, createLights } from "./map_drawer.js";
import { createBus } from "./bus_drawer.js";
import { loadDropData } from "./drop_data.js";
import { createPlayerDrops } from "./player_drops.js";

let scene;
let renderer;
let camera;
let controls;

let info;

let map;
let bus;
let playerDrops;

const clock = new THREE.Clock();

init();
animationLoop();

async function init() {
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
  info.innerHTML = "Fortnite OG";
  document.getElementById("app").appendChild(info);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1E3F59);

  camera = new THREE.PerspectiveCamera( 60, 800 / 600, 0.1, 3000 );
  camera.position.set( 0, 45, 95 );

  const canvas = document.getElementById("miCanvas");
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(800, 600, false);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.05;

  createLights(scene);

  try {
    map = await createMap( scene, { renderer } );

    bus = await createBus(
      scene,
      {
        renderer,
        mapa: map,
        vuelo: true,
        altitud: 25,
        size: 8,
        velocidad: 8
      }
    );

    const players = await loadDropData();

    playerDrops = createPlayerDrops( scene, map, players );
    playerDrops.start(bus);

  } catch (err) {
    console.error(err);

    info.style.color = "#ff8080";
    info.innerHTML = "Error: " + err.message;
  }
}

function animationLoop() {
  requestAnimationFrame( animationLoop );

  const delta = clock.getDelta();

  if (bus) { bus.update(delta); }
  if (playerDrops) { playerDrops.update(delta); }

  controls.update();

  renderer.render(scene, camera);
}