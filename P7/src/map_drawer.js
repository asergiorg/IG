import * as THREE from "three";

const DEFFECTS = {
  colorMap: new URL("../images/Mapa_fortnite.jpg", import.meta.url).href,
  displacementMap: new URL("../images/Mapa_fortnite_displacement.png", import.meta.url).href,

  width: 100,
  segments: 512,

  seaLevel: 0.42,
  maxLevel: 0.62,
  maxHigh: 2.5,

  normalRelief: 1,
  anisotropia: 8,
  renderer: null,
};

export async function createMap(scene, opciones = {}) {
  const o = { ...DEFFECTS, ...opciones };

  const loader = new THREE.TextureLoader();
  const load = (route) =>
    loader.loadAsync(route).catch(() => {
      throw new Error(
        `No se pudo cargar la imagen "${route}".`
      );
    });
  const [mapColor, displacementMap] = await Promise.all([
    load(o.colorMap),
    load(o.displacementMap),
  ]);

  mapColor.colorSpace = THREE.SRGBColorSpace;
  mapColor.anisotropy = o.renderer
    ? o.renderer.capabilities.getMaxAnisotropy()
    : o.anisotropia;

  displacementMap.colorSpace = THREE.NoColorSpace;

  const imgW = mapColor.image.width;
  const imgH = mapColor.image.height;
  const width = o.width;
  const height = width * (imgH / imgW);

  const reliefScale = 4;
  const reliefSlant = -o.seaLevel * reliefScale;

  const heights = readChannel(displacementMap.image);

  const texNormal = generateNormalMap(
    heights,
    displacementMap.image.width,
    displacementMap.image.height,
    (reliefScale * o.normalRelief) / (width / displacementMap.image.width)
  );

  const segX = o.segments;
  const segY = Math.round(o.segments * (imgH / imgW));
  const geometry = new THREE.PlaneGeometry(width, height, segX, segY);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    map: mapColor,
    displacementMap: displacementMap,
    displacementScale: reliefScale,
    displacementBias: reliefSlant,
    normalMap: texNormal,
    roughness: 1,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "mapa";
  scene.add(mesh);

  const rw = displacementMap.image.width;
  const rh = displacementMap.image.height;

  function heightIn(x, z) {
    const u = THREE.MathUtils.clamp(x / width + 0.5, 0, 1);
    const v = THREE.MathUtils.clamp(0.5 - z / height, 0, 1);
    const fx = u * (rw - 1);
    const fy = (1 - v) * (rh - 1);
    const x0 = Math.floor(fx),
      y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, rw - 1),
      y1 = Math.min(y0 + 1, rh - 1);
    const tx = fx - x0,
      ty = fy - y0;
    const a = heights[y0 * rw + x0],
      b = heights[y0 * rw + x1];
    const c = heights[y1 * rw + x0],
      d = heights[y1 * rw + x1];
    const value = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    return (value - o.seaLevel) * reliefScale;
  }

  function pixelToScene(px, py, elevacion = 0, destination = new THREE.Vector3()) {
    const x = (px / imgW - 0.5) * width;
    const z = (py / imgH - 0.5) * height;
    return destination.set(x, heightIn(x, z) + elevacion, z);
  }

  function dispose() {
    scene.remove(mesh);
    geometry.dispose();
    material.dispose();
    mapColor.dispose();
    displacementMap.dispose();
    texNormal.dispose();
  }

  return {
    mesh,
    width: width,
    height: height,
    imgW,
    imgH,
    heightIn: heightIn,
    pixelToScene: pixelToScene,
    dispose,
  };
}

export function createLights(scene) {
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x556677, 0.8);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(-40, 50, 30);
  scene.add(hemisphere, sun);
  return { hemi: hemisphere, sol: sun };
}

function readChannel(img) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, c.width, c.height).data;
  const out = new Float32Array(c.width * c.height);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4] / 255;
  return out;
}

function generateNormalMap(h, w, hh, k) {
  const data = new Uint8Array(w * hh * 4);
  const at = (x, y) =>
    h[THREE.MathUtils.clamp(y, 0, hh - 1) * w + THREE.MathUtils.clamp(x, 0, w - 1)];

  for (let y = 0; y < hh; y++) {

    const rowTex = hh - 1 - y;
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * k;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5 * k;

      let nx = -dx,
        ny = dy,
        nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const i = (rowTex * w + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, w, hh, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}