# Trabajo realizado

Para animar el sistema solar se ha dividido el script original, resultado de combinar el material de ejemplo en las clases, en dos ficheros. El fichero `index.js` ha conservado únicamente la función `init` y `animationLoop`, con el fin de mejorar la legibilidad. El fichero `solar_system.js` contiene la lógica de graficado.

En primer lugar, se encuentran las funciones que se llaman desde `index.js`, que sirven para crear el sistema solar, `createSolarSystem`, y para actualizar la posición de la óbita de los cuerpos celestes de este, `renderSolarSystem`. Cabe mencionar que, en la primera función, al poseer el mapa de nubes, y un satélite, la creación de la Tierra, junto con la de Saturno, requiere de mayor trabajo. Para la Tierra, es necesario crear el planeta, crear la capa de nubes, que comparte una rotación solidaria la Tierra, y añadirla a su grupo, y crear la luna, con su respectivo pivote :

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

En el caso de Saturno, es más sencillo, ya que se crean el planeta y su anillo, con las funciones creadas para ello, y establecer la rotación de este último:

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

En segundo lugar, se declaran las funciones auxiliares, que sirven para cargar las URL de las imágenes, `loadUrl`, crear los planetas `createPlanet`, y para crear el anillo de saturno, `createRing`. Se destacan de estas la primera, que reduce la cantidad de parámetros necesarios para su ejecución. Esto se logra desplazando los planetas en el eje x el valor correspondiente a la distancia a su pivote, o elemento sobre el que giran:

~~~javascript
function createPlanet({ radius, distance, orbitSpeed, spin, map, bump, spec }) {
  const pivot = new THREE.Object3D();
  space.add(pivot);

  const group = new THREE.Object3D();
  group.position.x = distance;
  pivot.add(group);
~~~

Una vez definidos el pivote y la distancia a estos, se crea el material, modificándolo si fuera necesario, y se crea el elemento al que se le asignará el mapa de texturas:

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

Como añadido, se dibuja el anillo de la órbita que describe el planeta, utilizando la función  para crearla y añadirla al espacio. Una vez añadidas las órbitas, solo resta almacenar el objeto y la órbita en sus respectivas listas para poder animar el movimiento del sistema solar:

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

# Fuentes
## Textura de los planetas
Para las texturas del planeta tierra:
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