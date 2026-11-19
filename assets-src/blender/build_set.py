"""Blender 로 도자기 세트(옹기 항아리 · 청자 사발 · 백자 잔 · 받침대)를 다시 만든다(2026-11-18).

실행: blender -b --factory-startup -P assets-src/blender/build_set.py -- <프로젝트 루트>

- 모양: build_models.mjs 와 같은 단면을 돌리되, 손으로 빚은 듯한 찌그러짐 · 타원 · 기울어짐 · 입술 물결을 더한다.
- 질감: 셰이더 노드(물체 좌표 3D 잡음 · 보로노이 빙렬 · 물레 자국 범프 · 안쪽에 고이는 유약)로 만들고
  Cycles 로 이미지 텍스처에 굽는다(색 · 거칠기 · 노멀 · AO). AO 는 다른 물체까지 계산해 받침대에 접지 그늘이 생긴다.
- 결과: assets-src/blender/textures/*.png, assets-src/blender/onggi-set.blend(절차 재질 그대로),
  assets-src/raw/onggi-set-blender.raw.glb(압축 전, 압축은 compress.mjs 가 한다)
"""
import bpy
import math
import os
import sys
import time

import numpy as np
from mathutils import Vector, noise

ROOT = os.path.abspath(sys.argv[sys.argv.index("--") + 1]) if "--" in sys.argv else os.getcwd()
TEX_DIR = os.path.join(ROOT, "assets-src", "blender", "textures")
BLEND_OUT = os.path.join(ROOT, "assets-src", "blender", "onggi-set.blend")
GLB_OUT = os.path.join(ROOT, "assets-src", "raw", "onggi-set-blender.raw.glb")
T0 = time.time()


def log(*a):
    print(f"[{time.time() - T0:6.1f}s]", *a, flush=True)


# ---------------------------------------------------------------- 단면(build_models.mjs 와 같은 값)
PIECES = {
    "jar": dict(v=(0.80, 0.84), segments=160, n=(150, 12, 120), tex=2048,
                outer=[(0, 0), (0.05, 0), (0.088, 0.001), (0.096, 0.008), (0.13, 0.06), (0.175, 0.15), (0.198, 0.25),
                       (0.195, 0.3), (0.17, 0.355), (0.132, 0.388), (0.116, 0.404), (0.118, 0.42), (0.127, 0.435)],
                lip=((0.122, 0.435), 0.005),
                inner=[(0.117, 0.435), (0.106, 0.42), (0.105, 0.405), (0.12, 0.385), (0.16, 0.35), (0.185, 0.3),
                       (0.188, 0.25), (0.165, 0.15), (0.12, 0.06), (0.08, 0.022), (0.04, 0.018), (0, 0.018)],
                deform=dict(seed=1.7, amp=0.018, oval=0.012, lean=0.006, rim=0.0015)),
    "bowl": dict(v=(0.46, 0.52), segments=128, n=(90, 10, 70), tex=1024,
                 outer=[(0, 0.006), (0.02, 0.006), (0.034, 0.005), (0.037, 0), (0.043, 0), (0.046, 0.009), (0.052, 0.012),
                        (0.075, 0.026), (0.097, 0.047), (0.107, 0.066), (0.111, 0.076)],
                 lip=((0.108, 0.076), 0.003),
                 inner=[(0.105, 0.076), (0.101, 0.066), (0.091, 0.048), (0.07, 0.029), (0.04, 0.018), (0.02, 0.0155), (0, 0.015)],
                 deform=dict(seed=4.2, amp=0.01, oval=0.015, lean=0.0, rim=0.0012)),
    "cup": dict(v=(0.46, 0.52), segments=96, n=(80, 8, 60), tex=1024,
                outer=[(0, 0.004), (0.012, 0.004), (0.019, 0.003), (0.021, 0), (0.025, 0), (0.026, 0.007), (0.03, 0.012),
                       (0.036, 0.03), (0.039, 0.05), (0.041, 0.068), (0.043, 0.075)],
                lip=((0.041, 0.075), 0.002),
                inner=[(0.039, 0.075), (0.0375, 0.066), (0.036, 0.05), (0.033, 0.03), (0.027, 0.017), (0.015, 0.0125), (0, 0.012)],
                deform=dict(seed=9.1, amp=0.012, oval=0.01, lean=0.0015, rim=0.0008)),
}
PLINTH_TOP = 0.05
# three.js 좌표(x, y위, z) → Blender(x, -z, y). glTF 로 내보낼 때 다시 Y 위로 바뀐다.
LAYOUT = {"jar": (-0.12, 0.08, PLINTH_TOP), "bowl": (0.17, -0.1, PLINTH_TOP), "cup": (0.05, -0.24, PLINTH_TOP)}


