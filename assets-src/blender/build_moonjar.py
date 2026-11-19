"""달항아리 한 점을 Blender 로 만든다(2026-11-19). 사이트 첫 화면용.

실행: blender -b --factory-startup -P assets-src/blender/build_moonjar.py -- <프로젝트 루트>

- build_set.py 의 단면 · 회전체 · 노드 도우미 · 굽기 함수를 그대로 쓴다.
- 모양: 둥근 몸통, 작은 굽, 짧게 선 입. 몸통 가운데에 위아래를 이어 붙인 듯한 접합선을 살짝 두고,
  윗부분을 조금 비껴 놓아 좌우가 다른 윤곽을 만든다(달항아리 제작법에 대한 사실 확인은 docs/content-research.md 몫).
- 질감: 젖빛 흰 유약, 굽 쪽의 푸른 기, 오래 쓴 그릇의 옅은 얼룩, 드문 철분 점, 모래 묻은 굽.
- 결과: assets-src/blender/textures/moonjar_*.png, assets-src/blender/moonjar.blend, assets-src/raw/moonjar.raw.glb
"""
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_set as B  # noqa: E402

ROOT = B.ROOT
GLB_OUT = os.path.join(ROOT, "assets-src", "raw", "moonjar.raw.glb")
BLEND_OUT = os.path.join(ROOT, "assets-src", "blender", "moonjar.blend")

SPEC = dict(
    v=(0.80, 0.84), segments=180, n=(170, 12, 140), tex=2048,
    outer=[(0, 0.006), (0.05, 0.006), (0.068, 0.005), (0.072, 0), (0.082, 0), (0.085, 0.012), (0.1, 0.03),
           (0.15, 0.085), (0.19, 0.15), (0.212, 0.22), (0.205, 0.29), (0.18, 0.35), (0.14, 0.395), (0.11, 0.418),
           (0.098, 0.426), (0.097, 0.436), (0.1, 0.445)],
    lip=((0.0965, 0.445), 0.0035),
    inner=[(0.093, 0.445), (0.091, 0.435), (0.092, 0.424), (0.105, 0.412), (0.135, 0.39), (0.172, 0.347),
           (0.196, 0.29), (0.203, 0.22), (0.181, 0.15), (0.142, 0.09), (0.095, 0.04), (0.05, 0.022), (0, 0.02)],
)
SEAM_Y = 0.218


def moon_deformer(height):
    seed = 3.3
    base = B.deformer(dict(seed=seed, amp=0.02, oval=0.018, lean=0.004, rim=0.0015), height)

    def f(x, y, th):
        px, py, pz = base(x, y, th)
        c, s = math.cos(th), math.sin(th)
        # 접합선: 가운데 높이에 아주 얕은 띠, 둘레를 따라 굵기가 조금씩 다르다
        wob = 1 + 0.5 * noise.noise(Vector((c * 2.5, s * 2.5, 11.0)))
        bulge = 0.0015 * wob * math.exp(-((y - SEAM_Y) / 0.007) ** 2)
        # 윗부분을 한쪽으로 살짝 비껴 놓는다
        t = min(1.0, max(0.0, (y - (SEAM_Y - 0.01)) / 0.02))
        t = t * t * (3 - 2 * t)
        shift = 0.005 * t
        k = 1 + bulge
        return (px * k + shift * math.cos(seed * 2), py * k + shift * math.sin(seed * 2), pz)

    return f


