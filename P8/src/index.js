import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { dropletShader, planeShader , animate, onWindowResize } from "./object_renderer";

let scene, renderer;
let camera;
let camcontrols;

init();
animationLoop();

function init() {
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 15);

    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);

    document.body.appendChild(renderer.domElement);

    //Con color sólido
    scene.add(dropletShader({x:-3.0, y:0, z:0}, 1, {horizontal:10, vertical: 10}));
    scene.add(planeShader(100, 100));

    camcontrols = new OrbitControls(camera, renderer.domElement);

    //Dmensiones iniciales
    onWindowResize(renderer);
    window.addEventListener("resize", onWindowResize, false);
}

//Bucle de visualización
function animationLoop() {
    requestAnimationFrame(animationLoop);

    animate();

    renderer.render(scene, camera);
}