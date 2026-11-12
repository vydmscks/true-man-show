const $ = id => document.getElementById(id);
const audio = $('timing-audio');
const tracks = window.ALBUM.tracks;
let lines = [], tokens = [], selected = 0, history = [], loadId = 0, edited = false, loading = false;
const key = () => `ttl-lyric-timing:${tracks[$('song').value]?.audio}`;
function persist() { if(loading)return; try { localStorage.setItem(key(),JSON.stringify({lines,selected})); } catch {} }
function rebuild() {
  tokens = []; const root = $('characters'); root.replaceChildren();
  lines.forEach(line => {
    const row = document.createElement('div'); row.className = 'char-line';
    line.forEach(token => {
      if (/^\s+$/.test(token.text)) { row.append(document.createTextNode(token.text)); return; }
      const index = tokens.length; tokens.push(token);
      const button = document.createElement('button'); button.className = 'char'; button.textContent = token.text;
      button.addEventListener('click',()=>{selected=index;refresh();}); row.append(button);
    }); root.append(row);
  });
  selected = Math.max(0,Math.min(selected,tokens.length)); refresh();
}
function refresh(message = '') {
  document.querySelectorAll('.char').forEach((button,i)=>{button.classList.toggle('selected',i===selected);button.classList.toggle('recorded',tokens[i].time!==null);button.title=tokens[i].time===null?'미기록':LyricTiming.format(tokens[i].time);});
  $('exact').value = tokens[selected]?.time ?? '';
  $('status').textContent = message || `${tokens.filter(t=>t.time!==null).length} / ${tokens.length}개 기록 · ${selected<tokens.length ? `다음: ${tokens[selected].text}` : '마지막까지 기록했습니다'}`;
  persist();
}
function prepare() {
  loading = false;
  lines = LyricTiming.parse($('source').value).map(line=>LyricTiming.tokenize(line.parts));
  selected=0; history=[]; edited=true; rebuild();
}
async function load() {
  const request=++loadId; loading=true; audio.pause(); const track=tracks[$('song').value]; if(!track)return;
  audio.src=track.audio; audio.playbackRate=Number($('speed').value); history=[]; selected=0; lines=[]; edited=false; $('source').value=''; rebuild();
  try { const saved=JSON.parse(localStorage.getItem(key())||'null'); if(saved?.lines?.length){lines=saved.lines.map(line=>LyricTiming.tokenize(line));const pending=lines.flat().filter(t=>!/^\s+$/.test(t.text)).findIndex(t=>t.time===null);selected=pending<0?lines.flat().filter(t=>!/^\s+$/.test(t.text)).length:pending;loading=false;rebuild();$('source').value=serialize();return;} } catch {}
  if(!track.lyrics){loading=false;return;}
  try { const res=await fetch(track.lyrics,{cache:'no-store'}); if(!res.ok)throw Error(); const text=await res.text(); if(request!==loadId||edited)return; $('source').value=text; prepare(); }
  catch { if(request===loadId){loading=false;refresh('가사를 가져오지 못했습니다. 텍스트를 붙여 넣거나 가사 파일을 열어주세요.');} }
}
function assign(time) {
  const token=tokens[selected]; if(!token)return;
  const before=tokens.slice(0,selected).filter(t=>t.time!==null).at(-1)?.time;
  const after=tokens.slice(selected+1).find(t=>t.time!==null)?.time;
  if(!Number.isFinite(time)||time<0||(before!==undefined&&time<before)||(after!==undefined&&time>after)){refresh('앞뒤 글자 시간 순서에 맞게 입력하세요. 다시 기록하려면 해당 글자를 선택해 수정할 수 있습니다.');return;}
  history.push({index:selected,time:token.time});token.time=Math.round(time*100)/100; selected++; refresh();
  document.querySelector('.char.selected')?.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function serialize() { return lines.map(line=>line.map(token=>/^\s+$/.test(token.text)?token.text:token.time===null?`<->${token.text}`:`<${LyricTiming.format(token.time)}>${token.text}`).join('')).join('\n'); }
function toggle() { if(audio.paused)audio.play().catch(()=>refresh('음원 재생에 실패했습니다. 파일 경로를 확인하세요.'));else audio.pause(); }
tracks.forEach((track,i)=>{const option=document.createElement('option');option.value=i;option.textContent=track.title;$('song').append(option);});
$('song').addEventListener('change',load);
$('source').addEventListener('input',()=>{edited=true;});
$('prepare').addEventListener('click',prepare);
$('toggle').addEventListener('click',toggle);
$('stamp').addEventListener('click',()=>assign(audio.currentTime));
$('undo').addEventListener('click',()=>{const last=history.pop();if(!last)return;tokens[last.index].time=last.time;selected=last.index;refresh();});
$('set-time').addEventListener('click',()=>{if($('exact').value!=='')assign(Number($('exact').value));});
$('jump').addEventListener('click',()=>{const t=tokens[selected]?.time;if(t!==null&&t!==undefined)audio.currentTime=t;});
$('speed').addEventListener('change',()=>audio.playbackRate=Number($('speed').value));
$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;edited=true;$('source').value=await file.text();prepare();});
$('save').addEventListener('click',()=>{
  if(!tokens.length){refresh('먼저 가사를 입력하세요.');return;}
  const url=URL.createObjectURL(new Blob([serialize()],{type:'text/plain;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download=tracks[$('song').value]?.lyrics?.split('/').pop()||'lyrics.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  refresh(`파일을 저장했습니다. ${tokens.filter(t=>t.time===null).length}개가 아직 미기록 상태입니다.`);
});
document.addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)assign(audio.currentTime);}
  if(e.code==='KeyP'){e.preventDefault();if(!e.repeat)toggle();}
});
let lastPlaying=-1, previewFrame=0;
function preview(){cancelAnimationFrame(previewFrame);previewFrame=0;let active=-1;tokens.forEach((t,i)=>{if(t.time!==null&&t.time<=audio.currentTime)active=i;});if(active!==lastPlaying){document.querySelectorAll('.char').forEach((b,i)=>b.classList.toggle('playing',i===active));lastPlaying=active;}if(!audio.paused)previewFrame=requestAnimationFrame(preview);}
audio.addEventListener('play',preview);audio.addEventListener('seeked',()=>{lastPlaying=-1;preview();});
load();
