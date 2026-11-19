// 사이트 진입점. 글자와 스크롤을 먼저 준비하고, 3D 장면(three.js)은 첫 화면이 그려진 뒤 따로 불러온다.
// 첫 화면은 three.js 첫 장면을 미리 찍어 둔 정지 이미지(poster-hero.webp)가 먼저 보이고, 3D 가 준비되면 바꿔 낀다.
// ?poster 는 그 정지 이미지를 찍을 때 쓰는 모드다(글자를 숨기고 회전 · 기울임을 멈춘다, assets-src/poster.mjs).
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const poster = new URLSearchParams(location.search).has('poster');

if (poster) {
  document.documentElement.classList.add('poster-mode');
  import('./scene.js').then((m) => m.start({ reduce: true, poster: true }));
} else {
  if (!reduce) {
    const lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }

  for (const sec of gsap.utils.toArray('.chapter')) {
    gsap.from([...sec.children].filter((el) => !el.classList.contains('glyph')), {
      y: reduce ? 0 : 40, opacity: 0, duration: 1, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: sec, start: 'top 70%' },
    });
    const glyph = sec.querySelector('.glyph');
    if (glyph && !reduce) {
      gsap.fromTo(glyph, { yPercent: 18 }, { yPercent: -18, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  }

  // 장마다 바탕색과 글자색: [바탕, 글자, 흐린 글자, 본문]
  const THEMES = {
    top: ['#f2eee6', '#26221e', '#6f665d', '#3d3630'],
    clay: ['#dcc8b0', '#2a1f17', '#6b5646', '#3a2c22'],
    wheel: ['#e6dccd', '#2a2119', '#6d5f52', '#3d3329'],
    glaze: ['#d5e0d7', '#1f2a24', '#56665c', '#2c3a32'],
    kiln: ['#1a1411', '#f0e6da', '#b5a493', '#e2d5c6'],
    collection: ['#f2eee6', '#26221e', '#6f665d', '#3d3630'],
    making: ['#ebe5da', '#26221e', '#6f665d', '#3d3630'],
  };
  const theme = (id) => {
    const [bg, ink, muted, body] = THEMES[id];
    const dark = id === 'kiln';
    gsap.to(document.documentElement, {
      '--bg': bg, '--ink': ink, '--muted': muted, '--body': body,
      '--line': dark ? 'rgba(240,230,218,.18)' : 'rgba(38,34,30,.15)',
      duration: reduce ? 0 : 0.9, ease: 'power2.out', overwrite: true,
    });
  };
  for (const sec of document.querySelectorAll('main > section')) {
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => self.isActive && theme(sec.id) });
  }

  // 언어를 바꾸면 글 길이가 달라져 장 높이가 바뀔 수 있으니 스크롤 위치 계산을 다시 한다
  addEventListener('langchange', () => ScrollTrigger.refresh());

  const start = () => import('./scene.js').then((m) => m.start({ reduce }));
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 });
  else setTimeout(start, 300);
}
