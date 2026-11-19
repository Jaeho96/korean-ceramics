// glb 를 build_models.mjs 와 같은 설정(Draco edgebreaker · 위치 14비트 + WebP 품질 85)으로 압축한다.
// 사용: node assets-src/compress.mjs <입력.glb> <출력.glb>
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, textureCompress, dedup, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
if (!input || !output) { console.error('사용: node assets-src/compress.mjs <입력.glb> <출력.glb>'); process.exit(1); }

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'draco3d.decoder': await draco3d.createDecoderModule(),
});
const doc = await io.read(input);
await doc.transform(
  dedup(),
  prune(),
  draco({ method: 'edgebreaker', quantizePosition: 14 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85 }),
);
await io.write(output, doc);

const root = doc.getRoot();
const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)}KB`;
for (const m of root.listMaterials()) {
  const slots = ['BaseColor', 'MetallicRoughness', 'Normal', 'Occlusion']
    .filter((s) => m[`get${s}Texture`]?.()).join(' · ');
  console.log(`재질 ${m.getName()}: ${slots}`);
}
console.log(`${kb(input)} → ${kb(output)}`);
