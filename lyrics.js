(function (root) {
  const seconds = value => { const [m,s] = value.split(':'); return Number(m)*60+Number(s); };
  function parse(text) {
    return text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim()).map(raw => {
      const header = raw.match(/^\[(\d+:\d+(?:\.\d+)?)\]\s*/);
      const body = header ? raw.slice(header[0].length) : raw;
      const parts = []; let cursor = 0, stamp = null;
      for (const match of body.matchAll(/<(\d+:\d+(?:\.\d+)?|-)>/g)) {
        if (match.index > cursor) parts.push({text:body.slice(cursor,match.index),time:stamp});
        stamp = match[1] === '-' ? null : seconds(match[1]); cursor = match.index + match[0].length;
      }
      if (cursor < body.length) parts.push({text:body.slice(cursor),time:stamp});
      return {text:parts.map(p=>p.text).join(''), parts, time:header ? seconds(header[1]) : (parts.find(p=>p.time !== null)?.time ?? null)};
    });
  }
  function format(seconds) {
    const ticks = Math.max(0, Math.round(seconds*100));
    return `${String(Math.floor(ticks/6000)).padStart(2,'0')}:${String(Math.floor(ticks/100)%60).padStart(2,'0')}.${String(ticks%100).padStart(2,'0')}`;
  }
  root.LyricTiming = {parse,format};
  if (typeof module !== 'undefined') module.exports = root.LyricTiming;
})(typeof window !== 'undefined' ? window : globalThis);
