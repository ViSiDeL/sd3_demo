
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config.js';

export function createScene() {
  const canvas = document.getElementById('scene-canvas');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d10);

  const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    window.innerWidth / window.innerHeight,
    CONFIG.camera.near,
    CONFIG.camera.far
  );
  camera.position.set(
    CONFIG.camera.startPosition.x,
    CONFIG.camera.startPosition.y,
    CONFIG.camera.startPosition.z
  );

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2.05; 

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(150, 300, 150);
  scene.add(sun);

  new THREE.TextureLoader().load('./public/img/sky.png', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
  });

  const groundGeo = new THREE.PlaneGeometry(2000, 2000);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x15181d });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  scene.add(ground);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let focusAnimationId = null;
  function focusCameraOn(targetPosition, { distance = 40, durationMs = 600 } = {}) {
    // console.log('focusCameraOn called, target:', targetPosition);
    if (focusAnimationId !== null) cancelAnimationFrame(focusAnimationId);

    const startTarget = controls.target.clone();
    const startCamPos = camera.position.clone();

    const direction = startCamPos.clone().sub(startTarget).normalize();
    const endCamPos = targetPosition.clone().add(direction.multiplyScalar(distance));
    const endTarget = targetPosition.clone();

    const startTime = performance.now();
    function step() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);

      controls.target.lerpVectors(startTarget, endTarget, eased);
      camera.position.lerpVectors(startCamPos, endCamPos, eased);
      controls.update();

      if (t < 1) {
        focusAnimationId = requestAnimationFrame(step);
      } else {
        focusAnimationId = null;
      }
    }
    step();
  }

  return { scene, camera, renderer, controls, focusCameraOn };
}