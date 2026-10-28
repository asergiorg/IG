import * as THREE from "three";

// ---- Texturas de la Tierra ----
import urlMap from "url:../textures/earthmap1k.jpg";
import urlBump from "url:../textures/earthbump1k.jpg";
import urlSpec from "url:../textures/earthspec1k.jpg";
import urlCloud from "url:../textures/earthcloudmap.jpg";
import urlAlpha from "url:../textures/earthcloudmaptrans_invert.jpg";

// ---- Resto de texturas ----
import urlSun from "url:../textures/sun.jpg";
import urlMercury from "url:../textures/mercury.jpg";
import urlVenus from "url:../textures/venus.jpg";
import urlMoon from "url:../textures/moon.jpg";
import urlMars from "url:../textures/mars.jpg";
import urlJupiter from "url:../textures/jupiter.jpg";
import urlSaturn from "url:../textures/saturn.jpg";
import urlSaturnRing from "url:../textures/saturn_ring.png";
import urlUranus from "url:../textures/uranus.jpg";
import urlNeptune from "url:../textures/neptune.jpg";
import urlStars from "url:../textures/stars.jpg";

// ---- Texturas de lunas ----
import urlIo from "url:../textures/io.jpg";
import urlEuropa from "url:../textures/europa.jpg";

let space;
let loader;
const objects = []; // cuerpos que giran sobre su eje
const orbits = []; // pivotes que giran alrededor de otro cuerpo

export function createSolarSystem(scene) {
  space = scene;
  loader = new THREE.TextureLoader();

  // ---- Fondo de estrellas ----
  const background = loadUrl(urlStars);
  background.mapping = THREE.EquirectangularReflectionMapping;
  space.background = background;

  // ---- Luces ----
  // Luz puntual en el Sol
  space.add(new THREE.PointLight(0xffffff, 3, 0, 0));
  space.add(new THREE.AmbientLight(0xffffff, 0.15));

  // ---- SOL ----
  const sol = new THREE.Mesh(
    new THREE.SphereGeometry(6, 48, 48),
    new THREE.MeshBasicMaterial({ map: loadUrl(urlSun) })
  );
  space.add(sol);
  objects.push({ mesh: sol, spin: 0.002 });

  // ---- PLANETAS ----
  createPlanet({ radius: 0.5, distance: 10, orbitSpeed: 0.02, spin: 0.004, map: loadUrl(urlMercury) });
  createPlanet({ radius: 0.95, distance: 14, orbitSpeed: 0.015, spin: -0.002, map: loadUrl(urlVenus) });

  // TIERRA + LUNA
  const earth = createPlanet({
    radius: 1,
    distance: 19,
    orbitSpeed: 0.01,
    spin: 0.01,
    map: loadUrl(urlMap),
    bump: loader.load(urlBump),
    spec: loader.load(urlSpec),
  });

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.03, 40, 40),
    new THREE.MeshPhongMaterial({
      map: loadUrl(urlCloud),
      alphaMap: loader.load(urlAlpha),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  earth.mesh.add(clouds);

  addSateliteTo(earth, { radius: 0.27, distance: 2.2, orbitSpeed: 0.04, map: loadUrl(urlMoon)  })

  // MARTE + FOBOS y DEIMOS
  const mars = createPlanet({ radius: 0.6, distance: 25, orbitSpeed: 0.008, spin: 0.009, map: loadUrl(urlMars) });
  addSateliteTo(mars, { radius: 0.1, distance: 1.1, orbitSpeed: 0.09, color: 0x8a7b6b }); // Fobos
  addSateliteTo(mars, { radius: 0.07, distance: 1.6, orbitSpeed: 0.05, color: 0x9b8d7c }); // Deimos

  // JÚPITER + ÍO y EUROPA
  const jupiter = createPlanet({ radius: 3, distance: 37, orbitSpeed: 0.004, spin: 0.02, map: loadUrl(urlJupiter) });
  addSateliteTo(jupiter, { radius: 0.3, distance: 4.2, orbitSpeed: 0.03, map: loadUrl(urlIo) });
  addSateliteTo(jupiter, { radius: 0.27, distance: 5.3, orbitSpeed: 0.02, map: loadUrl(urlEuropa) });

  // SATURNO con anillos
  const saturn = createPlanet({
    radius: 2.5,
    distance: 50,
    orbitSpeed: 0.003,
    spin: 0.018,
    map: loadUrl(urlSaturn),
  });
  const ring = createRing(3.2, 5.5, loadUrl(urlSaturnRing));
  ring.rotation.x = -Math.PI / 2 + 0.45;
  saturn.group.add(ring);

  // URANO + TITANIA y OBERÓN
  const uranus = createPlanet({ radius: 1.6, distance: 62, orbitSpeed: 0.002, spin: 0.012, map: loadUrl(urlUranus) });
  addSateliteTo(uranus, { radius: 0.25, distance: 2.9, orbitSpeed: 0.02, color: 0x9a9690 }); // Titania
  addSateliteTo(uranus, { radius: 0.23, distance: 3.7, orbitSpeed: 0.015, color: 0x857f78 }); // Oberón

  // NEPTUNO + TRITÓN (orbita en sentido contrario, por eso velocidad negativa)
  const neptune = createPlanet({ radius: 1.55, distance: 72, orbitSpeed: 0.0016, spin: 0.012, map: loadUrl(urlNeptune) });
  addSateliteTo(neptune, { radius: 0.3, distance: 3.0, orbitSpeed: -0.025, color: 0xd8c9c0 });
}

export function renderSolarSystem() {
  for (const o of objects) o.mesh.rotation.y += o.spin;
  for (const o of orbits) o.pivot.rotation.y += o.speed;
}

// ---------------------------------------------------------------
// Funciones auxiliares
// ---------------------------------------------------------------

function loadUrl(url) {
  const t = loader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createPlanet({ radius, distance, orbitSpeed, spin, map, bump, spec }) {
  const pivot = new THREE.Object3D();
  space.add(pivot);

  const group = new THREE.Object3D();
  group.position.x = distance;
  pivot.add(group);

  const material = new THREE.MeshPhongMaterial({ map: map });
  if (bump) {
    material.bumpMap = bump;
    material.bumpScale = 0.05;
  }
  if (spec) {
    material.specularMap = spec;
    material.specular = new THREE.Color("grey");
  }

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 40), material);
  group.add(mesh);

  // Línea de la órbita
  const orbit = new THREE.Mesh(
    new THREE.RingGeometry(distance - 0.04, distance + 0.04, 128),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
  );
  orbit.rotation.x = -Math.PI / 2;
  space.add(orbit);

  objects.push({ mesh, spin });
  orbits.push({ pivot, speed: orbitSpeed });

  return { pivot, group, mesh };
}

function createRing(interior, external, texture) {
  const geometry = new THREE.RingGeometry(interior, external, 128);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const vector = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    vector.fromBufferAttribute(position, i);
    uv.setXY(i, (vector.length() - interior) / (external - interior), 1);
  }
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

function addSateliteTo(planet, { radius, distance, orbitSpeed, map, color = 0xffffff } ) {
  const moonPivot = new THREE.Object3D();
  planet.group.add(moonPivot);

  const material = new THREE.MeshPhongMaterial(map ? { map: map } : { color: color });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), material);

  moon.position.set(distance, 0, 0);
  moonPivot.add(moon);
  orbits.push({ pivot: moonPivot, speed: orbitSpeed });
}