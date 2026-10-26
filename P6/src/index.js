import * as THREE from "three";
import urlMap from "url:../textures/earthmap1k.jpg";
import urlBump from "url:../textures/earthbump1k.jpg";
import urlSpec from "url:../textures/earthspec1k.jpg";
import urlCloud from "url:../textures/earthcloudmap.jpg";
import urlAlpha from "url:../textures/earthcloudmaptrans_invert.jpg";

let scene, renderer;
let camera;
let info;
let objetos = [];


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
  info.innerHTML = "three.js - sol y planetas";
  document.getElementById("app").appendChild(info); // Mejor añadirlo al contenedor de la app

  //Defino cámara
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    800 / 600, // Usar la relación de aspecto de tu canvas (800x600)
    0.1,
    1000
  );
  camera.position.set(0, 0, 10);

  // Vincular el renderizador a tu canvas de HTML
  const canvas = document.getElementById("miCanvas");
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(800, 600, false);

  const Ldir = new THREE.DirectionalLight(0xcccccc, 1);
  Ldir.position.set(5, 5, 5);
  scene.add(Ldir);
  Ldir.castShadow = true;
  
  const loader = new THREE.TextureLoader();
  const tx1 = loader.load(urlMap);
  const txb1 = loader.load(urlBump);
  const txspec1 = loader.load(urlSpec);
  const tx2 = loader.load(urlCloud);
  const txalpha2 = loader.load(urlAlpha);

  //Objetos
  //Planeta y capa de nubes con transparencia
  Esfera(scene, 0, 0, 0, 2, 40, 40, 0xffffff, tx1, undefined, undefined);
  //Ancestro el planeta apenas creado, movimiento solidario
  Esfera(
    objetos[0],
    0.0,
    0.0,
    0,
    2.1,
    40,
    40,
    0xffffff,
    tx2,
    undefined,
    undefined,
    txalpha2
  );

}

function Esfera(
  padre,
  px,
  py,
  pz,
  radio,
  nx,
  ny,
  col,
  texture = undefined,
  texbump = undefined,
  texspec = undefined,
  texalpha = undefined,
  shadow = false
) {
  let geometry = new THREE.SphereGeometry(radio, nx, ny);
  //Material Phong definiendo color
  let material = new THREE.MeshPhongMaterial({
    color: col,
  });

  //Textura
  if (texture != undefined) {
    material.map = texture;
  }
  //Rugosidad
  if (texbump != undefined) {
    material.bumpMap = texbump;
    material.bumpScale = 1;
  }

  //Especular
  if (texspec != undefined) {
    material.specularMap = texspec;
    material.specular = new THREE.Color("orange");
  }

  //Transparencia
  if (texalpha != undefined) {
    //Con mapa de transparencia
    material.alphaMap = texalpha;
    material.transparent = true;
    material.side = THREE.DoubleSide;
    material.opacity = 1.0;

    //Sin mapa de transparencia
    material.transparent = true;
    material.side = THREE.DoubleSide;
    material.opacity = 0.8;
    material.transparent = true;
    material.depthWrite = false;
  }

  let mesh = new THREE.Mesh(geometry, material);
  if (shadow) mesh.castShadow = true;
  mesh.position.set(px, py, pz);
  padre.add(mesh);
  objetos.push(mesh);
}

//Bucle de animación
function animationLoop() {
  requestAnimationFrame(animationLoop);

  //Modifica rotación de todos los objetos
  for (let object of objetos) {
    object.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}