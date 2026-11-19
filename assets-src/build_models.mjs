// 도자기 세 점(옹기 항아리 · 청자 사발 · 백자 잔)과 받침대를 단면 윤곽을 돌려(lathe) 만들고 glb 로 내보낸다.
// - textures.py 가 만든 PNG 를 붙인다. 텍스처 v 구간은 PROFILE_V 와 맞춘다(바깥 → 입술 → 안쪽).
// - 결과: assets-src/raw/onggi-set.raw.glb(PNG, 압축 없음) · public/assets/onggi-set.glb(Draco + WebP)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, textureCompress, dedup, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TEX = path.join(HERE, 'textures');
const OUT = path.join(ROOT, 'public', 'assets');

// 단위는 미터. outer 는 굽 바닥 가운데(x=0)에서 입술 바깥까지, inner 는 입술 안쪽에서 안쪽 바닥 가운데(x=0)까지.
const PIECES = {
  jar: {
    v: [0.80, 0.84],
    outer: [[0, 0], [0.05, 0], [0.088, 0.001], [0.096, 0.008], [0.13, 0.06], [0.175, 0.15], [0.198, 0.25],
      [0.195, 0.3], [0.17, 0.355], [0.132, 0.388], [0.116, 0.404], [0.118, 0.42], [0.127, 0.435]],
    lip: { c: [0.122, 0.435], r: 0.005 },
    inner: [[0.117, 0.435], [0.106, 0.42], [0.105, 0.405], [0.12, 0.385], [0.16, 0.35], [0.185, 0.3],
      [0.188, 0.25], [0.165, 0.15], [0.12, 0.06], [0.08, 0.022], [0.04, 0.018], [0, 0.018]],
    n: [150, 12, 120], segments: 160,
  },
  bowl: {
    v: [0.46, 0.52],
    outer: [[0, 0.006], [0.02, 0.006], [0.034, 0.005], [0.037, 0], [0.043, 0], [0.046, 0.009], [0.052, 0.012],
      [0.075, 0.026], [0.097, 0.047], [0.107, 0.066], [0.111, 0.076]],
    lip: { c: [0.108, 0.076], r: 0.003 },
    inner: [[0.105, 0.076], [0.101, 0.066], [0.091, 0.048], [0.07, 0.029], [0.04, 0.018], [0.02, 0.0155], [0, 0.015]],
    n: [90, 10, 70], segments: 128,
  },
  cup: {
    v: [0.46, 0.52],
    outer: [[0, 0.004], [0.012, 0.004], [0.019, 0.003], [0.021, 0], [0.025, 0], [0.026, 0.007], [0.03, 0.012],
      [0.036, 0.03], [0.039, 0.05], [0.041, 0.068], [0.043, 0.075]],
    lip: { c: [0.041, 0.075], r: 0.002 },
    inner: [[0.039, 0.075], [0.0375, 0.066], [0.036, 0.05], [0.033, 0.03], [0.027, 0.017], [0.015, 0.0125], [0, 0.012]],
    n: [80, 8, 60], segments: 96,
  },
};

const sample = (ctrl, n) =>
  new THREE.SplineCurve(ctrl.map(([x, y]) => new THREE.Vector2(x, y))).getSpacedPoints(n - 1);

function arcV(points, a, b) {
  const len = [0];
  for (let i = 1; i < points.length; i++) len.push(len[i - 1] + points[i].distanceTo(points[i - 1]));
  const total = len[len.length - 1] || 1;
  return len.map((s) => a + (b - a) * (s / total));
}

function profile(p) {
  const outer = sample(p.outer, p.n[0]);
  const lip = [];
  for (let k = 1; k < p.n[1] - 1; k++) {
    const t = (Math.PI * k) / (p.n[1] - 1);
    lip.push(new THREE.Vector2(p.lip.c[0] + p.lip.r * Math.cos(t), p.lip.c[1] + p.lip.r * Math.sin(t)));
  }
  const inner = sample(p.inner, p.n[2]);
  const [vo, vl] = p.v;
  const v = [...arcV(outer, 0, vo), ...arcV([outer.at(-1), ...lip, inner[0]], vo, vl).slice(1, -1), ...arcV(inner, vl, 1)];
  const points = [...outer, ...lip, ...inner].map((q) => new THREE.Vector2(Math.max(0, q.x), q.y));
  points[0].x = 0;
  points[points.length - 1].x = 0;
  return { points, v };
}

function latheWithUV(points, v, segments) {
  const g = new THREE.LatheGeometry(points, segments);
  const uv = g.attributes.uv;
  const n = points.length;
  for (let i = 0; i <= segments; i++) for (let j = 0; j < n; j++) uv.setXY(i * n + j, i / segments, v[j]);
  return g;
}

