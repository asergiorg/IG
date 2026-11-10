import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Nombres de material tal y como aparecen en bus.obj (no trae .mtl).
const MAT_25 = "bus1910_bus_bus17_bus1910_bus_Material__25";
const MAT_26 = "bus1910_bus_bus17_bus1910_bus_Material__26";

const DEFFECTS = {
  // Rutas relativas a ESTE archivo. Se pueden cambiar desde index.
  objUrl: new URL("../models/battle-bus/source/bus.obj", import.meta.url).href,

  texturas: {
    [MAT_25]: {
      map: new URL("../models/battle-bus/textures/bus17_bus1910_bus_Material__25_BaseColor.png", import.meta.url).href,
      normalMap: new URL("../models/battle-bus/textures/bus17_bus1910_bus_Material__25_Normal.png", import.meta.url).href,
      metalnessMap: new URL("../models/battle-bus/textures/bus17_bus1910_bus_Material__25_Metallic.png", import.meta.url).href,
      roughnessMap: new URL("../models/battle-bus/textures/bus17_bus1910_bus_Material__25_Roughness.png", import.meta.url).href,
    },
    [MAT_26]: {
      map: new URL("../models/battle-bus/textures/bus17_bus1910_bus_Material__26_BaseColor.png", import.meta.url).href,
      normalMap: new URL("../models/battle-bus/textures/bus17_bus1910_bus_Material__26_Normal.png", import.meta.url).href,
      metalnessMap: new URL("../models/battle-bus/textures/bus17_bus1910_bus_Material__26_Metallic.png", import.meta.url).href,
      roughnessMap: new URL("../models/battle-bus/textures/bus17_bus1910_bus_Material__26_Roughness.png", import.meta.url).href,
    },
  },

  // El OBJ incluye una esfera de fondo de ~718 unidades (material __35) que no es parte del bus.
  hideMaterials: ["bus1910_Material__35"],

  size: 8,            // lado más largo del bus, en unidades de escena (el mapa mide 100 de ancho)
  rotationY: 0,       // giro en radianes para orientar el morro (el modelo mira a +Z por defecto)

  mapa: null,         // objeto devuelto por createMap (para seguir el relieve)
  altitud: 25,        // altura sobre el terreno (con `mapa`) o sobre y=0 (sin él)

  // ── Vuelo aleatorio ──
  // Llama a bus.update(delta) en cada frame. Con vuelo:false el bus queda quieto
  // en `position` (THREE.Vector3 o [x,y,z]) o en `pixel` ([px,py] de la imagen del mapa).
  vuelo: true,
  velocidad: 8,         // unidades de escena por segundo
  curvatura: 0.15,      // 0 = recta; 0.15 = curva suave (fracción de la longitud de la ruta)
  margen: 12,           // distancia extra fuera del borde del mapa donde nace/desaparece
  suavizadoAltura: 2,   // más alto = sigue el terreno con más rapidez
  area: { width: 100, height: 100 }, // solo se usa si no pasas `mapa`
  random: Math.random,  // inyectable (p. ej. un generador con semilla)
  position: null,
  pixel: null,

  maxTextureSize: 2048, // las texturas originales son de 4096²; 4096 = calidad completa
  flipNormalY: false,   // true si el relieve del bus se ve hundido en vez de elevado
  envIntensity: 1,
  anisotropia: 8,
  renderer: null,       // necesario para los reflejos metálicos y la anisotropía
};

