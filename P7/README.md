# Trabajo realizado

Para la realización de esta práctica se han desarrollado 4 ficheros fundamentales, además del fichero `index.js`. El fichero `bus_drawer.js` fue realizado íntegramente con IA, a excepción de las funciones que se implementaron para la simulación de datos, por lo que no se hará mención de este, ya que se tiene acceso a la conversación en los enlaces.

En primer lugar, se ha partido del fichero `index.js` de la práctica anterior. En este, se crean las luces, el mapa, el bus de asalto y los jugadores:

~~~javascript
  createLights(scene);

  try {
    mapa = await createMap( scene, { renderer } );

    bus = await createBus(
      scene,
      {
        renderer,
        mapa,
        vuelo: true,
        altitud: 25,
        size: 8,
        velocidad: 8
      }
    );

    const players = await loadDropData();

    playerDrops = createPlayerDrops( scene, mapa, players );
    playerDrops.start(bus);

  }
~~~

Y se actualiza el movimiento del bus de asalto y de los jugadores en el bucle de animación:

~~~javascript
  const delta = clock.getDelta();

  if (bus) { bus.update(delta); }
  if (playerDrops) { playerDrops.update(delta); }
~~~

En segundo lugar, para el desarrollo del fichero `map_drawer.js` se usaron asistentes de IA; no obstante, la plataforma en la que accedía a los agentes se corrompió y no puedo hacer referencia a las conversaciones, por lo que se indicarán las funciones que fueron creadas por los mismos. En este, se define la información básica del mapa, como su tamaño y el acceso a las imágenes. Para generar el mapa de relieve se usó la web en las fuentes, ya que no se pudo encontrar el original para el mapa.

~~~javascript
const PRESETS = {
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
~~~

Una vez definidas las características esenciales del mapa, se desarrolla la función `createMap`, en la que, primeramente, se cargan las imágenes y se calculan los valores necesarios para generar la geometría y el material a partir de los que se genera el objeto `mapa`. Asimismo, también se incluyen dos funciones, generadas con la ayuda de los asistentes, `heightIn`, para retornar la elevación del terreno en las coordenadas `(x, z)`, y `pixelToScene`, que convierte coordenadas de píxel `(px, py)` de la imagen del mapa en coordenadas 3D de la escena, ajustando la coordenada `Y` a la altura del terreno. Esta última se usará más adelante para la implementación del aterrizaje de los jugadores.

~~~javascript
export async function createMap(scene, opciones = {}) {
  const mapInformation = { ...PRESETS, ...opciones };

  const loader = new THREE.TextureLoader();
  const load = (route) =>
    loader.loadAsync(route).catch(() => {
      throw new Error(
        `No se pudo cargar la imagen "${route}".`
      );
    });
  const [mapColor, displacementMap] = await Promise.all([
    load(mapInformation.colorMap),
    load(mapInformation.displacementMap),
  ]);

  mapColor.colorSpace = THREE.SRGBColorSpace;
  mapColor.anisotropy = mapInformation.renderer
    ? mapInformation.renderer.capabilities.getMaxAnisotropy()
    : mapInformation.anisotropia;

  displacementMap.colorSpace = THREE.NoColorSpace;

  const imgW = mapColor.image.width;
  const imgH = mapColor.image.height;
  const width = mapInformation.width;
  const height = width * (imgH / imgW);

  const reliefScale = 4;
  const reliefSlant = -mapInformation.seaLevel * reliefScale;

  const heights = readChannel(displacementMap.image);

  const texNormal = generateNormalMap(
    heights,
    displacementMap.image.width,
    displacementMap.image.height,
    (reliefScale * mapInformation.normalRelief) / (width / displacementMap.image.width)
  );

  const segX = mapInformation.segments;
  const segY = Math.round(mapInformation.segments * (imgH / imgW));
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
    return (value - mapInformation.seaLevel) * reliefScale;
  }

  function pixelToScene(px, py, elevacion = 0, destination = new THREE.Vector3()) {
    const x = (px / imgW - 0.5) * width;
    const z = (py / imgH - 0.5) * height;
    return destination.set(x, heightIn(x, z) + elevacion, z);
  }

  return {
    mesh,
    width: width,
    height: height,
    imgW,
    imgH,
    heightIn: heightIn,
    pixelToScene: pixelToScene,
  };
}
~~~

Asimismo, este fichero también contiene la función `createLights`, que permite crear las luces de la escena, con las que se genera una luz ambiente, en el hemisferio, y una luz direccional, que sería el sol, añadiéndolas a la escena.

~~~javascript
export function createLights(scene) {
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x556677, 0.8);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(-40, 50, 30);
  scene.add(hemisphere, sun);
}
~~~

Al final del fichero, se añadieron dos funciones auxiliares, `readChannel` y `generateNormalMap`, generadas mediante el asistente de inteligencia artificial. La primera permite dibujar la imagen sobre un canvas oculto para extraer los valores de la altura, mientras que la segunda usa los valores devueltos por la primera para calcular las normales de la superficie.

~~~javascript
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
~~~

En tercer lugar, el fichero `drop_data.js`, con el que se verifica que el contenido del fichero de datos `drops.json` tenga el formato correcto y los atributos esperados:

~~~javascript
export function loadDropData() {
  if (!Array.isArray(dropsData.players)) {
    throw new Error(
      "El fichero drops.json debe contener un array 'players'."
    );
  }

  for (const player of dropsData.players) {
    if (
      typeof player.id === "undefined" ||
      !Array.isArray(player.pixel) ||
      player.pixel.length !== 2
    ) {
      throw new Error(
        "Cada jugador debe tener 'id' y 'pixel: [x, y]'."
      );
    }
  }

  return dropsData.players;
}
~~~

