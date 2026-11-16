import * as THREE from "three";

let objects = [];

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

function vertexShader() {
  return `
          varying vec3 vUv; 
          varying vec4 modelViewPosition; 
        
          void main() {
              vUv = position; 
              vec4 modelViewPosition = modelViewMatrix * vec4(vUv, 1.0);
              gl_Position = projectionMatrix * modelViewPosition; 
          }
          `;
}

export function dropletShader(position, radio, segements, scene, uniforms) {
  let geometry = new THREE.SphereGeometry(radio, segements.horizontal, segements.vertical);
  let material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    fragmentShader: fragmentShader_01(),
    vertexShader: vertexShader(),
  });

  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  scene.add(mesh);
  objects.push(mesh);
}

export function animate(){
    //Incrementa tiempo
    uniforms.u_time.value += 0.05;

    //Modifica rotación de todos los objetos presentes
    for (let object of objects) {
        object.rotation.y += 0.01;
    }
}

export function onWindowResize(renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.u_resolution.value.x = renderer.domElement.width;
    uniforms.u_resolution.value.y = renderer.domElement.height;
}

function fragmentShader_01() {
  return `
         void main() {
         gl_FragColor = vec4(0.831,0.567,1.000,1.000);
         }
         `;
}