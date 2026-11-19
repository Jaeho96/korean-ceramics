// 만든 glb 를 확인하는 뷰어. ?raw 면 압축하지 않은 파일, ?set=blender 면 Blender 로 만든 세트를 연다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const params = new URLSearchParams(location.search);
const name = params.get('set') === 'blender' ? 'onggi-set-blender' : 'onggi-set';
// 압축 전 원본은 배포 폴더에 넣지 않으려고 assets-src/raw 로 옮겼다(개발 서버에서만 /assets-src/raw/ 로 열린다)
const BASE = import.meta.env.BASE_URL;
const url = params.has('raw') ? `/assets-src/raw/${name}.raw.glb` : `${BASE}assets/${name}.glb`;
const hud = document.getElementById('hud');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.AgXToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#ece6dc');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

const sun = new THREE.DirectionalLight('#fff4e6', 2.2);
sun.position.set(0.8, 1.6, 0.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.1, far: 4 });
sun.shadow.bias = -0.0005;
sun.shadow.radius = 6;
scene.add(sun);

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.01, 20);
camera.position.set(0.95, 0.62, 1.15);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.17, 0);
controls.enableDamping = true;
controls.autoRotate = !new URLSearchParams(location.search).has('still');
controls.autoRotateSpeed = 0.6;
window.__view = { camera, controls }; // 확인용: 콘솔에서 시점을 옮긴다

const draco = new DRACOLoader().setDecoderPath(`${BASE}draco/`);
const t0 = performance.now();
new GLTFLoader().setDRACOLoader(draco).load(url, (gltf) => {
  gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(gltf.scene);
  const ms = Math.round(performance.now() - t0);
  const info = renderer.info;
  requestAnimationFrame(() => {
    hud.textContent = `${url}\n불러오기 ${ms}ms · 삼각형 ${info.render.triangles.toLocaleString()} · 텍스처 ${info.memory.textures}`;
  });
  window.__ready = true;
}, undefined, (e) => { hud.textContent = '불러오기 실패: ' + e.message; });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