function plinth() {
  const R = 0.42, H = 0.05, r = 0.008;
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(R - r, 0)];
  for (let k = 1; k < 8; k++) { const t = -Math.PI / 2 + (Math.PI / 2) * (k / 8); pts.push(new THREE.Vector2(R - r + r * Math.cos(t), r + r * Math.sin(t))); }
  pts.push(new THREE.Vector2(R, r), new THREE.Vector2(R, H - r));
  for (let k = 1; k < 8; k++) { const t = (Math.PI / 2) * (k / 8); pts.push(new THREE.Vector2(R - r + r * Math.cos(t), H - r + r * Math.sin(t))); }
  pts.push(new THREE.Vector2(R - r, H), new THREE.Vector2(0, H));
  return new THREE.LatheGeometry(pts, 128);
}

function addMesh(doc, buffer, scene, name, geom, material, translation) {
  const acc = (type, array) => doc.createAccessor(`${name}_${type}`).setType(type).setArray(array).setBuffer(buffer);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', new Float32Array(geom.attributes.position.array)))
    .setAttribute('NORMAL', acc('VEC3', new Float32Array(geom.attributes.normal.array)))
    .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(geom.attributes.uv.array)))
    .setIndices(doc.createAccessor(`${name}_idx`).setType('SCALAR').setArray(new Uint32Array(geom.index.array)).setBuffer(buffer))
    .setMaterial(material);
  const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)).setTranslation(translation);
  scene.addChild(node);
}

function texturedMaterial(doc, name, roughness = 1) {
  const tex = (slot) => doc.createTexture(`${name}_${slot}`)
    .setImage(new Uint8Array(fs.readFileSync(path.join(TEX, `${name}_${slot}.png`))))
    .setMimeType('image/png').setURI(`${name}_${slot}.png`);
  const orm = tex('orm');
  return doc.createMaterial(name)
    .setBaseColorTexture(tex('basecolor'))
    .setMetallicRoughnessTexture(orm).setOcclusionTexture(orm)
    .setNormalTexture(tex('normal'))
    .setMetallicFactor(1).setRoughnessFactor(roughness);
}

const PLINTH_TOP = 0.05;
const LAYOUT = { jar: [-0.12, PLINTH_TOP, -0.08], bowl: [0.17, PLINTH_TOP, 0.1], cup: [0.05, PLINTH_TOP, 0.24] };

function buildDocument() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('onggi-set');
  doc.getRoot().setDefaultScene(scene);
  for (const [name, spec] of Object.entries(PIECES)) {
    const { points, v } = profile(spec);
    addMesh(doc, buffer, scene, name, latheWithUV(points, v, spec.segments), texturedMaterial(doc, name), LAYOUT[name]);
  }
  const stone = doc.createMaterial('plinth').setBaseColorFactor([0.62, 0.6, 0.56, 1]).setRoughnessFactor(0.9).setMetallicFactor(0);
  addMesh(doc, buffer, scene, 'plinth', plinth(), stone, [0, 0, 0]);
  return doc;
}

const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)}KB`;

// --print-v: 바깥 윤곽 제어점마다 텍스처 v 값을 출력한다(textures.py 의 굽 · 유약 경계를 맞출 때 쓴다).
function printV() {
  for (const [name, spec] of Object.entries(PIECES)) {
    const { points, v } = profile(spec);
    const rows = spec.outer.map(([x, y]) => {
      let best = 0;
      points.forEach((q, i) => { if (i < spec.n[0] && q.distanceTo(new THREE.Vector2(x, y)) < points[best].distanceTo(new THREE.Vector2(x, y))) best = i; });
      return `(${x}, ${y}) v=${v[best].toFixed(3)}`;
    });
    console.log(name + '\n  ' + rows.join('\n  '));
  }
}

async function main() {
  if (process.argv.includes('--print-v')) return printV();
  fs.mkdirSync(OUT, { recursive: true });
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
  });

  const raw = path.join(ROOT, 'assets-src', 'raw', 'onggi-set.raw.glb');
  fs.mkdirSync(path.dirname(raw), { recursive: true });
  await io.write(raw, buildDocument());

  const doc = buildDocument();
  await doc.transform(
    dedup(),
    prune(),
    draco({ method: 'edgebreaker', quantizePosition: 14 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85 }),
  );
  const packed = path.join(OUT, 'onggi-set.glb');
  await io.write(packed, doc);

  let verts = 0, tris = 0;
  for (const mesh of buildDocument().getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    verts += p.getAttribute('POSITION').getCount(); tris += p.getIndices().getCount() / 3;
  }
  console.log(`정점 ${verts.toLocaleString()} · 삼각형 ${tris.toLocaleString()}`);
  console.log(`압축 없음(PNG): ${kb(raw)}  →  Draco + WebP: ${kb(packed)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
