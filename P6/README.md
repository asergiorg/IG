# Trabajo realizado

Para animar el sistema solar se ha dividido el script original, resultado de combinar el material de ejemplo en las clases, en dos ficheros. El fichero `index.js` ha conservado únicamente las funciones `init` y `animationLoop`, con el fin de mejorar la legibilidad. El fichero `solar_system.js` contiene la lógica de graficado.

En primer lugar, se encuentran las funciones que se llaman desde `index.js`, que sirven para crear el sistema solar, `createSolarSystem`, y para actualizar la posición de la órbita de los cuerpos celestes de este, `renderSolarSystem`. Cabe mencionar que, en la primera función, al poseer el mapa de nubes, y un satélite, la creación de la Tierra, junto con la de Saturno, requiere de mayor trabajo. Para la Tierra, es necesario crear el planeta, crear la capa de nubes, que comparte una rotación solidaria la Tierra, y añadirla a su grupo, y crear la luna, con su respectivo pivote :

~~~javascript
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
~~~

En el caso de Saturno, es más sencillo, ya que se crean el planeta y su anillo, con las funciones creadas para ello, y se establece la rotación de este último:

~~~javascript
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
~~~

En segundo lugar, se declaran las funciones auxiliares, que sirven para cargar las URL de las imágenes, `loadUrl`, crear los planetas `createPlanet`, y para crear el anillo de Saturno, `createRing`. Se destacan de estas la primera, que reduce la cantidad de parámetros necesarios para su ejecución. Esto se logra desplazando los planetas en el eje x el valor correspondiente a la distancia a su pivote, o elemento sobre el que giran:

~~~javascript
function createPlanet({ radius, distance, orbitSpeed, spin, map, bump, spec }) {
  const pivot = new THREE.Object3D();
  space.add(pivot);

  const group = new THREE.Object3D();
  group.position.x = distance;
  pivot.add(group);
~~~

Una vez definidos el pivote y la distancia a este, se crea el material, modificándolo si fuera necesario, y se crea el elemento al que se le asignará el mapa de texturas:

~~~javascript
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
~~~

Como añadido, se dibuja el anillo de la órbita que describe el planeta y se añade al espacio. Tras esto, solo resta almacenar el objeto y la órbita en sus respectivas listas para poder animar el movimiento del sistema solar:

~~~javascript
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
~~~

Asimismo, esta función no se usa para todos los planetas, ya que hay algunos, como la Tierra o Saturno, que tienen que ser dibujados de forma particular. En el caso concreto de Saturno, se creó una función `createRing`, que genera el anillo para este planeta de forma independiente:

~~~javascript
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
~~~

Por último, con el fin de poder añadir tantas lunas como fuese necesario, simplificando el código y evitando la repetición del mismo, se creo la función `addSateliteTo`, que permite crear y añadir un satélite al planeta que recibe como parámetro:

~~~javascript
function addSateliteTo(planet, { radius, distance, orbitSpeed, map, color = 0xffffff } ) {
  const moonPivot = new THREE.Object3D();
  planet.group.add(moonPivot);

  const material = new THREE.MeshPhongMaterial(map ? { map: map } : { color: color });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), material);

  moon.position.set(distance, 0, 0);
  moonPivot.add(moon);
  orbits.push({ pivot: moonPivot, speed: orbitSpeed });
}
~~~

## Añadidos

Como trabajo adicional, se ha desarrollado el siguiente script, con ayuda de la Inteligencia Artificial, para permitir el movimiento de la cámara, tanto en la vista de la nave como en la vista general, con el fin de facilitar descubrir el universo de forma lúdica. Este script está dividido en funciones principales y funciones secundarias, que se utilizan en las principales. Las secundarias gestionan el evento de pulsación de una tecla para registrarlo y modificarlo cuando se libere la pulsación:

~~~javascript
function onKeyDown(e) {
  // Espacio: acción puntual (una vez por pulsación)
  if (e.code === "Space") {
    e.preventDefault(); // evita que la página haga scroll
    if (!e.repeat && onSpace) onSpace();
    return;
  }

  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = true;
}

function onKeyUp(e) {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = false;
}
~~~

Una vez definidas las funciones secundarias, se hace uso de las principales para establecer las variables con las que se opera, con la función `initKeyboardControls`, y se actualiza la posición de la cámara, con `updateKeyboardControls`. En el caso de la segunda, se divide el movimiento en rotación de la cámara y el movimiento hacia delante y hacia detrás, comprobando que no se pulsen simultáneamente teclas que se anulen. Esto se hace así para buscar un movimiento lo más similar al de una nave espacial real:

~~~javascript
export function initKeyboardControls(cam, orbitControls, options = {}) {
  camera = cam;
  controls = orbitControls;
  speed = options.speed ?? speed;
  turnSpeed = options.turnSpeed ?? turnSpeed;
  onSpace = options.onSpace ?? onSpace;

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
}

