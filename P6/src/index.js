import * as THREE from "three";

const getSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight
});

const renderer = new THREE.WebGLRenderer({
  antialising: true,
  alpha: false,
  canvas: undefined
});

const { width, height } = getSize();

const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
const scene = new THREE.Scene();
const ambientLight = new THREE.AmbientLight(0x0000ff, 0.4);
const geometry = new THREE.BoxBufferGeometry();
const material = new THREE.MeshLambertMaterial();
const mesh = new THREE.Mesh(geometry, material);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
camera.position.z = 5;

scene.add(ambientLight, mesh);

const update = () => {
  mesh.rotation.x += Math.sin(0.01);
  mesh.rotation.y += Math.sin(0.001);

  renderer.render(scene, camera);
  requestAnimationFrame(update);
};

requestAnimationFrame(update);

global.document.getElementById("app").appendChild(renderer.domElement);
