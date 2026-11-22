import * as THREE from "three";
import * as TWEEN from '@tweenjs/tween.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { createCube, animateCube, cubies } from "./figure_manager"; // exporta cubies
import { setupCubeInput } from "./cube_input";

let scene, renderer, camcontrols;
let camera;

init();
animationLoop();

function init() {
  //Defino cámara
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 10);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camcontrols = new OrbitControls(camera, renderer.domElement);
  scene.add(createCube());

  setupCubeInput({
    camera,
    domElement: renderer.domElement,
    controls: camcontrols,
    cubies,
  });
}

//Bucle de animación
function animationLoop() {
  requestAnimationFrame(animationLoop);

  TWEEN.update();

  animateCube();
  camcontrols.update();

  renderer.render(scene, camera);
}