def catmull(p0, p1, p2, p3, t):
    v0 = [(p2[i] - p0[i]) * 0.5 for i in range(2)]
    v1 = [(p3[i] - p1[i]) * 0.5 for i in range(2)]
    t2, t3 = t * t, t * t * t
    return tuple((2 * p1[i] - 2 * p2[i] + v0[i] + v1[i]) * t3 + (-3 * p1[i] + 3 * p2[i] - 2 * v0[i] - v1[i]) * t2 + v0[i] * t + p1[i]
                 for i in range(2))


def spline_spaced(ctrl, n):
    """THREE.SplineCurve.getSpacedPoints 와 같은 뜻: 곡선 길이 기준으로 고르게 n 점."""
    m = len(ctrl)

    def at(t):
        p = (m - 1) * t
        k = min(int(p), m - 2)
        w = p - k
        return catmull(ctrl[max(k - 1, 0)], ctrl[k], ctrl[min(k + 1, m - 1)], ctrl[min(k + 2, m - 1)], w)

    dense = [at(i / 4000) for i in range(4001)]
    cum = [0.0]
    for a, b in zip(dense, dense[1:]):
        cum.append(cum[-1] + math.dist(a, b))
    out, j = [], 0
    for i in range(n):
        target = cum[-1] * i / (n - 1)
        while j < len(cum) - 2 and cum[j + 1] < target:
            j += 1
        seg = cum[j + 1] - cum[j] or 1
        w = (target - cum[j]) / seg
        out.append(tuple(dense[j][c] + (dense[j + 1][c] - dense[j][c]) * w for c in range(2)))
    return out


def arc_v(points, a, b):
    cum = [0.0]
    for p, q in zip(points, points[1:]):
        cum.append(cum[-1] + math.dist(p, q))
    tot = cum[-1] or 1
    return [a + (b - a) * c / tot for c in cum]


def profile(spec):
    outer = spline_spaced(spec["outer"], spec["n"][0])
    (cx, cy), r = spec["lip"]
    k = spec["n"][1]
    lip = [(cx + r * math.cos(math.pi * i / (k - 1)), cy + r * math.sin(math.pi * i / (k - 1))) for i in range(1, k - 1)]
    inner = spline_spaced(spec["inner"], spec["n"][2])
    vo, vl = spec["v"]
    v = arc_v(outer, 0, vo) + arc_v([outer[-1]] + lip + [inner[0]], vo, vl)[1:-1] + arc_v(inner, vl, 1)
    pts = [(max(0.0, x), y) for x, y in outer + lip + inner]
    pts[0] = (0.0, pts[0][1])
    pts[-1] = (0.0, pts[-1][1])
    return pts, v


def deformer(d, height):
    """손으로 빚은 느낌: 둘레를 따라 바뀌는 반지름 잡음 · 타원 · 위로 갈수록 커지는 기울어짐 · 입술 물결.
    (θ, 높이)만의 함수라 바깥면과 안쪽 면이 같이 움직여 벽 두께가 유지된다."""
    s = d["seed"]

    def f(x, y, th):
        h = y / height
        c, si = math.cos(th), math.sin(th)
        n = noise.noise(Vector((c * 1.2 + s, si * 1.2 - s, y * 7.0)))
        scale = 1 + d["amp"] * n + d["oval"] * math.cos(2 * th + s) * (0.3 + 0.7 * h)
        r = x * scale
        lean = d["lean"] * h * h
        rim = d["rim"] * noise.noise(Vector((c * 2.0 + s, si * 2.0, 5.0))) * max(0.0, (h - 0.8) / 0.2) ** 2
        return (r * c + lean * math.cos(s), r * si + lean * math.sin(s), y + rim)

    return f


