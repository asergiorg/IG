import * as THREE from "three";
import { vertexShader, planeFragmentShader } from "./shader_manager";

let objects = [];
const targetMouse = new THREE.Vector2(0.5, 0.5);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

let uniforms = {
  u_time: { value: 0.0 },
  u_planeAspect: { value: 1.0 },
  u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
};

export function planeShader(width, height) {
  uniforms.u_planeAspect.value = width / height;

  const geometry = new THREE.PlaneGeometry(width / 2, height / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    fragmentShader: planeFragmentShader(),
    vertexShader: vertexShader(),
  });

  const mesh = new THREE.Mesh(geometry, material);
  objects.push(mesh);
  return mesh;
}

export function setupMouse(camera) {
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0 && intersects[0].uv) {
      targetMouse.copy(intersects[0].uv);
    }
  });

  document.addEventListener("mouseleave", () => {
    targetMouse.set(0.5, 0.5);
  });
}

export function animate() {
  const delta = clock.getDelta();
  uniforms.u_time.value += delta;

  const smoothness = 5.0;
  const lerpFactor = 1.0 - Math.exp(-smoothness * delta);
  uniforms.u_mouse.value.lerp(targetMouse, lerpFactor);
}

export function onWindowResize(renderer, camera) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}