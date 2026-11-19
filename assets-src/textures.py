#!/usr/bin/env python3
"""도자기 세 점(옹기 항아리 · 청자 사발 · 백자 잔)의 PBR 텍스처를 코드로 만든다.

- 텍스처는 가로(u)가 기물 둘레, 세로(v)가 단면 윤곽을 따라간다. 이미지의 0행이 v=0(굽 바닥 가운데)이다.
- 가로는 이음매 없이 이어지도록 FFT 로 만든 주기 잡음만 쓴다.
- v 구간은 build_models.mjs 의 PROFILE_V 와 맞춘다(바깥 → 입술 → 안쪽).
- 결과: textures/<이름>_basecolor.png · _orm.png(R=AO, G=거칠기, B=금속성) · _normal.png
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "textures")

# build_models.mjs 와 같은 값: 바깥면 끝, 입술 끝(그 뒤는 안쪽 면)
PROFILE_V = {
    "jar": (0.80, 0.84),
    "bowl": (0.46, 0.52),
    "cup": (0.46, 0.52),
}


def band_noise(h, w, rng, cx, cy=None):
    """주기 경계(이음매 없음)를 갖는 저주파 잡음. cx, cy 는 가로 · 세로 차단 주파수(1/픽셀)."""
    cy = cx if cy is None else cy
    white = rng.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    spec = np.fft.fft2(white) * np.exp(-((fx / cx) ** 2 + (fy / cy) ** 2))
    n = np.real(np.fft.ifft2(spec))
    return n / (3 * n.std() + 1e-9)


def fbm(h, w, rng, base=0.004, octaves=5):
    out = np.zeros((h, w))
    amp, f = 1.0, base
    for _ in range(octaves):
        out += amp * band_noise(h, w, rng, f)
        amp *= 0.5
        f *= 2.0
    return out / 1.9


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    t = t[..., None] if np.ndim(t) == 2 else t
    return np.asarray(a, float) * (1 - t) + np.asarray(b, float) * t


def voronoi_edges(h, w, rng, cell):
    """가로는 주기 경계인 지터 격자 보로노이. (가장 가까운 점과 두 번째 점 거리 차)를 돌려준다."""
    gy, gx = int(np.ceil(h / cell)), w // cell
    jit = rng.random((gy, gx, 2))
    ys, xs = np.mgrid[0:h, 0:w].astype(float)
    cy, cx = (ys // cell).astype(int), (xs // cell).astype(int)
    d1 = np.full((h, w), 1e9)
    d2 = np.full((h, w), 1e9)
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            ny = np.clip(cy + oy, 0, gy - 1)
            nx = (cx + ox) % gx
            px = (cx + ox) * cell + jit[ny, nx, 0] * cell
            py = ny * cell + jit[ny, nx, 1] * cell
            d = np.hypot(xs - px, ys - py)
            closer = d < d1
            d2 = np.where(closer, d1, np.minimum(d2, d))
            d1 = np.where(closer, d, d1)
    return d2 - d1


def throwing_rings(h, w, rng, strength=1.0):
    """물레 자국: 세로(v)로만 빠르게 바뀌고 가로로는 아주 느리게 바뀌는 잡음."""
    return strength * (band_noise(h, w, rng, 0.002, 0.03) + 0.5 * band_noise(h, w, rng, 0.004, 0.08))


def normal_from_height(hmap, strength):
    dx = (np.roll(hmap, -1, axis=1) - np.roll(hmap, 1, axis=1)) * strength
    dy = (np.roll(hmap, -1, axis=0) - np.roll(hmap, 1, axis=0)) * strength
    n = np.dstack([-dx, -dy, np.ones_like(hmap)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


def save(name, base, rough, height, normal_strength, ao=None):
    os.makedirs(OUT, exist_ok=True)
    to8 = lambda a: np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(to8(base / 255.0)).save(os.path.join(OUT, f"{name}_basecolor.png"))
    ao = np.ones_like(rough) if ao is None else ao
    orm = np.dstack([ao, rough, np.zeros_like(rough)])
    Image.fromarray(to8(orm)).save(os.path.join(OUT, f"{name}_orm.png"))
    Image.fromarray(to8(normal_from_height(height, normal_strength))).save(os.path.join(OUT, f"{name}_normal.png"))
    print("저장:", name, base.shape[1], "x", base.shape[0])


def make_jar(size=2048, seed=7):
    """옹기: 검붉은 잿물 유약이 몸통을 덮고, 아래쪽은 흙이 드러나며 유약이 흘러내린다. 어깨에 손가락으로 그은 난초 무늬."""
    rng = np.random.default_rng(seed)
    h = w = size
    v = (np.arange(h)[:, None] + 0.5) / h * np.ones((1, w))
    u = (np.arange(w)[None, :] + 0.5) / w * np.ones((h, 1))
    outer_end, lip_end = PROFILE_V["jar"]

    # 유약 경계: 기본 높이 + 흘러내린 자국(가로 위치마다 아래로 늘어진 혀 모양)
    # 바닥 밑면은 v<0.139, 굽 옆면 y=6cm 가 v≈0.22(build_models.mjs --print-v). 흙이 드러난 띠는 옆면 아래쪽에 둔다.
    edge = 0.235 + 0.012 * band_noise(1, w, rng, 0.01)[0]
    uu = np.arange(w) / w
    for _ in range(26):
        c, wid, length = rng.random(), 0.004 + 0.012 * rng.random(), 0.015 + 0.06 * rng.random() ** 2
        d = np.minimum(np.abs(uu - c), 1 - np.abs(uu - c)) / wid
        edge = edge - length * np.sqrt(np.clip(1 - d ** 2, 0, 1))
    edge = np.maximum(edge, 0.15)[None, :]
    glaze = smoothstep(edge - 0.002, edge + 0.002, v)
    thin = 1 - smoothstep(edge, edge + 0.035, v)  # 경계 근처는 유약이 얇아 호박색

    n1 = fbm(h, w, rng, 0.003)
    n2 = band_noise(h, w, rng, 0.05)
    clay = mix([150, 84, 52], [118, 62, 38], smoothstep(-0.4, 0.6, n1))
    grit = (band_noise(h, w, rng, 0.25) > 0.42).astype(float)
    clay = mix(clay, [205, 160, 120], grit * 0.8)

    dark = mix([30, 19, 14], [62, 36, 22], smoothstep(-0.5, 0.8, n1 + 0.3 * n2))
    amber = [128, 66, 30]
    glz = mix(dark, amber, thin * 0.9)

    # 입술과 안쪽: 입술은 얇은 유약, 안쪽은 어두운 유약
    lip = smoothstep(outer_end - 0.006, outer_end, v) * (1 - smoothstep(lip_end, lip_end + 0.006, v))
    glz = mix(glz, mix(amber, dark, 0.4), lip * 0.8)

    # 어깨의 난초 무늬: 손가락으로 유약을 닦아 낸 굵은 곡선
    stroke = np.zeros((h, w))
    for k in range(7):
        u0 = k / 7 + 0.03 * rng.random()
        span = 0.08 + 0.04 * rng.random()
        v0 = 0.60 + 0.03 * rng.random()
        amp_ = 0.035 + 0.02 * rng.random()
        du = (u - u0) % 1.0
        inside = du < span
        t = du / span
        curve = v0 + amp_ * np.sin(np.pi * t * (1.2 + 0.6 * rng.random())) - 0.02 * t
        width = 0.0045 * np.sin(np.pi * np.clip(t, 0, 1)) ** 0.6
        stroke = np.maximum(stroke, inside * (1 - smoothstep(width * 0.6, width, np.abs(v - curve))))
    stroke *= glaze * (v < outer_end)
    glz = mix(glz, [150, 82, 40], stroke * 0.85)

    rust = (band_noise(h, w, rng, 0.3) > 0.66).astype(float) * glaze
    glz = mix(glz, [96, 48, 26], rust * 0.4)

    base = mix(clay, glz, glaze)

    rings = throwing_rings(h, w, rng)
    height = rings * (0.35 - 0.2 * glaze) + 0.5 * glaze * (1 - thin * 0.3) - 0.35 * stroke + 0.08 * grit * (1 - glaze)
    rough = 0.86 + 0.06 * n2
    rough = rough * (1 - glaze) + glaze * (0.2 + 0.05 * n2 + 0.2 * stroke + 0.1 * thin)
    ao = 1 - 0.35 * smoothstep(lip_end, 1.0, v)  # 안쪽 깊은 곳은 어둡게
    save("jar", base, np.clip(rough, 0.05, 1), height, 4.0, ao)


def make_bowl(size=1024, seed=11):
    """청자 사발: 비색 유약, 유약 속 빙렬(잔금), 안쪽 바닥에 고인 짙은 유약, 굽은 흙이 드러난다."""
    rng = np.random.default_rng(seed)
    h = w = size
    v = (np.arange(h)[:, None] + 0.5) / h * np.ones((1, w))
    outer_end, lip_end = PROFILE_V["bowl"]
    n1 = fbm(h, w, rng, 0.004)
    base = mix([150, 176, 156], [128, 160, 140], smoothstep(-0.6, 0.6, n1))
    pool = smoothstep(0.85, 1.0, v) + (1 - smoothstep(0.18, 0.27, v)) * 0.6
    base = mix(base, [92, 128, 108], np.clip(pool, 0, 1) * 0.7)
    lip = smoothstep(outer_end - 0.01, outer_end, v) * (1 - smoothstep(lip_end, lip_end + 0.01, v))
    base = mix(base, [176, 190, 172], lip * 0.6)  # 입술은 유약이 얇아 밝다

    c1 = 1 - smoothstep(0.6, 1.6, voronoi_edges(h, w, rng, 64))
    c2 = 1 - smoothstep(0.4, 1.1, voronoi_edges(h, w, rng, 22))
    # 안쪽 바닥 가운데(v→1)는 둘레가 한 점으로 모여 무늬가 뭉치므로 빙렬을 흐린다
    crackle = np.clip(c1 * 0.5 + c2 * 0.5, 0, 1) * (1 - smoothstep(0.93, 0.985, v))
    base = mix(base, [104, 112, 92], crackle * 0.55)

    foot = 1 - smoothstep(0.165, 0.178, v)  # 굽 바깥 윗면 v=0.170 까지 흙
    sand = band_noise(h, w, rng, 0.2)
    base = mix(base, mix([186, 168, 146], [150, 132, 112], smoothstep(-0.3, 0.6, sand)), foot)

    rings = throwing_rings(h, w, rng, 0.6)
    height = rings * 0.25 - 0.06 * crackle + foot * (0.2 * sand)
    rough = 0.13 + 0.03 * n1 + foot * 0.7
    save("bowl", base, np.clip(rough, 0.05, 1), height, 3.0)


def make_cup(size=1024, seed=23):
    """백자 잔: 푸른 기 도는 흰 유약, 고인 곳은 옅은 청색, 드문드문 철분 점, 물레 자국이 뚜렷하다."""
    rng = np.random.default_rng(seed)
    h = w = size
    v = (np.arange(h)[:, None] + 0.5) / h * np.ones((1, w))
    outer_end, lip_end = PROFILE_V["cup"]
    n1 = fbm(h, w, rng, 0.004)
    base = mix([238, 235, 225], [228, 226, 218], smoothstep(-0.5, 0.5, n1))
    pool = smoothstep(0.9, 1.0, v) + (1 - smoothstep(0.16, 0.26, v)) * 0.8
    base = mix(base, [210, 220, 226], np.clip(pool, 0, 1) * 0.6)
    spots = (band_noise(h, w, rng, 0.35) > 0.62).astype(float)
    base = mix(base, [96, 70, 50], spots * 0.8)
    foot = 1 - smoothstep(0.146, 0.158, v)  # 굽 바깥 윗면 v=0.151 까지 흙
    sand = band_noise(h, w, rng, 0.2)
    base = mix(base, mix([220, 204, 176], [196, 178, 150], smoothstep(-0.3, 0.6, sand)), foot)

    rings = throwing_rings(h, w, rng, 1.0)
    outer = v < outer_end
    height = rings * (0.5 * outer + 0.25 * (1 - outer)) + foot * 0.2 * sand
    rough = 0.2 + 0.04 * n1 + foot * 0.65
    save("cup", base, np.clip(rough, 0.05, 1), height, 3.5)


if __name__ == "__main__":
    make_jar()
    make_bowl()
    make_cup()