def lathe_object(name, pts, v, segments, deform, uv_fn=None):
    """단면을 Z 축으로 돌린 메시. 축 위의 점은 꼭짓점 하나로 모으고, UV 는 면 모서리마다 따로 준다(이음매가 깨끗하다)."""
    verts, rings, info = [], [], []
    for j, (x, y) in enumerate(pts):
        if x < 1e-7:
            verts.append(deform(0.0, y, 0.0))
            rings.append([len(verts) - 1])
            info.append((j, -1))
        else:
            ring = []
            for i in range(segments):
                verts.append(deform(x, y, 2 * math.pi * i / segments))
                ring.append(len(verts) - 1)
                info.append((j, i))
            rings.append(ring)
    faces = []
    for j in range(len(pts) - 1):
        a, b = rings[j], rings[j + 1]
        for i in range(segments):
            i1 = (i + 1) % segments
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                faces.append((a[0], b[i1], b[i]))
            elif len(b) == 1:
                faces.append((a[i], a[i1], b[0]))
            else:
                faces.append((a[i], a[i1], b[i1], b[i]))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    # 바깥으로 향하게 법선 정리
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.shade_smooth() if hasattr(me, "shade_smooth") else [setattr(p, "use_smooth", True) for p in me.polygons]

    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        ks = [info[me.loops[li].vertex_index][1] for li in poly.loop_indices]
        ring_ks = [k for k in ks if k >= 0]
        wrap = 0 in ring_ks and (segments - 1) in ring_ks
        i_face = segments - 1 if wrap else min(ring_ks)
        for li in poly.loop_indices:
            j, k = info[me.loops[li].vertex_index]
            if k < 0:
                u = (i_face + 0.5) / segments
            elif wrap and k == 0:
                u = 1.0
            else:
                u = k / segments
            uv.data[li].uv = uv_fn(poly, li, j, u) if uv_fn else (u, 1.0 - v[j])
    return obj


def plinth_object():
    R, H, r = 0.42, 0.05, 0.008
    pts = [(0, 0), (R - r, 0)]
    pts += [(R - r + r * math.cos(t), r + r * math.sin(t)) for t in [-math.pi / 2 + math.pi / 2 * k / 8 for k in range(1, 8)]]
    pts += [(R, r), (R, H - r)]
    pts += [(R - r + r * math.cos(t), H - r + r * math.sin(t)) for t in [math.pi / 2 * k / 8 for k in range(1, 8)]]
    pts += [(R - r, H), (0, H)]
    obj_holder = {}

    def uv_fn(poly, li, j, u):
        co = obj_holder["me"].vertices[obj_holder["me"].loops[li].vertex_index].co
        nz = poly.normal.z
        if nz > 0.7:  # 윗면: 평면 투영, 큰 칸
            return (0.4 + co.x / R * 0.4, 0.4 + co.y / R * 0.4)
        if nz < -0.7:  # 밑면: 작은 칸
            return (0.82 + (co.x / R * 0.5 + 0.5) * 0.17, 0.01 + (co.y / R * 0.5 + 0.5) * 0.17)
        return (u, 0.84 + co.z / H * 0.12)  # 옆면 띠

    # uv_fn 이 메시를 봐야 해서 두 번에 나눠 만든다
    obj = lathe_object("plinth", pts, [0] * len(pts), 128, lambda x, y, th: (x * math.cos(th), x * math.sin(th), y))
    obj_holder["me"] = obj.data
    uv = obj.data.uv_layers["UVMap"]
    me = obj.data
    for poly in me.polygons:
        for li in poly.loop_indices:
            u_old = uv.data[li].uv[0]
            uv.data[li].uv = uv_fn(poly, li, 0, u_old)
    return obj


# ---------------------------------------------------------------- 노드 도우미
def srgb(r, g, b):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b), 1.0)


