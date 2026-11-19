// 첫 화면 정지 이미지(public/poster-hero.webp)를 만든다. 개발 서버의 ?poster 모드에서 three.js 첫 장면을 투명 배경으로 찍는다.
// 사용: npm run dev 를 켠 상태에서 node assets-src/poster.mjs [주소, 기본 http://localhost:5179]
// 정지 이미지는 1440x900 화면(가로/세로 1.6) 기준이고, CSS 가 카메라와 같은 규칙으로 크기를 맞춘다(style.css .poster).
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] || 'http://localhost:5179';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`${base}/?poster&lang=ko`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__posterReady === true, null, { timeout: 30000 });
await page.waitForTimeout(500);
const png = await page.locator('#stage').screenshot({ omitBackground: true });
await browser.close();
const out = path.join(ROOT, 'public', 'poster-hero.webp');
const info = await sharp(png).webp({ quality: 82, alphaQuality: 90 }).toFile(out);
console.log(`정지 이미지: ${out} ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}KB`);
