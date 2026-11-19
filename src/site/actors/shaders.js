// 유약 · 가마 셰이더가 같이 쓰는 GLSL 조각. MeshStandardMaterial.onBeforeCompile 로 끼워 넣는다.
export const NOISE = /* glsl */ `
float h1(float n) { return fract(sin(n) * 43758.5453); }
// 둘레를 K 칸으로 나눈 주기 잡음(이음매 없음)
float ringNoise(float a, float K, float seed) {
  float x = (a + 3.14159265) / 6.2831853 * K;
  float i = floor(x), f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(h1(mod(i, K) + seed), h1(mod(i + 1.0, K) + seed), u);
}
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}
// 3D 보로노이: x = 경계까지 거리(F2-F1), y = 가장 가까운 칸의 무작위 값
vec2 voronoi(vec3 x) {
  vec3 p = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 b = vec3(float(i), float(j), float(k));
    vec3 h = hash3(p + b);
    vec3 r = b + h - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = h.x; } else if (d < d2) { d2 = d; }
  }
  return vec2(sqrt(d2) - sqrt(d1), id);
}
`;

// 정점 셰이더에 물체 좌표를 넘기는 varying 을 단다
export function withObjectPosition(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = transformed;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vObj;\n${NOISE}`);
}
