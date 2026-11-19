// 한국어 · 영어 전환. HTML 에는 한국어가 들어 있고, 영어면 data-i18n 이 붙은 요소의 글을 바꾼다.
// main.js 보다 먼저 실행되는 작은 모듈이라, 영어 방문자에게 한국어가 비쳤다 바뀌는 시간이 짧다.
// 한국어 용어는 국립국어원 로마자 표기법을 따른다(dalhangari, cheongja, baekja, buncheong, onggi).
// 본문 사실의 근거는 docs/content-research.md(2026-11-19 확인). 영어는 같은 사실을 옮긴 것이다.
export const STRINGS = {
  ko: {
    title: '흙으로 빚은 달 · 한국 도자기 이야기',
    description: '달항아리, 청자, 백자, 분청사기, 옹기. 흙이 그릇이 되기까지의 과정을 따라가며 한국 도자기를 소개합니다.',
    toggle: 'EN', toggleLabel: 'Read in English',
    eyebrow: '한국 도자기 이야기',
    h1: '흙으로 빚은 달',
    lede: '달항아리, 청자, 백자, 분청사기, 옹기.<br />흙 한 덩이가 그릇이 되기까지를 따라갑니다.',
    hint: '아래로',
    clayHint: '마우스를 대면 점토가 눌립니다.',
    wheelHint: '스크롤하면 점토가 솟아오릅니다. 다 올라오면 점을 좌우로 끌어 모양을 바꿔 보세요.',
    glazeOnggi: '옹기 잿물', glazeCeladon: '청자 유약', glazeBaekja: '백자 유약', glazePick: '유약 고르기',
    collectionHint: '끌어서 돌려 보세요.',
    clay: '흙', wheel: '물레', glaze: '유약', kiln: '가마', collection: '컬렉션', making: '만든 방법',
    clayBody: '도자기는 흙을 고르는 데서 시작합니다. 장인은 흙을 물에 풀어 가라앉힌 뒤 고운 앙금만 거두는 수비(水飛)로 이물질을 걸러 냅니다. 백자는 순백의 백토로, 청자는 철분이 조금 섞인 회색 흙으로 빚고, 옹기는 흙과 땔감, 유약을 모두 가까운 곳에서 구해 만들었습니다.',
    wheelBody: '장인은 나무 발물레를 시계 방향으로 돌리며 그릇을 세웁니다. 옹기 장인은 흙을 가래떡처럼 늘인 흙가래나 넓게 편 흙판(타래미)으로 몸통을 쌓는데, 어느 쪽을 쓰는지는 지역마다 다릅니다. 달항아리는 너무 커서 물레로 한 번에 올리지 못해 위아래를 따로 빚어 가운데에서 이어 붙였습니다.',
    glazeBody: '고려 사람들은 청자의 푸른빛을 비색(翡色)이라 불렀습니다. 철분이 조금 든 유약을 입혀 산소를 줄인 불(환원염)에서 구우면 회색 흙 위로 맑은 녹청색이 납니다. 분청사기는 회색 흙 위에 흰 흙을 귀얄로 빠르게 바르거나, 흰 흙물에 그릇을 덤벙 담가 꾸몄습니다.',
    kilnBody: '그릇은 두 번 굽습니다. 청자는 850℃ 안팎에서 초벌구이를 하고, 유약을 입힌 뒤 1,200~1,280℃에서 재벌구이를 합니다. 경사면을 따라 터널처럼 길게 쌓은 오름가마(등요)는 고려청자와 조선백자를 굽던 바탕이었습니다.',
    moonName: '달항아리', moonEra: '조선 17세기 후기~18세기 전기',
    moonBody: '높이가 보통 40cm를 넘는 큰 백자 항아리입니다. 둥글고 젖빛 도는 모습이 둥근 달을 떠올리게 해 달항아리라 불리고, 국보 3점과 보물 4점이 "백자 달항아리"라는 이름으로 지정돼 있습니다.',
    celadonName: '고려청자', celadonEra: '고려 9세기 후반~14세기',
    celadonBody: '12세기에 절정을 맞았습니다. 무늬를 파고 다른 흙을 메워 넣는 상감청자는 12세기 중엽에 가장 성했고, 국보 청자 상감운학문 매병은 흑백상감으로 몸통 가득 구름과 학을 새겼습니다.',
    buncheongName: '분청사기', buncheongEra: '조선 15 · 16세기',
    buncheongBody: '회색 흙 위에 흰 흙을 입혀 꾸민 그릇으로, 약 200년 동안 만들었습니다. 도장을 찍는 인화, 바탕을 긁어내는 박지, 귀얄로 바르는 귀얄, 흰 흙물에 담그는 덤벙처럼 꾸미는 방법이 다양합니다.',
    baekjaName: '조선백자', baekjaEra: '조선',
    baekjaBody: '왕실이 쓸 자기는 사옹원이 경기도 광주에 둔 분원(관요)에서 구웠습니다. 무늬 없는 순백자와 함께 코발트 안료로 그린 청화, 산화철로 그린 철화, 산화동으로 색을 낸 진사가 있습니다.',
    onggiName: '옹기', onggiEra: '조선 17세기 무렵부터',
    onggiBody: '장독과 쌀항, 떡을 찌는 시루, 식초를 담는 촛병까지 살림에 두루 쓰던 그릇입니다. 한국민족문화대백과사전은 굽는 동안 생긴 작은 구멍으로 공기가 드나든다고 풀이하며, 옹기가 예부터 "숨쉬는 그릇"으로 여겨졌다고 씁니다.',
    makingBody: '이 사이트의 3D 도자기는 외부 에셋 없이 만들었습니다. 단면 곡선을 돌려 모양을 잡고, 유약 · 빙렬 · 흙의 질감은 Blender 셰이더 노드로 만든 뒤 Cycles 로 텍스처에 구웠습니다. 달항아리 모델은 압축 후 412KB 입니다.',
    statLcp: '첫 화면(LCP)', statLcpV: '0.09초',
    statLong: '긴 작업 합계', statLongV: '0.15초',
    statFps: '스크롤 중 프레임', statFpsV: '72fps',
    statNote: '배포본을 수상작과 같은 도구로 잰 값입니다(2026-11-19, Apple M4 Pro). 같은 도구로 잰 Awwwards 수상작 20곳 가운데 9곳은 LCP 가 4초를 넘었고, 6곳은 50ms 넘는 긴 작업의 합계가 1초를 넘었습니다. 이 사이트는 첫 화면을 미리 찍어 둔 정지 이미지로 띄우고 3D 는 그 뒤에 불러옵니다. 로컬 서버에서 잰 값이라 네트워크 지연은 빠져 있습니다.',
    sourcesTitle: '출처(2026년 11월 확인)',
    srcKhsMoon: '국가유산청, 국보 백자 달항아리(2007-1)',
    srcKhsSagi: '국가유산청, 국가무형유산 사기장',
    srcKhsOnggi: '국가유산청, 국가무형유산 옹기장',
    srcKhsWebzine: '국가유산청, 월간 국가유산사랑(2017년 3월)',
    srcEncyCeladon: '한국민족문화대백과사전, 청자',
    srcEncyBuncheong: '한국민족문화대백과사전, 분청사기',
    srcEncyCeramics: '한국민족문화대백과사전, 도자기',
    srcEncyOnggi: '한국민족문화대백과사전, 옹기',
    srcEncyKiln: '한국민족문화대백과사전, 등요',
    srcNmkMoon: '국립중앙박물관, 백자 달항아리',
  },
  en: {
    title: 'A Moon Shaped from Earth · Korean Ceramics',
    description: 'Moon jars, celadon, white porcelain, buncheong and onggi. Follow a lump of clay as it becomes a vessel, and meet the ceramics of Korea.',
    toggle: '한', toggleLabel: '한국어로 보기',
    eyebrow: 'Korean Ceramics',
    h1: 'A Moon Shaped from Earth',
    lede: 'Moon jars (dalhangari), celadon (cheongja), white porcelain (baekja), buncheong and onggi.<br />Follow a lump of clay as it becomes a vessel.',
    hint: 'Scroll',
    clayHint: 'Move your cursor over the clay to press it.',
    wheelHint: 'Scroll to raise the clay. Once it rises, drag the dots left or right to reshape the jar.',
    glazeOnggi: 'Onggi glaze', glazeCeladon: 'Celadon glaze', glazeBaekja: 'White porcelain glaze', glazePick: 'Choose a glaze',
    collectionHint: 'Drag to turn them around.',
    clay: 'Clay', wheel: 'The Wheel', glaze: 'Glaze', kiln: 'The Kiln', collection: 'Collection', making: 'How This Was Made',
    clayBody: 'A pot begins with choosing the clay. Potters stir it into water, let it settle and keep only the fine sediment, a cleaning step called subi. White porcelain is made from pure white clay and celadon from a grey clay with a little iron, while onggi makers found their clay, firewood and glaze close at hand.',
    wheelBody: 'Potters raise a vessel on a wooden kick wheel turned clockwise. Onggi makers build the body from long coils of clay or from flat slabs (taraemi), and the method depends on the region. A moon jar was too large to throw in one piece, so its upper and lower halves were made separately and joined in the middle.',
    glazeBody: 'The people of Goryeo called the blue-green of their celadon bisaek, a jade-like color. Coated with a glaze containing a little iron and fired in a flame starved of oxygen (reduction firing), grey clay turns a clear green-blue. Buncheong potters brushed white slip quickly over grey clay with a gwiyal brush, or dipped the whole vessel into white slip (deombeong).',
    kilnBody: 'Pots are fired twice. Celadon was first fired at around 850°C, then glazed and fired again at 1,200–1,280°C. The climbing kiln (deungyo), built like a long tunnel up a slope, was the foundation for firing Goryeo celadon and Joseon white porcelain.',
    moonName: 'Moon jar (dalhangari)', moonEra: 'Joseon, late 17th to early 18th century',
    moonBody: 'A large white porcelain jar, usually more than 40 cm tall. Its round, milky form recalls a full moon, which gave it its name. Three are designated National Treasures and four are designated Treasures under the name Baekja Dalhangari (White Porcelain Moon Jar).',
    celadonName: 'Goryeo celadon (cheongja)', celadonEra: 'Goryeo, late 9th to 14th century',
    celadonBody: 'Celadon reached its height in the 12th century. Inlaid celadon, made by carving a design and filling it with clay of another color, flourished most in the mid-12th century. A National Treasure maebyeong vase is inlaid in black and white with clouds and cranes across its whole body.',
    buncheongName: 'Buncheong', buncheongEra: 'Joseon, 15th and 16th centuries',
    buncheongBody: 'Grey stoneware dressed with white slip, made for about 200 years. Potters decorated it in many ways: stamping patterns (inhwa), scraping away the background (bakji), brushing slip with a gwiyal brush, or dipping the pot in slip (deombeong).',
    baekjaName: 'Joseon white porcelain (baekja)', baekjaEra: 'Joseon',
    baekjaBody: 'Porcelain for the royal court was fired at the branch kilns (bunwon) that the Saongwon, the office in charge of royal food, ran in Gwangju, Gyeonggi Province. Besides plain white porcelain there are pieces painted in cobalt blue (cheonghwa), iron brown (cheolhwa) and copper (jinsa).',
    onggiName: 'Onggi', onggiEra: 'From around the 17th century, Joseon',
    onggiBody: 'Everyday earthenware for soy sauce crocks, rice jars, steamers for rice cakes and vinegar bottles. The Encyclopedia of Korean Culture explains that tiny pores formed during firing let air pass through, and notes that onggi has long been seen as a vessel that breathes.',
    makingBody: 'Every 3D vessel on this site was made without third-party assets. Shapes come from rotating a profile curve, and the glaze, crackle and clay textures were built as Blender shader nodes and baked into textures with Cycles. The moon jar model is 412 KB after compression.',
    statLcp: 'First view (LCP)', statLcpV: '0.09 s',
    statLong: 'Long tasks, total', statLongV: '0.15 s',
    statFps: 'While scrolling', statFpsV: '72 fps',
    statNote: 'Measured on the production build with the same tool used for award-winning sites (19 Nov 2026, Apple M4 Pro). Of 20 Awwwards winners measured the same way, 9 took over 4 seconds to LCP and 6 spent more than a second in long tasks over 50 ms. This site shows a pre-rendered still image first and loads 3D afterwards. Measured on a local server, so network latency is not included.',
    sourcesTitle: 'Sources (checked November 2026, in Korean)',
    srcKhsMoon: 'Korea Heritage Service, National Treasure White Porcelain Moon Jar (2007-1)',
    srcKhsSagi: 'Korea Heritage Service, National Intangible Heritage Sagijang (porcelain making)',
    srcKhsOnggi: 'Korea Heritage Service, National Intangible Heritage Onggijang (onggi making)',
    srcKhsWebzine: 'Korea Heritage Service, monthly webzine (March 2017)',
    srcEncyCeladon: 'Encyclopedia of Korean Culture, Celadon',
    srcEncyBuncheong: 'Encyclopedia of Korean Culture, Buncheong',
    srcEncyCeramics: 'Encyclopedia of Korean Culture, Ceramics',
    srcEncyOnggi: 'Encyclopedia of Korean Culture, Onggi',
    srcEncyKiln: 'Encyclopedia of Korean Culture, Climbing kiln',
    srcNmkMoon: 'National Museum of Korea, White Porcelain Moon Jar',
  },
};

const read = () => { try { return localStorage.getItem('lang'); } catch { return null; } };
const write = (v) => { try { localStorage.setItem('lang', v); } catch { /* 사생활 보호 모드 등 */ } };

export function detectLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ko' || q === 'en') return q;
  const saved = read();
  if (saved === 'ko' || saved === 'en') return saved;
  return (navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function applyLang(lang) {
  const t = STRINGS[lang] ?? STRINGS.ko;
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  document.title = t.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.description);
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const v = t[el.dataset.i18n];
    if (v !== undefined) el.innerHTML = v; // 위 표의 고정 문자열만 넣는다
  }
  for (const el of document.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', t[el.dataset.i18nLabel] ?? '');
  const btn = document.querySelector('.lang-toggle');
  if (btn) btn.setAttribute('aria-label', t.toggleLabel);
  document.documentElement.classList.add('i18n-ready');
  dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

applyLang(detectLang());

document.querySelector('.lang-toggle')?.addEventListener('click', () => {
  const next = document.documentElement.lang === 'ko' ? 'en' : 'ko';
  write(next);
  const url = new URL(location.href);
  url.searchParams.set('lang', next);
  history.replaceState(null, '', url);
  applyLang(next);
});
