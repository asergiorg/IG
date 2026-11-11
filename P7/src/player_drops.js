import * as THREE from "three";

const DEFAULTS = {
  height: -3,
  speed: 12,
  size: 0.4,
  color: 0xffcc00,
};

export function createPlayerDrops(scene, map, players, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const drops = [];

  let bus = null;
  let previousProgress = 0;

  for (const data of players) {

    const destination = map.pixelToScene( data.pixel[0], data.pixel[1], 0);
    const geometry = new THREE.SphereGeometry( o.size, 12, 12 );
    const material = new THREE.MeshStandardMaterial({ color: o.color, });
    const mesh = new THREE.Mesh( geometry, material );
    mesh.visible = false;

    scene.add(mesh);

    drops.push({
      id: data.id,
      mesh,
      destination: destination.clone(),
      state: "waiting",
      jumpAt: null,
      elapsed: 0,
      startPosition: new THREE.Vector3(),
      startHeight: 0,
    });
  }

  function start(busObject) {
    if (!busObject) {
      console.error( "PLAYER DROPS: start() recibió un bus inválido" );
      return;
    }

    bus = busObject;

    console.log("=== INICIANDO SALTOS ===");

    const currentProgress = bus.getProgress();
    previousProgress = currentProgress;

    console.log( "Progreso inicial del autobús:", currentProgress );

    for (const drop of drops) {

      drop.state = "waiting";
      drop.elapsed = 0;
      drop.jumpAt = bus.getProgressAtPosition( drop.destination );

      console.log(
        `Jugador ${drop.id}:`,
        "destino =",
        drop.destination,
        "jumpAt =",
        drop.jumpAt
      );

      const busPosition = bus.getPosition();

      drop.startPosition.copy( busPosition );
      drop.startPosition.y += o.height;
      drop.mesh.position.copy( drop.startPosition );
      drop.mesh.visible = true;
    }
  }

  function update(delta) {
    if (!bus) { return; }

    const currentProgress = bus.getProgress();
    if (currentProgress < previousProgress) { resetForNewRoute(); }
    previousProgress = currentProgress;

    for (const drop of drops) {
      if (drop.state === "waiting") {

        const busPosition =bus.getPosition();

        drop.mesh.position.copy( busPosition );
        drop.mesh.position.y += o.height;

        if (drop.jumpAt === null) { continue; }

        if ( currentProgress >= drop.jumpAt ) {
          console.log(
            `Jugador ${drop.id} SALTA:`,
            `bus=${currentProgress.toFixed(3)}`,
            `objetivo=${drop.jumpAt.toFixed(3)}`
          );

          beginFall(drop);
        }
      }

      else if (drop.state === "falling") { updateFall(drop, delta); }
    }
  }

  function beginFall(drop) {
    drop.state = "falling";
    drop.elapsed = 0;
    drop.startPosition.copy( drop.mesh.position );
    drop.startHeight = drop.startPosition.y;
  }

  function updateFall(drop, delta) {
    drop.elapsed += delta;

    const distance = drop.startHeight - drop.destination.y;
    const duration = Math.max( distance / o.speed, 0.5 );
    const t = THREE.MathUtils.clamp( drop.elapsed / duration, 0, 1 );

    drop.mesh.position.x = THREE.MathUtils.lerp( drop.startPosition.x, drop.destination.x, t );
    drop.mesh.position.z = THREE.MathUtils.lerp( drop.startPosition.z, drop.destination.z, t );
    drop.mesh.position.y = THREE.MathUtils.lerp( drop.startHeight, drop.destination.y, t);

    if (t >= 1) {
      drop.state = "landed";
      drop.mesh.position.copy( drop.destination );

      console.log( `Jugador ${drop.id} HA ATERRIZADO` );
    }
  }

  function resetForNewRoute() {
    console.log("=== NUEVA RUTA DEL AUTOBÚS ===");

    const currentProgress = bus.getProgress();

    for (const drop of drops) {
      drop.state = "waiting";
      drop.elapsed = 0;

      // Calcular dónde debe saltar usando la NUEVA ruta
      drop.jumpAt = bus.getProgressAtPosition( drop.destination );

      const busPosition = bus.getPosition();

      drop.mesh.position.copy(busPosition );
      drop.mesh.position.y +=o.height;
      drop.mesh.visible = true;

      console.log(
        `Jugador ${drop.id}: nuevo jumpAt =`,
        drop.jumpAt
      );
    }

    previousProgress = currentProgress;
  }

  function dispose() {
    for (const drop of drops) {
      scene.remove(drop.mesh);

      drop.mesh.geometry.dispose();
      drop.mesh.material.dispose();
    }
  }

  return { start, update, dispose, drops };
}