class NT:
    def __init__(self, mat):
        mat.use_nodes = True
        self.nt = mat.node_tree
        self.nt.nodes.clear()
        tc = self.new("ShaderNodeTexCoord")
        self.P = tc.outputs["Object"]
        sep = self.new("ShaderNodeSeparateXYZ")
        self.link(self.P, sep.inputs[0])
        self.x, self.y, self.z = sep.outputs
        uvsep = self.new("ShaderNodeSeparateXYZ")
        self.link(tc.outputs["UV"], uvsep.inputs[0])
        self.v = self.math("SUBTRACT", 1.0, uvsep.outputs[1])  # Blender UV 는 아래가 0 이라 뒤집어 둔 v 를 되돌린다
        self.theta = self.math("ARCTAN2", self.y, self.x)

    def new(self, t, **props):
        n = self.nt.nodes.new(t)
        for k, val in props.items():
            setattr(n, k, val)
        return n

    def link(self, a, b):
        self.nt.links.new(a, b)

    def put(self, sock, val):
        if isinstance(val, bpy.types.NodeSocket):
            self.link(val, sock)
        else:
            sock.default_value = val

    def math(self, op, a, b=0.0, c=None, clamp=False):
        n = self.new("ShaderNodeMath", operation=op, use_clamp=clamp)
        self.put(n.inputs[0], a)
        self.put(n.inputs[1], b)
        if c is not None:
            self.put(n.inputs[2], c)
        return n.outputs[0]

    def _sock(self, socks, name, typ):
        return [s for s in socks if s.name == name and s.type == typ][0]

    def maprange(self, val, a, b, lo=0.0, hi=1.0, smooth=True):
        n = self.new("ShaderNodeMapRange", data_type="FLOAT", interpolation_type="SMOOTHSTEP" if smooth else "LINEAR", clamp=True)
        for name, x in (("Value", val), ("From Min", a), ("From Max", b), ("To Min", lo), ("To Max", hi)):
            self.put(self._sock(n.inputs, name, "VALUE"), x)
        return self._sock(n.outputs, "Result", "VALUE")

    def mixc(self, fac, a, b):
        n = self.new("ShaderNodeMix", data_type="RGBA", blend_type="MIX", clamp_factor=True)
        self.put(self._sock(n.inputs, "Factor", "VALUE"), fac)
        self.put(self._sock(n.inputs, "A", "RGBA"), a)
        self.put(self._sock(n.inputs, "B", "RGBA"), b)
        return self._sock(n.outputs, "Result", "RGBA")

    def mixf(self, fac, a, b):
        n = self.new("ShaderNodeMix", data_type="FLOAT", clamp_factor=True)
        self.put(self._sock(n.inputs, "Factor", "VALUE"), fac)
        self.put(self._sock(n.inputs, "A", "VALUE"), a)
        self.put(self._sock(n.inputs, "B", "VALUE"), b)
        return self._sock(n.outputs, "Result", "VALUE")

    def noise(self, scale, detail=2.0, vec=None, stretch=None):
        src = vec if vec is not None else self.P
        if stretch:
            m = self.new("ShaderNodeMapping")
            self.link(src, m.inputs["Vector"])
            m.inputs["Scale"].default_value = stretch
            src = m.outputs[0]
        n = self.new("ShaderNodeTexNoise")
        self.link(src, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = detail
        return n.outputs["Fac"], n.outputs["Color"]

    def voronoi_edge(self, scale, vec):
        n = self.new("ShaderNodeTexVoronoi", feature="DISTANCE_TO_EDGE")
        self.link(vec, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        return n.outputs["Distance"]

    def rings(self, scale, distortion=3.0):
        n = self.new("ShaderNodeTexWave", wave_type="BANDS", bands_direction="Z")
        self.link(self.P, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        n.inputs["Distortion"].default_value = distortion
        n.inputs["Detail"].default_value = 2.0
        return n.outputs["Fac"]

    def ao_local(self, dist):
        n = self.new("ShaderNodeAmbientOcclusion", only_local=True, samples=16)
        n.inputs["Distance"].default_value = dist
        return n.outputs["AO"]

    def finish(self, base, rough, height, strength, distance):
        bsdf = self.new("ShaderNodeBsdfPrincipled")
        self.put(bsdf.inputs["Base Color"], base)
        self.put(bsdf.inputs["Roughness"], rough)
        bsdf.inputs["Metallic"].default_value = 0.0
        bump = self.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = strength
        bump.inputs["Distance"].default_value = distance
        self.put(bump.inputs["Height"], height)
        self.link(bump.outputs["Normal"], bsdf.inputs["Normal"])
        out = self.new("ShaderNodeOutputMaterial")
        self.link(bsdf.outputs["BSDF"], out.inputs["Surface"])


def mat_jar():
    m = bpy.data.materials.new("jar")
    t = NT(m)
    n_edge, _ = t.noise(6)
    # 높이 방향으로는 거의 안 바뀌는 잡음 = 둘레 위치마다 정해지는 흘러내린 자국(혀 모양)
    streak, _ = t.noise(1.0, 1.0, stretch=(40, 40, 0.4))
    drip = t.maprange(streak, 0.5, 0.66)
    edge = t.math("SUBTRACT", t.math("MULTIPLY_ADD", n_edge, 0.02, 0.066), t.math("MULTIPLY", drip, 0.06))
    dz = t.math("SUBTRACT", t.z, edge)
    glaze_out = t.maprange(dz, -0.0015, 0.0015)
    inner = t.maprange(t.v, 0.795, 0.805)
    glaze = t.math("MAXIMUM", glaze_out, inner)
    thin = t.math("MULTIPLY", t.math("SUBTRACT", 1.0, t.maprange(dz, 0.0, 0.03)), t.math("SUBTRACT", 1.0, inner))

    n_col, _ = t.noise(20, 4)
    dark = t.mixc(n_col, srgb(30, 19, 14), srgb(62, 36, 22))
    amber = srgb(128, 66, 30)
    col = t.mixc(t.math("MULTIPLY", thin, 0.9), dark, amber)
    lip = t.math("MULTIPLY", t.maprange(t.v, 0.795, 0.802), t.math("SUBTRACT", 1.0, t.maprange(t.v, 0.838, 0.845)))
    col = t.mixc(t.math("MULTIPLY", lip, 0.7), col, srgb(85, 46, 24))

    # 어깨의 손가락 물결무늬 두 줄
    n_w, _ = t.noise(8)
    strokes = None
    for zc0, ph in ((0.292, 0.6), (0.262, 2.2)):
        zc = t.math("ADD", t.math("MULTIPLY_ADD", t.math("SINE", t.math("MULTIPLY_ADD", t.theta, 7.0, ph)), 0.011, zc0),
                    t.math("MULTIPLY", t.math("SUBTRACT", n_w, 0.5), 0.006))
        d = t.math("ABSOLUTE", t.math("SUBTRACT", t.z, zc))
        s = t.math("SUBTRACT", 1.0, t.maprange(d, 0.0020, 0.0032))
        strokes = s if strokes is None else t.math("MAXIMUM", strokes, s)
    strokes = t.math("MULTIPLY", strokes, glaze_out)
    col = t.mixc(t.math("MULTIPLY", strokes, 0.85), col, srgb(150, 82, 40))

    rust_n, _ = t.noise(350, 0.0)
    rust = t.math("MULTIPLY", t.maprange(rust_n, 0.74, 0.77), glaze)
    col = t.mixc(t.math("MULTIPLY", rust, 0.45), col, srgb(96, 48, 26))
    ao = t.ao_local(0.03)
    col = t.mixc(t.math("MULTIPLY", t.math("SUBTRACT", 1.0, ao), 0.6), col, srgb(20, 12, 9))  # 안쪽 깊은 곳에 고인 유약

    n_clay, _ = t.noise(25, 4)
    clay = t.mixc(n_clay, srgb(150, 84, 52), srgb(118, 62, 38))
    grit_n, _ = t.noise(500, 0.0)
    grit = t.maprange(grit_n, 0.68, 0.72)
    clay = t.mixc(t.math("MULTIPLY", grit, 0.8), clay, srgb(205, 160, 120))
    base = t.mixc(glaze, clay, col)

    rough_clay = t.math("MULTIPLY_ADD", n_clay, 0.16, 0.78)
    rough_glaze = t.math("ADD", t.math("MULTIPLY_ADD", strokes, 0.2, 0.18), t.math("MULTIPLY", thin, 0.12))
    rough = t.mixf(glaze, rough_clay, rough_glaze)

    rings = t.rings(110)
    h = t.math("MULTIPLY", rings, t.math("MULTIPLY_ADD", glaze, -0.45, 0.6))
    h = t.math("ADD", h, t.math("MULTIPLY", glaze_out, 0.6))
    h = t.math("SUBTRACT", h, t.math("MULTIPLY", strokes, 0.5))
    h = t.math("ADD", h, t.math("MULTIPLY", grit, t.math("SUBTRACT", 1.0, glaze)))
    t.finish(base, rough, h, 0.35, 0.0004)
    return m


def mat_bowl():
    m = bpy.data.materials.new("bowl")
    t = NT(m)
    n1, ncol = t.noise(15, 4)
    base = t.mixc(n1, srgb(150, 176, 156), srgb(128, 160, 140))
    ao = t.ao_local(0.025)
    base = t.mixc(t.math("MULTIPLY", t.math("SUBTRACT", 1.0, ao), 1.3, clamp=True), base, srgb(92, 128, 108))
    lip = t.maprange(t.z, 0.0725, 0.0765)
    base = t.mixc(t.math("MULTIPLY", lip, 0.5), base, srgb(176, 190, 172))

    # 빙렬: 좌표를 살짝 흔든 보로노이 경계, 큰 조각과 작은 조각 두 겹
    off = t.new("ShaderNodeVectorMath", operation="SCALE")
    t.link(ncol, off.inputs[0])
    off.inputs["Scale"].default_value = 0.004
    pd = t.new("ShaderNodeVectorMath", operation="ADD")
    t.link(t.P, pd.inputs[0])
    t.link(off.outputs[0], pd.inputs[1])
    c1 = t.math("SUBTRACT", 1.0, t.maprange(t.voronoi_edge(70, pd.outputs[0]), 0.0, 0.035))
    c2 = t.math("SUBTRACT", 1.0, t.maprange(t.voronoi_edge(220, pd.outputs[0]), 0.0, 0.03))
    crackle = t.math("MAXIMUM", t.math("MULTIPLY", c1, 0.8), t.math("MULTIPLY", c2, 0.45))
    base = t.mixc(t.math("MULTIPLY", crackle, 0.5), base, srgb(104, 112, 92))

    outer = t.math("SUBTRACT", 1.0, t.maprange(t.v, 0.455, 0.465))
    foot = t.math("MULTIPLY", t.math("SUBTRACT", 1.0, t.maprange(t.z, 0.0082, 0.0092)), outer)
    sand, _ = t.noise(200, 2.0)
    base = t.mixc(foot, base, t.mixc(sand, srgb(186, 168, 146), srgb(150, 132, 112)))
    rough = t.mixf(foot, t.math("MULTIPLY_ADD", n1, 0.06, 0.10), 0.8)
    h = t.math("SUBTRACT", t.math("MULTIPLY", t.rings(120, 2.0), 0.25), t.math("MULTIPLY", crackle, 0.3))
    h = t.math("ADD", h, t.math("MULTIPLY", foot, sand))
    t.finish(base, rough, h, 0.25, 0.0003)
    return m


def mat_cup():
    m = bpy.data.materials.new("cup")
    t = NT(m)
    n1, _ = t.noise(15, 4)
    base = t.mixc(n1, srgb(238, 235, 225), srgb(228, 226, 218))
    ao = t.ao_local(0.02)
    base = t.mixc(t.math("MULTIPLY", t.math("SUBTRACT", 1.0, ao), 1.0, clamp=True), base, srgb(205, 216, 224))
    spot_n, _ = t.noise(450, 0.0)
    base = t.mixc(t.math("MULTIPLY", t.maprange(spot_n, 0.75, 0.77), 0.8), base, srgb(96, 70, 50))
    outer = t.math("SUBTRACT", 1.0, t.maprange(t.v, 0.455, 0.465))
    foot = t.math("MULTIPLY", t.math("SUBTRACT", 1.0, t.maprange(t.z, 0.0066, 0.0076)), outer)
    sand, _ = t.noise(200, 2.0)
    base = t.mixc(foot, base, t.mixc(sand, srgb(220, 204, 176), srgb(196, 178, 150)))
    rough = t.mixf(foot, t.math("MULTIPLY_ADD", n1, 0.08, 0.16), 0.8)
    h = t.math("ADD", t.math("MULTIPLY", t.rings(140, 3.0), 0.5), t.math("MULTIPLY", foot, sand))
    t.finish(base, rough, h, 0.45, 0.0003)
    return m


def mat_plinth():
    m = bpy.data.materials.new("plinth")
    t = NT(m)
    n1, _ = t.noise(6, 4)
    base = t.mixc(n1, srgb(212, 208, 200), srgb(196, 192, 184))
    sp, _ = t.noise(400, 0.0)
    base = t.mixc(t.math("MULTIPLY", t.maprange(sp, 0.7, 0.74), 0.5), base, srgb(160, 156, 150))
    n2, _ = t.noise(120, 3)
    t.finish(base, t.math("MULTIPLY_ADD", n1, 0.08, 0.84), n2, 0.06, 0.0005)
    return m


# ---------------------------------------------------------------- 굽기
def setup_cycles():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    device = "CPU"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        if any(d.type == "METAL" for d in prefs.devices):
            sc.cycles.device = "GPU"
            device = "GPU(Metal)"
    except Exception as e:  # noqa: BLE001
        log("GPU 설정 실패, CPU 로 굽는다:", e)
    sc.cycles.use_denoising = False
    sc.render.bake.margin = 16
    if sc.world is None:
        sc.world = bpy.data.worlds.new("World")
    sc.world.light_settings.distance = 0.12  # AO 거리: 받침대 접지 그늘 크기
    log("Cycles 장치:", device)


def bake(obj, mat, kind, size, colorspace, samples, **kw):
    img = bpy.data.images.new(f"{obj.name}_{kind.lower()}", size, size, alpha=False)
    img.colorspace_settings.name = colorspace
    nt = mat.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    for n in nt.nodes:
        n.select = False
    tex.select = True
    nt.nodes.active = tex
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.context.scene.cycles.samples = samples
    bpy.ops.object.bake(type=kind, margin=16, use_clear=True, **kw)
    nt.nodes.remove(tex)
    return img


def pixels(img):
    a = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(-1, 4)


def save(img, name):
    path = os.path.join(TEX_DIR, name)
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    return path


def export_material(obj, base_img, orm_img, nrm_img):
    m = bpy.data.materials.new(obj.name + "_baked")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tb = nt.nodes.new("ShaderNodeTexImage")
    tb.image = base_img
    nt.links.new(tb.outputs["Color"], bsdf.inputs["Base Color"])
    to = nt.nodes.new("ShaderNodeTexImage")
    to.image = orm_img
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(to.outputs["Color"], sep.inputs[0])
    nt.links.new(sep.outputs[1], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs[2], bsdf.inputs["Metallic"])
    # glTF 내보내기는 이 이름의 노드 그룹 Occlusion 입력을 occlusionTexture 로 내보낸다
    grp_tree = bpy.data.node_groups.get("glTF Material Output")
    if grp_tree is None:
        grp_tree = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        grp_tree.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    grp = nt.nodes.new("ShaderNodeGroup")
    grp.node_tree = grp_tree
    nt.links.new(sep.outputs[0], grp.inputs["Occlusion"])
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = nrm_img
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    obj.data.materials.clear()
    obj.data.materials.append(m)


def main():
    os.makedirs(TEX_DIR, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    makers = {"jar": mat_jar, "bowl": mat_bowl, "cup": mat_cup}
    objs = {}
    for name, spec in PIECES.items():
        pts, v = profile(spec)
        height = max(y for _, y in pts)
        obj = lathe_object(name, pts, v, spec["segments"], deformer(spec["deform"], height))
        obj.location = LAYOUT[name]
        obj.data.materials.append(makers[name]())
        objs[name] = (obj, spec["tex"])
    pl = plinth_object()
    pl.data.materials.append(mat_plinth())
    objs["plinth"] = (pl, 2048)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o, _ in objs.values())
    log("메시 완료: 삼각형", f"{tris:,}")

    setup_cycles()
    baked = {}
    for name, (obj, size) in objs.items():
        mat = obj.data.materials[0]
        col = bake(obj, mat, "DIFFUSE", size, "sRGB", 32, pass_filter={"COLOR"})
        rough = bake(obj, mat, "ROUGHNESS", size, "Non-Color", 8)
        nrm = bake(obj, mat, "NORMAL", size, "Non-Color", 8, normal_space="TANGENT")
        ao = bake(obj, mat, "AO", size, "Non-Color", 128)
        orm = bpy.data.images.new(f"{name}_orm", size, size, alpha=False)
        orm.colorspace_settings.name = "Non-Color"
        o = np.zeros((size * size, 4), dtype=np.float32)
        o[:, 0] = pixels(ao)[:, 0]
        o[:, 1] = pixels(rough)[:, 0]
        o[:, 3] = 1.0
        orm.pixels.foreach_set(o.ravel())
        baked[name] = (save(col, f"{name}_basecolor.png"), save(orm, f"{name}_orm.png"), save(nrm, f"{name}_normal.png"))
        baked[name] = (col, orm, nrm)
        log("굽기 완료:", name, size)

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)  # 절차 재질이 남은 상태로 저장(Blender 에서 열어 고칠 수 있다)
    log("blend 저장:", BLEND_OUT)

    for name, (obj, _) in objs.items():
        export_material(obj, *baked[name])
    bpy.ops.export_scene.gltf(filepath=GLB_OUT, export_format="GLB", export_yup=True, export_cameras=False, export_lights=False)
    log("glb 저장:", GLB_OUT, f"{os.path.getsize(GLB_OUT) / 1024:.0f}KB")


if __name__ == "__main__":
    main()
