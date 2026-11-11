const album = window.ALBUM;
const tracks = album.tracks;
const $ = id => document.getElementById(id);
const audio = $('audio');
let current = 0, lyricLines = [], lyricRequest = 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let filmAnimation, filmOverlay, tabAnimation, selectedTab = 'tracks', playbackRequest = 0;
function animateFilm(direction) {
  filmAnimation?.cancel();
  filmOverlay?.remove();
  if (reducedMotion.matches) return;
  const overlay = document.createElement('span');
  overlay.className = 'film-window';
  overlay.setAttribute('aria-hidden', 'true');
  const strip = document.createElement('span');
  strip.className = 'film-strip';
  for (let i = 0; i < 2; i++) {
    const frame = document.createElement('span');
    frame.className = 'film-frame';
    const image = document.createElement('img');
    image.src = 'assets/cover.png'; image.alt = '';
    frame.append(image); strip.append(frame);
  }
  overlay.append(strip); $('info').append(overlay); filmOverlay = overlay;
  const frames = direction < 0
    ? [{ transform: 'translateY(-50%)', filter: 'blur(0)' }, { transform: 'translateY(-25%)', filter: 'blur(1.5px)', offset: .45 }, { transform: 'translateY(0)', filter: 'blur(0)' }]
    : [{ transform: 'translateY(0)', filter: 'blur(0)' }, { transform: 'translateY(-25%)', filter: 'blur(1.5px)', offset: .45 }, { transform: 'translateY(-50%)', filter: 'blur(0)' }];
  const animation = strip.animate(frames, { duration: 620, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
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
 if (!lyricLines.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = '가사가 없습니다'; box.append(p); return; }
 lyricLines.forEach((line, i) => { const p = document.createElement(line.time === null ? 'p' : 'button'); p.className = 'lyric-line'; p.textContent = line.text; if (line.time !== null) p.addEventListener('click', () => { audio.currentTime = line.time; start(); }); box.append(p); }); updateLyrics();
}
function updateLyrics() { let active = -1; lyricLines.forEach((l,i) => { if (l.time !== null && l.time <= audio.currentTime) active = i; }); document.querySelectorAll('.lyric-line').forEach((el,i) => el.classList.toggle('active', i === active)); }
async function loadLyrics(track) { const request = ++lyricRequest; lyricLines = []; renderLyrics(); if (!track.lyrics) return; try { const response = await fetch(track.lyrics); if (!response.ok) throw Error(); const data = await response.text(); if (request !== lyricRequest) return; lyricLines = data.split(/\r?\n/).filter(line => line.trim()).map(line => { const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/); return m ? {time: Number(m[1])*60+Number(m[2]), text:m[3]} : {time:null,text:line}; }); renderLyrics(); } catch { if (request === lyricRequest) { lyricLines = []; renderLyrics(); } } }
function select(i, autoplay = false) { if (!tracks.length) return; const previous = current; current = (i + tracks.length) % tracks.length; playbackRequest++; const t = tracks[current]; audio.src = t.audio; $('track-title').textContent = t.title; $('track-artist').textContent = t.artist || album.artist; $('elapsed').textContent = $('duration').textContent = '0:00'; $('seek').value = 0; loadLyrics(t); renderList(); if (autoplay) start(); if (current !== previous) animateFilm(i < previous ? -1 : 1); }
function start() { const request = ++playbackRequest; audio.play().catch(error => { if (request === playbackRequest && error.name !== 'AbortError') $('track-title').textContent = '음원을 재생할 수 없어요'; }); }
$('play').addEventListener('click', () => audio.paused ? start() : audio.pause());
$('previous').addEventListener('click', () => { if (audio.currentTime > 5) audio.currentTime = 0; else select(current-1,true); }); $('next').addEventListener('click', () => select(current+1,true));
const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16l12-8z"/></svg>'; const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
audio.addEventListener('play', () => { $('play').innerHTML = pauseIcon; $('play').setAttribute('aria-label','일시정지'); renderList(); }); audio.addEventListener('pause', () => { $('play').innerHTML = playIcon; $('play').setAttribute('aria-label','재생'); renderList(); }); audio.addEventListener('ended', () => select(current+1,true));
audio.addEventListener('timeupdate', () => { $('elapsed').textContent = time(audio.currentTime); $('duration').textContent = time(audio.duration); $('seek').value = audio.duration ? audio.currentTime / audio.duration * 100 : 0; updateLyrics(); }); audio.addEventListener('loadedmetadata', () => $('duration').textContent = time(audio.duration)); $('seek').addEventListener('input', e => { if (Number.isFinite(audio.duration)) audio.currentTime = e.target.value / 100 * audio.duration; });
function tab(which) {
  if (which === selectedTab) return;
  selectedTab = which; tabAnimation?.cancel();
  const isTracks = which === 'tracks';
  $('list').hidden = !isTracks; $('lyrics').hidden = isTracks;
  document.querySelector('.tabs').classList.toggle('show-lyrics', !isTracks);
  for (const [id, active] of [['tracks-tab',isTracks],['lyrics-tab',!isTracks]]) { $(id).classList.toggle('active',active); $(id).setAttribute('aria-selected',String(active)); }
  if (!reducedMotion.matches) tabAnimation = $(isTracks ? 'list' : 'lyrics').animate([
    { opacity: 0, transform: `translateX(${isTracks ? -18 : 18}px)` },
    { opacity: 1, transform: 'translateX(0)' }
  ], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
}
$('tracks-tab').addEventListener('click',()=>tab('tracks')); $('lyrics-tab').addEventListener('click',()=>tab('lyrics'));
if (album.introduction.trim()) { $('info').disabled = false; $('intro-text').textContent = album.introduction; $('info').addEventListener('click',()=>$('intro-dialog').showModal()); $('close-dialog').addEventListener('click',()=>$('intro-dialog').close()); }
if (tracks.length) { ['play','previous','next','seek'].forEach(id => $(id).disabled = false); select(0); } else { renderList(); renderLyrics(); }
