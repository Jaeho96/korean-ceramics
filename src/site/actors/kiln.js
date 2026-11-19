// 04 가마: 청자 매병이 불에 달아올랐다가 식으면서 표면에 빙렬이 하나씩 생긴다.
// 스크롤 진행(0~1)에 따라 uHeat 이 올랐다 내리고, 식는 동안 uCrackle 이 늘어 보로노이 칸 경계가 차례로 드러난다.
import * as THREE from 'three';
import { MAEBYEONG, spaced } from './profiles.js';
import { withObjectPosition } from './shaders.js';

export function makeCeladonMaterial(crackleInit = 0) {
  const uniforms = { uHeat: { value: 0 }, uCrackle: { value: crackleInit } };
  const mat = new THREE.MeshStandardMaterial({ color: '#8fae9b', roughness: 0.14 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    withObjectPosition(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uHeat;\nuniform float uCrackle;')
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        // 화면에서 1~2px 로 보이도록 조각과 선 굵기를 잡았다(실제 빙렬보다 굵다)
        vec2 c1 = voronoi(vObj * 22.0);
        vec2 c2 = voronoi(vObj * 58.0 + 3.7);
        float line1 = (1.0 - smoothstep(0.02, 0.075, c1.x)) * step(c1.y, uCrackle);
        float line2 = (1.0 - smoothstep(0.02, 0.07, c2.x)) * step(c2.y, uCrackle * 0.85);
        float crack = max(line1, line2 * 0.55);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.24, 0.19), crack * 0.75);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.20, 0.08), uHeat * 0.35);`)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.36, 0.08) * pow(uHeat, 1.5) * 1.6;`);
  };
  return { mat, uniforms };
}

export function makeKiln() {
  const { mat, uniforms } = makeCeladonMaterial(0);
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(spaced(MAEBYEONG, 80), 96), mat);
  function setProgress(p) {
    const heat = p < 0.45 ? THREE.MathUtils.smoothstep(p, 0.02, 0.35) : 1 - THREE.MathUtils.smoothstep(p, 0.45, 0.8);
    uniforms.uHeat.value = heat;
    uniforms.uCrackle.value = THREE.MathUtils.smoothstep(p, 0.55, 0.95);
    return heat;
  }
  return { object: mesh, setProgress, uniforms };
}