export async function createBus(scene, opciones = {}) {
  const o = { ...DEFFECTS, ...opciones };

  const anisotropy = o.renderer ? o.renderer.capabilities.getMaxAnisotropy() : o.anisotropia;
  const maxTex = o.renderer
    ? Math.min(o.maxTextureSize, o.renderer.capabilities.maxTextureSize)
    : o.maxTextureSize;

  const [model, textures] = await Promise.all([
    new OBJLoader().loadAsync(o.objUrl).catch(() => {
      throw new Error(`No se pudo cargar el modelo "${o.objUrl}".`);
    }),
    loadTextureSets(o.texturas, maxTex, anisotropy),
  ]);

  // Sin entorno que reflejar, los materiales metálicos se ven negros: creamos uno
  // solo para el bus (así no cambia la iluminación del mapa).
  let envMap = null;
  if (o.renderer) {
    const pmrem = new THREE.PMREMGenerator(o.renderer);
    const room = new RoomEnvironment();
    envMap = pmrem.fromScene(room, 0.04).texture;
    room.dispose?.();
    pmrem.dispose();
  }

  applyMaterials(model, makeMaterialFactory(textures, envMap, o));

  // Centrar el modelo en su caja visible (sin la esfera) y escalarlo.
  const box = visibleBox(model);
  const center = box.getCenter(new THREE.Vector3());
  const rawSize = box.getSize(new THREE.Vector3());
  model.position.sub(center);

  const scale = o.size / Math.max(rawSize.x, rawSize.y, rawSize.z);
  const group = new THREE.Group();
  group.name = "bus";
  group.add(model);
  group.scale.setScalar(scale);
  group.rotation.y = o.rotationY;
  scene.add(group);

  // ───────────── Vuelo aleatorio ─────────────
  const area = o.mapa ? { width: o.mapa.width, height: o.mapa.height } : o.area;
  const targetY = (x, z) => (o.mapa ? o.mapa.heightIn(x, z) : 0) + o.altitud;
  let curve = null;
  let routeLength = 1;
  let progress = 0;

  // Genera una ruta nueva: nace en un punto aleatorio fuera del mapa y acaba en el lado
  // opuesto (con desvío aleatorio), de modo que siempre cruza el mapa.
  function newRoute() {
    const rnd = o.random;
    const radius = 0.5 * Math.hypot(area.width, area.height) + o.margen;
    const a = rnd() * Math.PI * 2;
    const b = a + Math.PI + (rnd() - 0.5); // ±0.5 rad respecto al lado opuesto
    const start = new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    const end = new THREE.Vector3(Math.cos(b) * radius, 0, Math.sin(b) * radius);

    const dir = end.clone().sub(start);
    const chord = dir.length();
    dir.divideScalar(chord);
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.addScaledVector(side, (rnd() * 2 - 1) * o.curvatura * chord); // curva lateral

    curve = new THREE.CatmullRomCurve3([start, mid, end], false, "centripetal");
    routeLength = curve.getLength();
    progress = 0;
    place(0, true);
  }

  function place(delta, snap = false) {
    const p = curve.getPointAt(Math.min(progress, 1)); // avance a velocidad constante
    const t = curve.getTangentAt(Math.min(progress, 1));
    group.position.x = p.x;
    group.position.z = p.z;
    const y = targetY(p.x, p.z);
    group.position.y = snap
      ? y
      : group.position.y + (y - group.position.y) * (1 - Math.exp(-o.suavizadoAltura * delta));
    group.rotation.y = Math.atan2(t.x, t.z) + o.rotationY; // el morro (+Z) mira hacia donde avanza
  }

  function update(delta) {
    if (!o.vuelo) return;
    delta = Math.min(delta, 0.1); // evita saltos al volver de una pestaña inactiva
    progress += (o.velocidad * delta) / routeLength;
    if (progress >= 1) newRoute();
    else place(delta);
  }

  if (o.vuelo) {
    newRoute();
  } else if (o.position) {
    group.position.fromArray(Array.isArray(o.position) ? o.position : o.position.toArray());
  } else if (o.mapa && o.pixel) {
    o.mapa.pixelToScene(o.pixel[0], o.pixel[1], o.altitud, group.position);
  } else {
    group.position.set(0, o.altitud, 0);
  }

  function dispose() {
    scene.remove(group);
    group.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry.dispose();
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
    });
    for (const set of textures.values()) Object.values(set).forEach((t) => t.dispose());
    envMap?.dispose();
  }

  return {
    group,
    model,
    size: rawSize.multiplyScalar(scale),
    update,
    dispose,
  };
}

async function loadTextureSets(sets, maxSize, anisotropy) {
  const result = new Map();
  // Un material cada vez para no disparar el pico de memoria (cada textura es de 4096²).
  for (const [name, files] of Object.entries(sets)) {
    try {
      const [map, normalMap, metalnessMap, roughnessMap] = await Promise.all([
        loadTexture(files.map, true, maxSize, anisotropy),
        loadTexture(files.normalMap, false, maxSize, anisotropy),
        loadTexture(files.metalnessMap, false, maxSize, anisotropy),
        loadTexture(files.roughnessMap, false, maxSize, anisotropy),
      ]);
      result.set(name, { map, normalMap, metalnessMap, roughnessMap });
    } catch (err) {
      // Sin texturas el bus se sigue viendo (en gris) en vez de no aparecer.
      console.warn(`Texturas omitidas para "${name}":`, err.message);
    }
  }
  return result;
}

async function loadTexture(url, isColor, maxSize, anisotropy) {
  const tex = await new THREE.TextureLoader().loadAsync(url).catch(() => {
    throw new Error(`No se pudo cargar la textura "${url}".`);
  });

  const img = tex.image;
  if (Math.max(img.width, img.height) > maxSize) {
    const s = maxSize / Math.max(img.width, img.height);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, c.width, c.height);
    tex.image = c;
  }

  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

// nombre de material → MeshStandardMaterial (con caché)
function makeMaterialFactory(textures, envMap, o) {
  const cache = new Map();
  return (name) => {
    if (cache.has(name)) return cache.get(name);
    const tex = textures.get(name);
    const material = new THREE.MeshStandardMaterial({
      name,
      side: THREE.DoubleSide,
      color: tex ? 0xffffff : 0x9aa0a6,
      roughness: tex ? 1 : 0.6,
      // sin envMap un metal puro se vería negro
      metalness: tex ? (envMap ? 1 : 0.3) : 0.1,
      envMap,
      envMapIntensity: o.envIntensity,
      ...tex,
    });
    if (tex && o.flipNormalY) material.normalScale.set(1, -1);
    if (o.hideMaterials.includes(name)) material.visible = false;
    cache.set(name, material);
    return material;
  };
}

// Sustituye los materiales por defecto del OBJLoader (uno por `usemtl`).
function applyMaterials(root, materialFor) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const swap = (m) => materialFor(m.name);
    obj.material = Array.isArray(obj.material) ? obj.material.map(swap) : swap(obj.material);
  });
}

// Caja contenedora usando solo los materiales visibles (ignora la esfera de fondo).
function visibleBox(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const pos = obj.geometry.attributes.position;
    const index = obj.geometry.index;
    const total = index ? index.count : pos.count;
    let ranges;
    if (Array.isArray(obj.material) && obj.geometry.groups.length) {
      ranges = obj.geometry.groups.filter((g) => obj.material[g.materialIndex].visible);
    } else {
      ranges = obj.material.visible === false ? [] : [{ start: 0, count: total }];
    }
    for (const g of ranges) {
      const end = Math.min(g.start + g.count, total);
      for (let i = g.start; i < end; i++) {
        v.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(obj.matrixWorld);
        box.expandByPoint(v);
      }
    }
  });
  return box;
}