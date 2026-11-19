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