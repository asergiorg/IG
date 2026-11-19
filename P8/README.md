# Motivación

Como estudiante de una carrera tan exigente como ingeniería informática, sé lo agotador que puede llegar a ser mentalmente estar al día con las asignaturas, situación que ha empeorado con las redes sociales y una sociedad con un afán de optimizarse y vivir lo más rápido posible. Por lo que mi propuesta busca ser un efecto visual sencillo, que permita pararse a observar y relajarse, aunque sea solo por un instante, a aquellas personas que lo vean, reduciendo el ruido que vive en nuestras cabezas desde que nos levantamos.

# Trabajo realizado

Como punto de partida se ha utilizado uno de los scripts proporcionados en la asignatura, en concreto, `script_33_shader_dibuja.js`. A partir de este se han separado las responsabilidades con el fin de obtener un diseño más simple y desacoplado, que permite cambiar de forma simple cualquier fichero, pues el diseño es modular. Para ello, se ha creado el fichero `scene_renderer.js`, que se encarga de dibujar los objetos de la escena. En este, se crean 4 funciones clave para el desarrollo del trabajo. En primer lugar, la función mediante la que se dibuja el plano, en la quese crea el plano y se usan los shaders creados en `shader_manager.js`. En segundo lugar, `setupMouse`, con la que se añaden los eventos que actualizan la posición del ratón y la función que actualiza el visionado con el cambio de tamaño de la ventana, `onWindowResize`. Por último, `animate`, que actualiza el tiempo transcurrido, con el que se simula el latido del plano, y se establecen los valores que configuran la sensación de viscosidad del material. 

~~~javascript
export function planeShader(width, height) {
  uniforms.u_planeAspect.value = width / height;

  const geometry = new THREE.PlaneGeometry(width / 2, height / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    fragmentShader: planeFragmentShader(),
    vertexShader: vertexShader(),
  });

  const mesh = new THREE.Mesh(geometry, material);
  objects.push(mesh);
  return mesh;
}

export function setupMouse(camera) {
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0 && intersects[0].uv) {
      targetMouse.copy(intersects[0].uv);
    }
  });

  document.addEventListener("mouseleave", () => {
    targetMouse.set(0.5, 0.5);
  });
}

export function animate() {
  const delta = clock.getDelta();
  uniforms.u_time.value += delta;

  const smoothness = 5.0;
  const lerpFactor = 1.0 - Math.exp(-smoothness * delta);
  uniforms.u_mouse.value.lerp(targetMouse, lerpFactor);
}

export function onWindowResize(renderer, camera) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
~~~

Una vez desarrollado el código para crear el plano, se le solicitó a la Inteligencia Artificial el código correspondiente al patrón de Mandelbrot. Tras esto, se modificaron los shaders con el fin de desvincularlos de los píxeles del monitor (gl_FragCoord) y anclarlos a la superficie geométrica de la malla (uv), garantizando que tanto cada punto del plano como la posición del ratón compartan exactamente el mismo espacio matemático. Para lograrlo, la transformación se divide en cuatro pasos:

1. Cambiar el origen de coordenadas en el Vertex Shader

En el código original se usaba vUv = position, lo que enviaba al fragment shader las coordenadas físicas de los vértices en el mundo 3D (por ejemplo, de -25 a +25 si el plano medía 50x50). Para que el shader sea independiente del tamaño del objeto, se sustituye `position` por el atributo que Three.js genera automáticamente para cualquier geometría, `uv`:

~~~OpenGL Shading Languagevarying vec2 vUv
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
~~~

2. Centrar el plano y corregir su proporción (u_planeAspect)

Los fractales necesitan que el punto (0.0, 0.0) esté en el centro y que ambos ejes tengan la misma escala para que las espirales no se estiren si el plano es rectangular.
* Centrado: Al hacer vUv - 0.5, se desplaza el rango [0.0, 1.0] a [-0.5, 0.5], situando el origen en el centro exacto del plano.
* Proporción: Como ya no depende de la ventana del navegador, se elimina u_resolution y se pasa la relación de aspecto del propio plano, multiplicando el eje X por ese valor:

~~~OpenGL Shading Languagevec2 
uv = (vUv - 0.5) * vec2(u_planeAspect, 1.0);
~~~

3. Traducir el cursor 3D al mismo espacio UV con Raycaster

Cuando se mueve la cámara con OrbitControls, dividir e.clientX / window.innerWidth deja de servir porque el plano puede estar inclinado, desplazado o visto desde lejos.Por esto, se hace uso de THREE.Raycaster, que lanza un rayo invisible desde la cámara pasando por el cursor. Al chocar contra el plano, intersects[0].uv nos devuelve directamente la coordenada UV exacta del punto de impacto (ya normalizada entre 0 y 1, y con el eje Y hacia arriba, igual que en GLSL). De esta forma, en el Fragment Shader se aplica a u_mouse exactamente la misma fórmula que a vUv:

~~~OpenGL Shading Language
vec2 mouse = (u_mouse - 0.5) * vec2(u_planeAspect, 1.0);
~~~

Una vez calculada la posición del puntero sobre la imagen, se aplican las siguientes transformaciones al código generado por la IA para afectar a la representación de la imagen:

1. Deformar el espacio (uv → warpedUv) antes de calcular c

En el código original, uv entraba directamente en `vec2 c = center + uv * zoom;`. Para que el cursor actúe como un campo de fuerza que retuerce el espacio a su alrededor, se intercepta uv antes de esa línea:

Radio de influencia localizada: Calculamos el vector de la diferencia desde el ratón hasta cada píxel (`diff = uv - mouse`) y su distancia (`dist = length(diff)`). Con una caída exponencial (`influence = exp(-dist * 2.5)`) se logra que la deformación sea máxima justo bajo el cursor y se desvanezca suavemente hacia los bordes del plano.

Torsión en remolino: Se multiplica `diff` por una matriz de rotación 2D (`mat2(co, -s, s, co)`) cuyo ángulo gira los puntos alrededor del cursor.

Onda líquida: Aprovechando el u_time que estaba sin usar, se modula la distancia con una función seno (`sin(dist * 10.0 - u_time * 2.0)`), que crea un efecto de lente u onda expansiva.

El resultado (`warpedUv = mouse + warpedDiff`) sustituye a uv en la fórmula original: vec2 c = center + warpedUv * zoom;.

2. Perturbar z inicial para mutar las espirales por dentro

En un conjunto de Mandelbrot puro, z siempre empieza en cero. Por lo que se sustituye por un desplazamiento dependiente del ratón (`vec2 z = mouse * 0.45 * exp(-dist * 1.5);`), perturbando la condición inicial de la órbita en la zona cercana al puntero. Esto, para evitar un resultado de una deformación 2D tras aplicar las rotaciones. Este comportamiento resulta en que las espirales se abran, se cierren y se reconfiguren estructuralmente según se mueva el puntero.

3. Vincular la paleta de cosenos a las coordenadas del ratón

En el código original, la frecuencia de las bandas (`0.035`) y el desfase RGB (`vec3(0.0, 0.15, 0.35)`) eran constantes:

~~~OpenGL Shading Language
// Original:
float t = smoothIter * 0.035;
col = 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.15, 0.35)));
~~~

Al sumar mouse.y a la frecuencia y desplazar el vector de fase con mouse.x y mouse.y, mover el cursor en vertical comprime o expande la densidad de anillos del fractal, mientras que moverlo en horizontal rota los tonos cromáticos:

~~~OpenGL Shading Language
// Modificado:
float t = smoothIter * (0.032 + mouse.y * 0.015) + mouse.x * 0.4;
vec3 phase = vec3(0.0, 0.15, 0.35) + vec3(mouse.x * 0.25, mouse.y * 0.2, -mouse.x * 0.15);
col = 0.5 + 0.5 * cos(6.28318 * (t + phase));
~~~

