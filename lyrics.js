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
  function tokenize(parts) {
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ko', {granularity:'grapheme'}) : null;
    const tokens = [];
    for (const part of parts) {
      const letters = segmenter ? [...segmenter.segment(part.text)].map(s => s.segment) : Array.from(part.text);
      for (const text of letters) {
        const previous = tokens.at(-1);
        // Keep existing distinct timestamps; unstamped English letters form one word.
        const isWord = value => /^[\p{Script=Latin}\p{Number}\x21-\x7e]+$/u.test(value);
        if (previous && previous.time === part.time && isWord(previous.text) && isWord(text)) previous.text += text;
        else tokens.push({text, time:part.time});
      }
    }
    return tokens;
  }
  root.LyricTiming = {parse,format,tokenize};
  if (typeof module !== 'undefined') module.exports = root.LyricTiming;
})(typeof window !== 'undefined' ? window : globalThis);
