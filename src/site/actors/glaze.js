// 03 유약: 초벌한 옹기 모양 그릇에 유약을 고르면, 유약이 위에서부터 흘러내리며 덮는다.
// 유약 경계는 셰이더에서 높이(uLevel)와 둘레 잡음으로 정해서, 곳곳에 흘러내린 자국이 생긴다.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ONGGI, spaced, ringsTexture } from './profiles.js';
import { withObjectPosition } from './shaders.js';

export const GLAZES = {
  onggi: { color: '#3b2418', gloss: 0.22, stop: 0.075 },   // 옹기: 아래쪽에 흙이 드러난다
  celadon: { color: '#8fb19c', gloss: 0.1, stop: -0.02 },
  baekja: { color: '#eeede6', gloss: 0.16, stop: -0.02 },
};

export function makeGlaze() {
  const uniforms = {
    uLevel: { value: 0.5 },
    uColor: { value: new THREE.Color(GLAZES.celadon.color) },
    uGloss: { value: GLAZES.celadon.gloss },
  };
  const mat = new THREE.MeshStandardMaterial({
    color: '#cfae90', roughness: 0.9, side: THREE.DoubleSide, bumpMap: ringsTexture(), bumpScale: 0.5,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    withObjectPosition(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uLevel;\nuniform vec3 uColor;\nuniform float uGloss;')
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        float ang = atan(vObj.z, vObj.x);
        float drip = pow(ringNoise(ang, 26.0, 3.1), 3.0) * 0.11 + ringNoise(ang, 61.0, 7.7) * 0.012;
        float edge = uLevel - drip;
        float g = smoothstep(edge - 0.0025, edge + 0.0025, vObj.y);
        float thick = 1.0 - smoothstep(edge, edge + 0.035, vObj.y);  // 흐름 끝은 유약이 두껍게 고인다
        vec3 glazeCol = uColor * (1.0 - 0.22 * thick);
        diffuseColor.rgb = mix(diffuseColor.rgb, glazeCol, g);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, uGloss, g);');
  };
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(spaced(ONGGI, 72), 96), mat);

  let tween;
  function pour(name) {
    const gl = GLAZES[name];
    tween?.kill();
    tween = gsap.timeline()
      .to(uniforms.uLevel, { value: 0.5, duration: uniforms.uLevel.value < 0.45 ? 0.5 : 0, ease: 'power2.in' })
      .add(() => { uniforms.uColor.value.set(gl.color); uniforms.uGloss.value = gl.gloss; })
      .to(uniforms.uLevel, { value: gl.stop, duration: 2.6, ease: 'power1.inOut' });
  }
  return { object: mesh, pour };
}
