const album = window.ALBUM;
const tracks = album.tracks;
const $ = id => document.getElementById(id);
const audio = $('audio');
let current = 0, lyricLines = [], lyricRequest = 0, lyricMessage = '가사가 없습니다', lyricSignature = '';
let lyricNodes = [];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let filmAnimation, filmOverlay, tabAnimation, selectedTab = 'tracks', playbackRequest = 0;
function animateFilm(direction) {
  filmAnimation?.cancel();
  filmOverlay?.remove();
  // Track-change film motion is explicitly requested, including on reduced-motion systems.
  const overlay = document.createElement('span');
  overlay.className = 'film-window';
  overlay.setAttribute('aria-hidden', 'true');
  const strip = document.createElement('span');
  strip.className = 'film-strip';
  for (let i = 0; i < 5; i++) {
    const frame = document.createElement('span');
    frame.className = 'film-frame';
    const image = document.createElement('img');
    image.src = 'assets/cover.png'; image.alt = '';
    frame.append(image); strip.append(frame);
  }
  overlay.append(strip); $('info').append(overlay); filmOverlay = overlay;
  const frames = direction < 0
    ? [{ transform: 'translate3d(-80%,0,0)' }, { transform: 'translate3d(0,0,0)' }]
    : [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-80%,0,0)' }];
  overlay.animate([{ opacity: 0 }, { opacity: 1, offset: .08 }, { opacity: 1, offset: .84 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
  const animation = strip.animate(frames, { duration: 900, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  filmAnimation = animation;
  animation.finished.then(() => overlay.remove()).catch(() => overlay.remove());
}
const time = s => Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00';
function renderList() {
  const list = $('list'); list.replaceChildren();
  if (!tracks.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = '트랙이 없습니다'; list.append(empty); return; }
  tracks.forEach((track, i) => { const button = document.createElement('button'); button.className = 'track' + (i === current ? ' selected' : ''); button.setAttribute('aria-label', `${track.title} 재생`); const num = document.createElement('span'); num.className = 'track-num'; num.textContent = String(i + 1).padStart(2, '0'); const name = document.createElement('span'); name.className = 'track-name'; name.textContent = track.title; button.append(num, name); button.addEventListener('click', () => { if (i === current) { audio.currentTime = 0; start(); } else select(i, true); }); list.append(button); });
}
function renderLyrics() {
 const box = $('lyrics'); box.replaceChildren();
 lyricNodes = []; lyricSignature = '';
 if (!lyricLines.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = lyricMessage; box.append(p); return; }
 lyricLines.forEach(line => {
   const p = document.createElement(line.time === null ? 'p' : 'button'); p.className = 'lyric-line';
   const parts = line.parts.map(part => { const span = document.createElement('span'); span.textContent = part.text; span.className = 'lyric-part'; p.append(span); return span; });
   if (line.time !== null) p.addEventListener('click', () => { audio.currentTime = line.time; start(); });
   box.append(p); lyricNodes.push({node:p,parts});
 }); updateLyrics();
}
function updateLyrics() {
  let active = -1, part = -1;
  lyricLines.forEach((line,i) => { if (line.time !== null && line.time <= audio.currentTime) active = i; });
  lyricLines[active]?.parts.forEach((p,i) => { if (p.time !== null && p.time <= audio.currentTime) part = i; });
  const signature = `${active}:${part}`;
  if (signature === lyricSignature) return;
  lyricSignature = signature;
  lyricNodes.forEach((entry,i) => {
    entry.node.classList.toggle('active', i === active);
    entry.node.classList.toggle('timed-chars', lyricLines[i].parts.some(p=>p.time !== null));
    entry.parts.forEach((span,j) => { span.classList.toggle('sung', i === active && lyricLines[i].parts[j].time !== null && j <= part); span.classList.toggle('current-char', i === active && j === part); });
  });
}
async function loadLyrics(track) {
  const request = ++lyricRequest; lyricLines = [];
  lyricMessage = track.lyrics ? '가사를 불러오는 중입니다' : '가사가 없습니다'; renderLyrics();
  if (!track.lyrics) return;
  try {
    const response = await fetch(track.lyrics, {cache:'no-store'});
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const data = await response.text(); if (request !== lyricRequest) return;
    lyricLines = LyricTiming.parse(data); lyricMessage = '가사가 없습니다'; renderLyrics();
  } catch {
    if (request !== lyricRequest) return;
    lyricMessage = location.protocol === 'file:' ? '파일을 직접 열면 가사를 읽을 수 없습니다. 폴더의 preview.cmd를 실행해 로컬 미리보기로 열어주세요.' : '가사를 불러오지 못했습니다. 가사 파일 경로를 확인하고 새로고침해 주세요.';
    renderLyrics();
  }
}
function select(i, autoplay = false) {
  if (!tracks.length) return;
  const previous = current;
  current = (i + tracks.length) % tracks.length;
  playbackRequest++;
  const t = tracks[current];
  audio.src = t.audio;
  $('track-title').textContent = t.title;
  $('track-artist').textContent = t.artist || album.artist;
  const highlight = typeof t.highlight === 'string' ? t.highlight.trim() : '';
  $('track-highlight').textContent = highlight;
  $('track-highlight').hidden = !highlight;
  $('elapsed').textContent = $('duration').textContent = '0:00';
  $('seek').value = 0;
  loadLyrics(t); renderList();
  if (autoplay) start();
  if (current !== previous) animateFilm(i < previous ? -1 : 1);
}
function start() { const request = ++playbackRequest; audio.play().catch(error => { if (request === playbackRequest && error.name !== 'AbortError') $('track-title').textContent = '음원을 재생할 수 없어요'; }); }
$('play').addEventListener('click', () => audio.paused ? start() : audio.pause());
const PREVIOUS_TRACK_WINDOW_SECONDS = 3;
$('previous').addEventListener('click', () => {
  if (audio.currentTime > PREVIOUS_TRACK_WINDOW_SECONDS) {
    audio.currentTime = 0;
    $('elapsed').textContent = '0:00';
    $('seek').value = 0;
    updateLyrics();
  } else {
    select(current - 1, true);
  }
});
$('next').addEventListener('click', () => select(current + 1, true));
const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16l12-8z"/></svg>'; const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
audio.addEventListener('play', () => { $('play').innerHTML = pauseIcon; $('play').setAttribute('aria-label','일시정지'); renderList(); }); audio.addEventListener('pause', () => { $('play').innerHTML = playIcon; $('play').setAttribute('aria-label','재생'); renderList(); }); audio.addEventListener('ended', () => select(current+1,true));
let progressFrame = 0, draggingSeek = false;
function paintProgress() {
  if (!draggingSeek) $('seek').value = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0;
  $('elapsed').textContent = time(audio.currentTime); $('duration').textContent = time(audio.duration);
  updateLyrics();
}
function stopProgress() { cancelAnimationFrame(progressFrame); progressFrame = 0; }
function animateProgress() {
  paintProgress();
  if (!audio.paused && !audio.ended && !document.hidden) progressFrame = requestAnimationFrame(animateProgress);
  else progressFrame = 0;
}
function resumeProgress() { stopProgress(); animateProgress(); }
audio.addEventListener('play', resumeProgress);
audio.addEventListener('pause', () => { stopProgress(); paintProgress(); });
audio.addEventListener('ended', stopProgress);
audio.addEventListener('timeupdate', () => { if (!progressFrame) paintProgress(); });
audio.addEventListener('loadedmetadata', paintProgress);
audio.addEventListener('seeked', paintProgress);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopProgress(); else resumeProgress(); });
$('seek').addEventListener('pointerdown', () => { draggingSeek = true; });
for (const event of ['pointerup','pointercancel']) window.addEventListener(event, () => { draggingSeek = false; paintProgress(); });
$('seek').addEventListener('input', e => { if (Number.isFinite(audio.duration)) { audio.currentTime = Number(e.target.value) / 100 * audio.duration; paintProgress(); } });
const tabIndicator = document.createElement('span');
tabIndicator.className = 'tab-indicator';
tabIndicator.setAttribute('aria-hidden', 'true');
document.querySelector('.tabs').append(tabIndicator);
let indicatorAnimation;
function tab(which) {
  if (which === selectedTab) return;
  selectedTab = which; tabAnimation?.cancel();
  const isTracks = which === 'tracks';
  $('list').hidden = !isTracks; $('lyrics').hidden = isTracks;
  const fromTransform = getComputedStyle(tabIndicator).transform;
  indicatorAnimation?.cancel();
  const endTransform = `translateX(${isTracks ? 0 : 100}%) scaleX(1)`;
  tabIndicator.style.transform = endTransform;
  indicatorAnimation = tabIndicator.animate([
    { transform: fromTransform === 'none' ? 'translateX(0) scaleX(1)' : fromTransform },
    { transform: 'translateX(0) scaleX(2)', offset: .48 },
    { transform: endTransform }
  ], { duration: 760, easing: 'cubic-bezier(.4,0,.2,1)' });
  for (const [id, active] of [['tracks-tab',isTracks],['lyrics-tab',!isTracks]]) { $(id).classList.toggle('active',active); $(id).setAttribute('aria-selected',String(active)); }
  tabAnimation = $(isTracks ? 'list' : 'lyrics').animate([
    { opacity: 0, transform: `translateX(${isTracks ? -18 : 18}px)` },
    { opacity: 1, transform: 'translateX(0)' }
  ], { duration: 600, delay: 100, fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' });
}
$('tracks-tab').addEventListener('click',()=>tab('tracks')); $('lyrics-tab').addEventListener('click',()=>tab('lyrics'));
if (album.introduction.trim()) { $('info').disabled = false; $('intro-text').textContent = album.introduction; $('info').addEventListener('click',()=>$('intro-dialog').showModal()); $('close-dialog').addEventListener('click',()=>$('intro-dialog').close()); }
if (tracks.length) { ['play','previous','next','seek'].forEach(id => $(id).disabled = false); select(0); } else { renderList(); renderLyrics(); }




