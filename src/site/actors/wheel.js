// 02 물레: 스크롤하면 물레가 돌면서 점토 덩어리의 단면이 항아리 단면으로 자라 올라온다.
// 다 올라오면 단면 위의 점(손잡이)이 나타나고, 좌우로 끌면 그 높이의 반지름이 바뀐다.
import * as THREE from 'three';
import { LUMP, ONGGI, spaced, ringsTexture } from './profiles.js';

const N = 72;
const HANDLES = [4, 5, 6, 8, 9, 12]; // ONGGI 제어점 가운데 끌 수 있는 것(굽 가운데와 바닥은 고정)

export function makeWheel() {
  const g = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.25, 0.03, 72),
    new THREE.MeshStandardMaterial({ color: '#5a4434', roughness: 0.75 }),
  );
  head.position.y = -0.015;
  g.add(head);

  const ctrl = ONGGI.map(([x, y]) => [x, y]);
  const a = spaced(LUMP, N);
  let b = spaced(ctrl, N);
  const pts = a.map((p) => p.clone());
  const mat = new THREE.MeshStandardMaterial({
    color: '#9c6b4a', roughness: 0.5, side: THREE.DoubleSide, bumpMap: ringsTexture(), bumpScale: 0.8,
  });
  const clay = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), mat);
  g.add(clay);

  let progress = 0;
  let shown = -1;
  function rebuild() {
    const e = progress * progress * (3 - 2 * progress);
    for (let i = 0; i < N; i++) pts[i].lerpVectors(a[i], b[i], e);
    clay.geometry.dispose();
    clay.geometry = new THREE.LatheGeometry(pts, 72);
    shown = e;
  }
  function setProgress(t) {
    progress = t;
    const e = t * t * (3 - 2 * t);
    if (Math.abs(e - shown) > 0.002) rebuild();
  }
  function setCtrl(i, x) {
    ctrl[i][0] = THREE.MathUtils.clamp(x, 0.03, 0.27);
    b = spaced(ctrl, N);
    rebuild();
  }
  return {
    object: g,
    setProgress,
    get progress() { return progress; },
    handles: HANDLES.map((i) => ({ index: i, get x() { return ctrl[i][0]; }, get y() { return ctrl[i][1]; }, set: (x) => setCtrl(i, x) })),
  };
}
