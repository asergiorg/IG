import * as THREE from "three";
import { rotateLayer } from "./cube";

const AXES = ["x", "y", "z"];
const UNIT = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

export function setupCubeInput({ camera, domElement, controls, cubies }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let drag = null;
  let busy = false;

  // Sube por el árbol hasta encontrar el cubie (el que tiene userData.grid)
  const findCubie = (obj) => {
    while (obj && !obj.userData.grid) obj = obj.parent;
    return obj;
  };

  // Punto 3D -> píxeles (con y hacia abajo, igual que clientY)
  const toScreen = (v) => {
    const p = v.clone().project(camera);
    const r = domElement.getBoundingClientRect();
    return new THREE.Vector2(((p.x + 1) / 2) * r.width, ((1 - p.y) / 2) * r.height);
  };

  function onPointerDown(e) {
    if (busy || e.target !== domElement) return;

    const r = domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObjects(cubies, true)[0];
    if (!hit) return;

    const cubie = findCubie(hit.object);
    if (!cubie) return;

    // Normal de la cara en coordenadas de mundo
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const nAxis = AXES.reduce((a, b) => (Math.abs(n[a]) > Math.abs(n[b]) ? a : b));
    const normal = UNIT[nAxis].clone().multiplyScalar(Math.sign(n[nAxis]));

    controls.enabled = false; // el gesto es nuestro
    drag = {
      x0: e.clientX,
      y0: e.clientY,
      point: hit.point.clone(),
      cubie,
      nAxis,
      normal,
    };
  }

  async function onPointerMove(e) {
    if (!drag || busy) return;

    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    if (Math.hypot(dx, dy) < 12) return; // umbral para evitar giros accidentales

    const dragVec = new THREE.Vector2(dx, dy);
    const origin = toScreen(drag.point);

    // Elegir el eje tangente cuya proyección en pantalla coincide más con el arrastre
    let best = null;
    for (const t of AXES.filter((a) => a !== drag.nAxis)) {
      const sv = toScreen(drag.point.clone().add(UNIT[t])).sub(origin);
      const dot = sv.dot(dragVec);
      if (!best || Math.abs(dot) > Math.abs(best.dot)) best = { t, dot };
    }

    const rotAxis = AXES.find((a) => a !== drag.nAxis && a !== best.t);
    const layer = Math.round(drag.cubie.userData.grid[rotAxis]);

    // Dirección del arrastre en mundo y sentido del giro (regla de la mano derecha)
    const dWorld = UNIT[best.t].clone().multiplyScalar(Math.sign(best.dot));
    const dir = Math.sign(dWorld.dot(UNIT[rotAxis].clone().cross(drag.normal)));

    drag = null;
    busy = true;
    try {
      await rotateLayer(rotAxis, layer, dir);
    } catch (err) {
      console.error("rotateLayer falló:", err);
    } finally {
      busy = false;
    }
  }

  function onPointerUp() {
    drag = null;
    controls.enabled = true;
  }

  // capture:true en window -> se ejecuta ANTES que el listener de OrbitControls
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}