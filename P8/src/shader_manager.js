export function vertexShader() {
  return `
          varying vec3 vUv; 
          varying vec4 modelViewPosition; 
        
          void main() {
              vUv = position; 
              vec4 modelViewPosition = modelViewMatrix * vec4(vUv, 1.0);
              gl_Position = projectionMatrix * modelViewPosition; 
          }
          `;
}

export function dropletFragmentShader() {
  return `
         void main() {
         gl_FragColor = vec4(0.831,0.567,1.000,1.000);
         }
         `;
}

export function planeFragmentShader() {
  return `
         uniform vec2 u_resolution;
         uniform float u_time;

         void main() {
            //Normalizamos coordenadas del píxel en base a la resolución
            vec2 st = gl_FragCoord.xy/u_resolution;

            //Escala de grises izquierda a derecha
            gl_FragColor = vec4(vec3(st.x),1.0);
         }
         `;
}