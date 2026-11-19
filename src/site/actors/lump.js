// 01 흙: 점토 덩어리. 마우스(또는 손가락)를 대면 그 자리가 눌려 들어가고 둘레가 조금 밀려 나온다.
// 계획에서는 SDF 로 적었지만, 눌린 자국을 쌓아 두기 쉬운 메시 변형으로 만들었다.
import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function makeLump() {
  let geo = new THREE.IcosahedronGeometry(0.16, 40);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo);
  const pos = geo.attributes.position;
  const noise = new ImprovedNoise();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = noise.noise(v.x * 9, v.y * 9, v.z * 9) * 0.55 + noise.noise(v.x * 24 + 5, v.y * 24, v.z * 24) * 0.18;
    v.multiplyScalar(1 + n * 0.2);
    v.y *= 0.78;
    if (v.y < -0.1) v.y = -0.1 + (v.y + 0.1) * 0.12; // 바닥에 눌린 면
    pos.setXYZ(i, v.x, v.y + 0.1, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#8a6247', roughness: 0.88 }));

  const depth = new Float32Array(pos.count); // 꼭짓점마다 눌린 깊이(너무 깊어지지 않게 막는다)
  const nrm = geo.attributes.normal;
  const local = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const R = 0.045;
  let dirty = false;

  // hit: 월드 좌표의 닿은 점, strength: 0~1
  function press(hit, strength) {
    local.copy(hit);
    mesh.worldToLocal(local);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      const d = p.distanceTo(local);
      if (d > R * 1.7) continue;
      n.fromBufferAttribute(nrm, i);
      if (d < R) {
        if (depth[i] > 0.028) continue;
        const w = (1 - d / R) ** 2 * 0.0035 * strength;
        depth[i] += w;
        p.addScaledVector(n, -w);
      } else {
        const w = Math.sin(((d - R) / (R * 0.7)) * Math.PI) * 0.0009 * strength; // 둘레가 밀려 나온다
        p.addScaledVector(n, w);
      }
      pos.setXYZ(i, p.x, p.y, p.z);
      dirty = true;
    }
  }

  function update() {
    if (!dirty) return;
    dirty = false;
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  return { object: mesh, mesh, press, update };
}
