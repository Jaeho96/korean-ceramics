// 고정 캔버스 위 3D 무대. 장마다 다른 "배우"가 등장한다.
// 첫 화면 달항아리 → 01 흙 점토(눌림) → 02 물레(솟음 · 손잡이로 빚기) → 03 유약(흘러내림)
// → 04 가마(달아오름 · 빙렬) → 05 컬렉션(끌어서 돌려 보기) → 06 만든 방법(메시 골격)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MOON, MAEBYEONG, spaced } from './actors/profiles.js';
import { makeLump } from './actors/lump.js';
import { makeWheel } from './actors/wheel.js';
import { makeGlaze } from './actors/glaze.js';
import { makeKiln, makeCeladonMaterial } from './actors/kiln.js';

function contactShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(40,30,20,0.55)');
  grad.addColorStop(0.45, 'rgba(40,30,20,0.18)');
  grad.addColorStop(1, 'rgba(40,30,20,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.001;
  return mesh;
}

function makeWire() {
  const geo = new THREE.LatheGeometry(spaced(MOON, 22), 28);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#7f9e8c', wireframe: true, transparent: true, opacity: 0.75 })));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#4f6b5b', size: 0.006 })));
  return g;
}

function makeEmbers(count = 420) {
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * 0.38;
    const a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, Math.random() * 0.75, Math.sin(a) * r], i * 3);
    speed[i] = 0.04 + Math.random() * 0.12;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: '#ff8a3d', size: 0.012, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.tick = (dt) => {
    for (let i = 0; i < count; i++) {
      let y = pos[i * 3 + 1] + speed[i] * dt;
      if (y > 0.75) y = 0;
      pos[i * 3 + 1] = y;
      pos[i * 3] += Math.sin(y * 9 + i) * 0.0004;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

export function start({ reduce, poster }) {
  const canvas = document.getElementById('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!poster });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  const key = new THREE.DirectionalLight('#fff3e2', 1.4);
  key.position.set(-1, 1.6, 1.2);
  scene.add(key);
  const fire = new THREE.PointLight('#ff6a1f', 0, 2.5, 1.6); // 가마 불빛
  fire.position.set(0.25, 0.05, 0.45);
  scene.add(fire);

  const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 0.01, 20);
  const frame = () => {
    const d = Math.max(1.55, 1.4 / camera.aspect);
    camera.position.set(0, 0.26, d);
    camera.lookAt(0, 0.21, 0);
  };
  frame();

  const stage = new THREE.Group();
  const turntable = new THREE.Group();
  const shadow = contactShadow();
  const embers = makeEmbers();
  stage.add(turntable, shadow, embers);
  scene.add(stage);

  // ---- 배우: 이름 → 그룹. 등장 · 퇴장은 그룹 크기를 키우고 줄여서 한다
  const actors = {};
  let current = null;
  let wanted = 'moon';
  const spin = { now: 0.12, target: 0.12 };
  const addActor = (name, obj) => {
    const holder = new THREE.Group();
    holder.add(obj);
    holder.visible = false;
    holder.scale.setScalar(0.001);
    turntable.add(holder);
    actors[name] = holder;
    if (wanted === name) show(name, true);
  };
  function show(name, force) {
    wanted = name;
    if (!actors[name] || (current === name && !force)) return;
    const prev = current && actors[current];
    const next = actors[name];
    current = name;
    if (prev && prev !== next) {
      gsap.to(prev.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.45, ease: 'power2.in', overwrite: true, onComplete: () => { prev.visible = false; } });
    }
    next.visible = true;
    gsap.to(next.scale, { x: 1, y: 1, z: 1, duration: poster ? 0 : 0.9, ease: 'power3.out', delay: prev && prev !== next ? 0.3 : 0, overwrite: true });
    spin.target = name === 'wheel' ? 4.0 : name === 'lineup' || name === 'lump' ? 0.05 : 0.12;
    if (name !== 'kiln') setHeat(0);
    if (name === 'glaze' && !glazeStarted) { glazeStarted = true; glaze.pour('celadon'); }
    document.documentElement.dataset.actor = name;
  }
  let heatNow = 0;
  function setHeat(h) {
    heatNow = h;
    fire.intensity = h * 4.5;
    scene.environmentIntensity = 0.85 - h * 0.55;
    key.intensity = 1.4 - h * 1.0;
    embers.material.opacity = h * 0.9;
    shadow.material.opacity = 1 - h;
  }

  const lump = makeLump();
  addActor('lump', lump.object);
  const wheel = makeWheel();
  addActor('wheel', wheel.object);
  const glaze = makeGlaze();
  addActor('glaze', glaze.object);
  let glazeStarted = false;
  const kiln = makeKiln();
  addActor('kiln', kiln.object);
  addActor('wire', makeWire());

  const BASE = import.meta.env.BASE_URL; // 빌드에서는 './', 개발 서버에서는 '/'
  const draco = new DRACOLoader().setDecoderPath(`${BASE}draco/`);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  loader.load(`${BASE}assets/moonjar.glb`, (gltf) => {
    const moon = gltf.scene;
    addActor('moon', moon);
    renderer.render(scene, camera);
    requestAnimationFrame(() => {
      canvas.classList.add('ready');
      document.documentElement.classList.add('stage-ready'); // 정지 이미지를 걷어 낸다
      if (poster) window.__posterReady = true;
    });
    if (poster) return;
    // 첫 화면이 뜬 뒤에 나머지 세트를 받는다
    loader.load(`${BASE}assets/onggi-set-blender.glb`, (set) => {
      const pick = (n) => {
        const o = set.scene.getObjectByName(n);
        o.position.set(0, 0, 0);
        return o;
      };
      const lineup = new THREE.Group();
      const place = (o, s, x, z, ry = 0) => { const c = o.clone(); c.scale.setScalar(s); c.position.set(x, 0, z); c.rotation.y = ry; lineup.add(c); };
      // 키 큰 것은 뒤, 낮은 것은 앞. 글자를 가리지 않게 가로로 좁게 모은다
      place(moon, 0.58, -0.1, -0.12);
      const mae = new THREE.Mesh(new THREE.LatheGeometry(spaced(MAEBYEONG, 80), 96), makeCeladonMaterial(1).mat);
      place(mae, 0.6, 0.1, -0.1);
      place(pick('jar'), 0.5, 0.2, 0.08, 1.2);
      place(pick('bowl'), 1.1, -0.1, 0.13);
      place(pick('cup'), 1.4, 0.06, 0.2);
      addActor('lineup', lineup);
    });
  });

  // ---- 장마다 배우 바꾸기 · 스크롤 연출(정지 이미지 촬영 모드에서는 만들지 않는다: 본문이 숨어 모든 트리거가 한꺼번에 발동한다)
  if (!poster) {
    const cast = [['top', 'moon'], ['clay', 'lump'], ['wheel', 'wheel'], ['glaze', 'glaze'], ['kiln', 'kiln'], ['collection', 'lineup'], ['making', 'wire']];
    for (const [id, name] of cast) {
      ScrollTrigger.create({ trigger: `#${id}`, start: 'top 60%', end: 'bottom 40%', onEnter: () => show(name), onEnterBack: () => show(name) });
    }
    ScrollTrigger.create({
      trigger: '#wheel', start: 'top 85%', end: 'center 40%',
      onUpdate: (self) => wheel.setProgress(Math.min(1, Math.max(0, self.progress))),
    });
    ScrollTrigger.create({
      // 매병이 화면에 있는 구간(가마 장 위쪽이 60% 선에 닿을 때부터 아래쪽이 60% 선에 닿을 때까지)에 맞춘다
      trigger: '#kiln', start: 'top 60%', end: 'bottom 60%',
      onUpdate: (self) => { if (current === 'kiln') setHeat(kiln.setProgress(self.progress)); },
    });

    // ---- 유약 고르기 버튼
    for (const btn of document.querySelectorAll('[data-glaze]')) {
      btn.addEventListener('click', () => {
        glazeStarted = true;
        glaze.pour(btn.dataset.glaze);
        for (const b of document.querySelectorAll('[data-glaze]')) b.setAttribute('aria-pressed', String(b === btn));
      });
    }

    // ---- 장마다 무대 위치: 글자 반대편으로 비킨다(세로 화면은 위로)
    const halfW = () => camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const portrait = () => camera.aspect < 0.8;
    const sideX = (side) => (portrait() ? 0 : ({ left: 0.48, right: -0.48 }[side] ?? 0) * halfW());
    const tl = gsap.timeline({
      scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1, invalidateOnRefresh: true },
    });
    for (const sec of document.querySelectorAll('.chapter')) {
      const s = 0.85;
      tl.to(stage.position, { x: () => sideX(sec.dataset.side), y: () => (portrait() ? 0.12 : 0), duration: 1, ease: 'power1.inOut' }, '>')
        .to(stage.scale, { x: s, y: s, z: s, duration: 1, ease: 'power1.inOut' }, '<');
    }

  }

  // ---- 포인터: 흙 누르기, 화면 기울이기, 컬렉션 끌어 돌리기
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const tilt = { x: 0, y: 0 };
  let drag = null;
  let inertia = 0;
  addEventListener('pointermove', (e) => {
    tilt.x = (e.clientY / innerHeight - 0.5) * 0.12;
    tilt.y = (e.clientX / innerWidth - 0.5) * 0.25;
    if (current === 'lump') {
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(lump.mesh, false)[0];
      if (hit) lump.press(hit.point, e.buttons ? 1 : 0.45);
      document.documentElement.classList.toggle('pressing', !!hit);
    }
    if (drag) {
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      turntable.rotation.y += dx * 0.01;
      inertia = dx * 0.01;
    }
  });
  const collection = document.getElementById('collection');
  collection.addEventListener('pointerdown', (e) => {
    if (current !== 'lineup' || e.target.closest('a,button')) return;
    drag = { x: e.clientX };
    try { collection.setPointerCapture(e.pointerId); } catch { /* 가상 포인터 등 */ }
  });
  addEventListener('pointerup', () => { drag = null; });

  // ---- 물레 손잡이: 단면 위의 점을 화면에 띄우고, 좌우로 끌면 그 높이의 반지름이 바뀐다
  const layer = document.getElementById('handles');
  const handleEls = wheel.handles.map((h) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'handle';
    el.setAttribute('aria-label', `단면 점 ${h.index}`);
    layer.appendChild(el);
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch { /* 가상 포인터 등 */ }
      start = { px: e.clientX, x: h.x };
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      const worldPerPx = (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / innerHeight / stage.scale.x;
      h.set(start.x + (e.clientX - start.px) * worldPerPx);
    });
    el.addEventListener('pointerup', () => { start = null; });
    return el;
  });
  const v3 = new THREE.Vector3();
  function placeHandles() {
    const on = current === 'wheel' && wheel.progress > 0.98;
    layer.classList.toggle('on', on);
    if (!on) return;
    wheel.handles.forEach((h, i) => {
      v3.set(h.x, h.y, 0);
      stage.localToWorld(v3);
      v3.project(camera);
      handleEls[i].style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px, ${(-v3.y * 0.5 + 0.5) * innerHeight}px)`;
    });
  }

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    frame();
    renderer.setSize(innerWidth, innerHeight, false);
    ScrollTrigger.refresh();
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    spin.now += (spin.target - spin.now) * Math.min(1, dt * 3);
    if (!reduce && !poster && !drag) turntable.rotation.y += dt * spin.now + inertia;
    inertia *= 0.92;
    if (!poster) {
      stage.rotation.x += (tilt.x - stage.rotation.x) * 0.05;
      stage.rotation.z += (-tilt.y * 0.2 - stage.rotation.z) * 0.05;
    }
    if (embers.material.opacity > 0.01) embers.userData.tick(dt);
    if (heatNow > 0.01) fire.intensity = heatNow * 4.5 * (0.9 + 0.07 * Math.sin(clock.elapsedTime * 13.3) + 0.05 * Math.sin(clock.elapsedTime * 7.1));
    lump.update();
    placeHandles();
    renderer.render(scene, camera);
  });
  window.__scene = { renderer, scene, camera, stage, actors, show, wheel, kiln, glaze };
}