export function updateKeyboardControls(delta) {
  const { w, a, s, d } = keys;

  // --- Giro sobre uno mismo (A/D) ---
  const turn = (a ? 1 : 0) - (d ? 1 : 0);
  if (turn !== 0) {
    offset.copy(controls.target).sub(camera.position);
    offset.applyAxisAngle(UP, turn * turnSpeed * delta);
    controls.target.copy(camera.position).add(offset);
  }

  // --- Avance / retroceso (W/S) ---
  const advance = (w ? 1 : 0) - (s ? 1 : 0);
  if (advance !== 0) {
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    move.copy(forward).multiplyScalar(advance * speed * delta);
    camera.position.add(move);
    controls.target.add(move);
  }
}
~~~

Asimismo, siguiendo este patrón en la búsqueda de facilitar el aprendizaje a aquellos que hagan uso de la aplicación, se ha añadido una batería de datos curiosos sobre los distintos planetas que conforman el sistema solar, posicionándolos en un panel de la nave, para dar una sensación más inmersiva. El script lee un fichero en formato `JSON`, y retorna el dato correspondiente de forma circular:

~~~javascript
// Estado interno
let planetIndex = 0; 
const factCounters = planets.map(() => 0);

export function getNextData() {
  const planet = planets[planetIndex];
  const factIndex = factCounters[planetIndex];

  const data = {
    planet: planet.name,
    fact: planet.facts[factIndex],
    factNumber: factIndex + 1,
    totalFacts: planet.facts.length,
  };

  factCounters[planetIndex] = (factIndex + 1) % planet.facts.length;
  planetIndex = (planetIndex + 1) % planets.length;

  return data;
}
~~~

Por último, atendiendo a la posible presencia de nuevos usuarios, se han diseñado dos plantillas de tutorial que permiten al usuario saber con qué puede interactuar, para lo que se ha generado un script que permite modificar la vista del canvas:

~~~javascript
// Recibe el texto y lo inyecta en el recuadro
export function write(texto) {
  textoPantalla.innerHTML = texto;
}

// Alterna entre la nave y el exterior
toggleCabina.addEventListener('change', (e) => {
  const enLaNave = e.target.checked;
  cabina.style.display = enLaNave ? 'block' : 'none';
  
  // Oculta también el texto holográfico si sales de la cabina
  textoPantalla.style.display = enLaNave ? 'block' : 'none';
  
  if (toggleTutorial.checked) {
    tutorialNave.style.display = enLaNave ? 'block' : 'none';
    tutorialFuera.style.display = enLaNave ? 'none' : 'block';
  }
});

// Muestra u oculta el tutorial
toggleTutorial.addEventListener('change', (e) => {
  const mostrar = e.target.checked;
  const enLaNave = toggleCabina.checked;
  
  if (mostrar) {
    tutorialNave.style.display = enLaNave ? 'block' : 'none';
    tutorialFuera.style.display = enLaNave ? 'none' : 'block';
  } else {
    tutorialNave.style.display = 'none';
    tutorialFuera.style.display = 'none';
  }
});

write("<br>SISTEMA EN LÍNEA<br>Motores: OK<br>Escudos: 100%");
~~~

# Demostración de las dos vistas

https://github.com/user-attachments/assets/b7886953-00ab-4a33-9200-103bb310d71c

https://github.com/user-attachments/assets/688d3f17-19b7-4eb5-acc8-25644339e621

[▶️ Vídeo completo sin editar y mayor calidad](https://drive.google.com/file/d/1vbUqjLxd7hp-gRDoNRTWxBkiwkjcLKss/view?usp=sharing)

# Fuentes
## Textura de los planetas
Para las texturas del planeta Tierra:
https://gis.humboldt.edu/Archive/GISData/2019/WGS84_Geographic/3DTextures/

Para las texturas de las lunas de los planetas:
https://github.com/MTE1991/SolSisSim/tree/main/public/textures

Para las texturas del resto de cuerpos celestes:
https://www.solarsystemscope.com/textures/

## Conversaciones con la IA
Para crear la imagen de la nave espacial:
https://chatgpt.com/share/6adfa1a5-04cc-83ed-bc77-99fc9944c56d

Para crear el tutorial:
https://chatgpt.com/share/6ae1ccb9-12dc-83ed-9e57-110113c4b755

Para la interfaz gráfica:
https://share.gemini.google/GY2ITn56k7Ab

Para el desarrollo del movimiento de la nave:
https://claude.ai/share/4a8268d1-3c67-4b91-a699-38f212ad6f50

Para generar los datos sobre los planetas:
https://chatgpt.com/share/6ae1e506-acc8-83eb-9bf2-c8ef5fce41de

Para configurar la forma en que se muestran los datos sobre los planetas:
https://share.gemini.google/7THz2ToPm5wL