Por último, se representa a los jugadores mediante el fichero `player_drops.js`, en el que se crean los jugadores, que son esferas amarillas, y se almacenan en la lista `drops`:

~~~javascript
  for (const data of players) {

    const destination = map.pixelToScene( data.pixel[0], data.pixel[1], 0);
    const geometry = new THREE.SphereGeometry( playerInformation.size, 12, 12 );
    const material = new THREE.MeshStandardMaterial({ color: playerInformation.color, });
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
~~~

Asimismo, también se generan las funciones `start`, `update`, `beginFall`, `updateFall` y `resetForNewRoute`. Con la primera, se posiciona a los jugadores en la posición inicial del bus de asalto y se inicializa el progreso, que determina si se ha reiniciado la ruta del bus de asalto:

~~~javascript
  function start(busObject) {
    if (!busObject) {
      console.error( "PLAYER DROPS: start() recibió un bus inválido" );
      return;
    }

    bus = busObject;

    const currentProgress = bus.getProgress();
    previousProgress = currentProgress;

    for (const drop of drops) {

      drop.state = "waiting";
      drop.elapsed = 0;
      drop.jumpAt = bus.getProgressAtPosition( drop.destination );

      const busPosition = bus.getPosition();

      drop.startPosition.copy( busPosition );
      drop.startPosition.y += playerInformation.height;
      drop.mesh.position.copy( drop.startPosition );
      drop.mesh.visible = true;
    }
  }
~~~

Con la función `update` se consulta el progreso y la posición del autobús para actualizar la posición de los jugadores, con el fin de decidir si es necesario reiniciar la posición de los jugadores junto con el bus de asalto o si es necesario que el jugador salte.

~~~javascript
  function update(delta) {
    if (!bus) { return; }

    const currentProgress = bus.getProgress();
    if (currentProgress < previousProgress) { resetForNewRoute(); }
    previousProgress = currentProgress;

    for (const drop of drops) {
      if (drop.state === "waiting") {

        const busPosition = bus.getPosition();

        drop.mesh.position.copy( busPosition );
        drop.mesh.position.y += playerInformation.height;

        if (drop.jumpAt === null) { continue; }

        if ( currentProgress >= drop.jumpAt ) { beginFall(drop); }
      }

      else if (drop.state === "falling") { updateFall(drop, delta); }
    }
  }
~~~

Con las funciones `beginFall` y `updateFall` se inicia y actualiza la posición de la caída en función de `delta`:

~~~javascript
  function beginFall(drop) {
    drop.state = "falling";
    drop.elapsed = 0;
    drop.startPosition.copy( drop.mesh.position );
    drop.startHeight = drop.startPosition.y;
  }

  function updateFall(drop, delta) {
    drop.elapsed += delta;

    const distance = drop.startHeight - drop.destination.y;
    const duration = Math.max( distance / playerInformation.speed, 0.5 );
    const t = THREE.MathUtils.clamp( drop.elapsed / duration, 0, 1 );

    drop.mesh.position.x = THREE.MathUtils.lerp( drop.startPosition.x, drop.destination.x, t );
    drop.mesh.position.z = THREE.MathUtils.lerp( drop.startPosition.z, drop.destination.z, t );
    drop.mesh.position.y = THREE.MathUtils.lerp( drop.startHeight, drop.destination.y, t);

    if (t >= 1) {
      drop.state = "landed";
      drop.mesh.position.copy( drop.destination );
    }
  }
~~~


Para finalizar, en la función `resetForNewRoute` se reposicionan los jugadores en el bus de asalto y se establecen los nuevos progresos.

~~~javascript
  function resetForNewRoute() {
    const currentProgress = bus.getProgress();

    for (const drop of drops) {
      drop.state = "waiting";
      drop.elapsed = 0;

      // Calcular dónde debe saltar usando la nueva ruta
      drop.jumpAt = bus.getProgressAtPosition( drop.destination );

      const busPosition = bus.getPosition();

      drop.mesh.position.copy(busPosition );
      drop.mesh.position.y +=playerInformation.height;
      drop.mesh.visible = true;
    }

    previousProgress = currentProgress;
  }
~~~

# Demostación

https://github.com/user-attachments/assets/b688b04b-8171-4146-916f-c6b2ab44277f

[▶️ Vídeo demostración de mayor calidad con autoría](https://drive.google.com/file/d/1MyfxtaWypEo0GwY2UXgXvpqhzXJCvPz1/view?usp=sharing) <br>
[▶️ Vídeo demostración de mayor calidad sin autoría](https://drive.google.com/file/d/1zK9VLaPZU2UbI5FPkp0x542qXS8nWxui/view?usp=sharing)

# Fuentes

- Para obtener el mapa: https://fortnite.fandom.com/wiki/Athena

- Para generar el mapa de relieve: https://cpetry.github.io/NormalMap-Online/

- Para obtener el modelo 3D del battle bus: https://sketchfab.com/3d-models/battle-bus-b069acfb2e164cf7bf9121f15544ade4

- Para el audio: https://tuna.voicemod.net/sound/d0c63d56-ed7f-46dc-8b52-3ceb3facf779

## Conversaciones con la IA

- Para obtener las fuentes: https://share.gemini.google/pNqLw5bGLWeF

- Para dibujar el battle bus: https://claude.ai/share/2c429ace-5a14-47d0-abdc-0d1a6634c0c8

- Para generar la distribución de datos en el aterrizaje de los jugadores: https://chatgpt.com/share/6af4b608-5174-83ed-b5c8-2a5ac16c18e6
