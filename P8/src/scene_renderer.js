import * as THREE from "three";
import { vertexShader, dropletFragmentShader, planeFragmentShader } from "./shader_manager";

let objects = [];
let scene;

let uniforms = {
    u_time: {
        type: "f",
        value: 0.0,
    },
    u_resolution: {
        type: "v2",
        value: new THREE.Vector2(),
    },
    u_mouse: {
        type: "v2",
        value: new THREE.Vector2(),
    },
};

export function initializeRendererWith(referenceScene) {
    scene = referenceScene;
}

export function dropletShader(position, radio, segements) {
  let geometry = new THREE.SphereGeometry(radio, segements.horizontal, segements.vertical);
  let material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    fragmentShader: dropletFragmentShader(),
    vertexShader: vertexShader(),
  });

  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  scene.add(mesh);
  objects.push(mesh);
}

export function planeShader(width, height) {
  let geometry = new THREE.PlaneGeometry(width / 2, height / 2);
  let material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    fragmentShader: planeFragmentShader(),
    vertexShader: vertexShader(),
  });

  let mesh = new THREE.Mesh(geometry, material);
  mesh.geometry.rotateX(- Math.PI / 2);
  scene.add(mesh);
  objects.push(mesh);
}

export function animate() {
    //Incrementa tiempo
    uniforms.u_time.value += 0.05;
}

export function onWindowResize(renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.u_resolution.value.x = renderer.domElement.width;
    uniforms.u_resolution.value.y = renderer.domElement.height;
}