Tras aplicar estas transformaciones, se obtiene el siguiente fichero `shader_manager.js`:

~~~javascript
export function vertexShader() {
  return `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
}

export function planeFragmentShader() {
return `
        uniform float u_planeAspect;
        uniform float u_time;
        uniform vec2 u_mouse;

        varying vec2 vUv;

        void main() {
          // Centramos vUv en (0,0) y corregimos proporción según el tamaño del plano 3D
          vec2 uv = (vUv - 0.5) * vec2(u_planeAspect, 1.0);
          
          // u_mouse ya viene en coordenadas UV [0, 1] desde el Raycaster
          vec2 mouse = (u_mouse - 0.5) * vec2(u_planeAspect, 1.0);

          // 1. DEFORMACIÓN ESPACIAL
          vec2 diff = uv - mouse;
          float dist = length(diff);
          float influence = exp(-dist * 2.5); // Radio de influencia del cursor

          // Torsión en espiral cerca del cursor
          float angle = 1.2 * influence;
          float s = sin(angle);
          float co = cos(angle);
          vec2 warpedDiff = mat2(co, -s, s, co) * diff;

          // Distorsión tipo lente / onda
          warpedDiff *= 1.0 - 0.35 * influence * sin(dist * 10.0 - u_time * 2.0);
          vec2 warpedUv = mouse + warpedDiff;

          // 2. CÁLCULO DEL FRACTAL CON MUTACIÓN ESTRUCTURAL
          vec2 center = vec2(-0.74364388703, 0.13182590421);
          float zoom = 0.0035;
          vec2 c = center + warpedUv * zoom;

          // Al variar z inicial según el ratón, las espirales del fractal se retuercen por dentro
          vec2 z = mouse * 0.45 * exp(-dist * 1.5);

          float iter = 0.0;
          const int MAX_ITER = 500;
          const float BAILOUT = 256.0;

          for (int i = 0; i < MAX_ITER; i++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            if (dot(z, z) > BAILOUT * BAILOUT) break;
            iter += 1.0;
          }

          // 3. CAMBIO DE ASPECTO Y PALETA SEGÚN EL RATÓN
          vec3 col = vec3(0.0);

          if (iter < float(MAX_ITER)) {
            float log_zn = log(dot(z, z)) * 0.5;
            float nu = log(log_zn / 0.69314718) / 0.69314718;
            float smoothIter = iter + 1.0 - nu;

            // El eje Y cambia la densidad de bandas y el eje X desplaza los tonos
            float t = smoothIter * (0.032 + mouse.y * 0.015) + mouse.x * 0.4;

            vec3 phase = vec3(0.0, 0.15, 0.35) + vec3(mouse.x * 0.25, mouse.y * 0.2, -mouse.x * 0.15);

            col = 0.5 + 0.5 * cos(6.28318 * (t + phase));
          }

          gl_FragColor = vec4(col, 1.0);
        }
        `;
}
~~~

# Demostación

https://github.com/user-attachments/assets/8170e6ab-2b67-4acc-aeaa-87e77da3ec25

[▶️ Vídeo demostración de mayor calidad](https://drive.google.com/file/d/1uTT8GqhjP3XVv49qbLAHJha3NB6sre2F/view?usp=sharing)

# Fuentes

## Conversaciones con la IA

- Para adaptar el script index original y poder ejecutarlo en local: https://claude.ai/share/f51bb648-6b8d-4af1-9f48-c11094e7932d

- Para generar el patrón de Mandelbrot: https://chatgpt.com/share/6aff50de-def0-83eb-b412-7cf56c577546

- Para traducir el shader a la versión más ligera: https://drive.google.com/file/d/1uTT8GqhjP3XVv49qbLAHJha3NB6sre2F/view?usp=sharing