def mat_moonjar():
    m = bpy.data.materials.new("moonjar")
    t = B.NT(m)
    n1, _ = t.noise(8, 4)
    n2, _ = t.noise(30, 3)
    base = t.mixc(n1, B.srgb(240, 236, 226), B.srgb(232, 229, 220))
    base = t.mixc(t.math("MULTIPLY", n2, 0.25), base, B.srgb(244, 240, 232))
    ao = t.ao_local(0.03)
    low = t.math("SUBTRACT", 1.0, t.maprange(t.z, 0.02, 0.12))  # 굽 가까이 고인 유약은 푸른 기
    blue = t.math("ADD", t.math("MULTIPLY", t.math("SUBTRACT", 1.0, ao), 0.8), t.math("MULTIPLY", low, 0.5))
    base = t.mixc(t.math("MINIMUM", blue, 0.8), base, B.srgb(214, 222, 226))
    # 오래 쓴 그릇의 옅은 얼룩: 큰 무늬 잡음의 일부만, 가장자리는 부드럽게
    stain_n, _ = t.noise(3.5, 3)
    stain = t.maprange(stain_n, 0.6, 0.7)
    base = t.mixc(t.math("MULTIPLY", stain, 0.35), base, B.srgb(206, 186, 160))
    spot_n, _ = t.noise(500, 0.0)
    base = t.mixc(t.math("MULTIPLY", t.maprange(spot_n, 0.77, 0.79), 0.7), base, B.srgb(110, 86, 64))
    outer = t.math("SUBTRACT", 1.0, t.maprange(t.v, 0.795, 0.805))
    foot = t.math("MULTIPLY", t.math("SUBTRACT", 1.0, t.maprange(t.z, 0.0105, 0.0125)), outer)
    sand, _ = t.noise(220, 2.0)
    base = t.mixc(foot, base, t.mixc(sand, B.srgb(218, 200, 172), B.srgb(188, 166, 136)))
    rough = t.mixf(foot, t.math("MULTIPLY_ADD", n2, 0.1, 0.22), 0.85)
    seam = t.math("SUBTRACT", 1.0, t.maprange(t.math("ABSOLUTE", t.math("SUBTRACT", t.z, SEAM_Y)), 0.0, 0.006))
    h = t.math("ADD", t.math("MULTIPLY", t.rings(70, 4.0), 0.15), t.math("MULTIPLY", seam, 0.12))
    h = t.math("ADD", h, t.math("MULTIPLY", foot, sand))
    t.finish(base, rough, h, 0.25, 0.0004)
    return m


def main():
    os.makedirs(B.TEX_DIR, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    pts, v = B.profile(SPEC)
    height = max(y for _, y in pts)
    obj = B.lathe_object("moonjar", pts, v, SPEC["segments"], moon_deformer(height))
    mat = mat_moonjar()
    obj.data.materials.append(mat)
    B.log("메시 완료: 삼각형", f"{sum(len(p.vertices) - 2 for p in obj.data.polygons):,}")
    B.setup_cycles()
    size = SPEC["tex"]
    col = B.bake(obj, mat, "DIFFUSE", size, "sRGB", 32, pass_filter={"COLOR"})
    rough = B.bake(obj, mat, "ROUGHNESS", size, "Non-Color", 8)
    nrm = B.bake(obj, mat, "NORMAL", size, "Non-Color", 8, normal_space="TANGENT")
    ao = B.bake(obj, mat, "AO", size, "Non-Color", 128)
    orm = bpy.data.images.new("moonjar_orm", size, size, alpha=False)
    orm.colorspace_settings.name = "Non-Color"
    o = np.zeros((size * size, 4), dtype=np.float32)
    o[:, 0] = B.pixels(ao)[:, 0]
    o[:, 1] = B.pixels(rough)[:, 0]
    o[:, 3] = 1.0
    orm.pixels.foreach_set(o.ravel())
    B.save(col, "moonjar_basecolor.png")
    B.save(orm, "moonjar_orm.png")
    B.save(nrm, "moonjar_normal.png")
    B.log("굽기 완료")
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    B.export_material(obj, col, orm, nrm)
    bpy.ops.export_scene.gltf(filepath=GLB_OUT, export_format="GLB", export_yup=True, export_cameras=False, export_lights=False)
    B.log("glb 저장:", GLB_OUT, f"{os.path.getsize(GLB_OUT) / 1024:.0f}KB")


main()
