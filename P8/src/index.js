import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { planeShader, setupMouse, animate, onWindowResize } from "./object_renderer";

let scene, renderer, camera, camcontrols;

init();
animationLoop();

function init() {
  const info = document.createElement("div");
  info.style.position = "absolute";
  info.style.top = "30px";
  info.style.left = "0";
  info.style.width = "100%";
  info.style.textAlign = "center";
  info.style.color = "#fff";
  info.style.fontWeight = "bold";
  info.style.backgroundColor = "transparent";
  info.style.zIndex = "8";
  info.style.fontFamily = "Monospace";
  info.style.pointerEvents = "none";
  info.innerHTML = "Ángel Sergio Reyes Guedes";

  document.body.appendChild(info);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 15);

  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene.add(planeShader(100, 100));

  camcontrols = new OrbitControls(camera, renderer.domElement);
  setupMouse(camera);

  onWindowResize(renderer, camera);
  window.addEventListener("resize", () => onWindowResize(renderer, camera), false);
}

function animationLoop() {
  requestAnimationFrame(animationLoop);
  camcontrols.update();
  animate();
  renderer.render(scene, camera);
}