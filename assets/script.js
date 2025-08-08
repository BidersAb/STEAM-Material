// Re-export: keep a single source of truth by importing original logic.
// For this project context, we duplicate the current logic here to move under assets/.
// Reader utilities: theme toggle, font size, progress, back-to-top, quizzes, content normalization, code cards
(function(){
  const root = document.documentElement;
  const THEME_KEY = 'ebook_theme';
  function applyTheme(theme){ if(theme === 'dark') document.body.classList.add('dark'); else document.body.classList.remove('dark'); }
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  const themeBtn = document.getElementById('themeToggle');
  if(themeBtn){ themeBtn.addEventListener('click', ()=>{ const next = document.body.classList.contains('dark') ? 'light' : 'dark'; localStorage.setItem(THEME_KEY, next); applyTheme(next); }); }

  const FONTSCALE_KEY = 'ebook_fontscale';
  const minScale = 0.85, maxScale = 1.35, step = 0.05;
  function getScale(){ const v = parseFloat(localStorage.getItem(FONTSCALE_KEY)); return Number.isFinite(v) ? v : 1; }
  function setScale(v){ const c = Math.min(maxScale, Math.max(minScale, v)); root.style.setProperty('--font-scale', c); localStorage.setItem(FONTSCALE_KEY, String(c)); }
  setScale(getScale());
  document.querySelectorAll('[data-font]')?.forEach(btn => btn.addEventListener('click', ()=>{ const dir = btn.getAttribute('data-font'); setScale(dir === '+' ? getScale()+step : getScale()-step); }));

  const progressEl = document.getElementById('progress');
  function updateProgress(){ if(!progressEl) return; const y = window.scrollY || document.documentElement.scrollTop; const h = document.documentElement.scrollHeight - window.innerHeight; progressEl.style.width = (h>0 ? (y/h)*100 : 0) + '%'; }
  window.addEventListener('scroll', updateProgress); window.addEventListener('resize', updateProgress); updateProgress();

  const backToTop = document.getElementById('backToTop');
  function updateBackToTop(){ if(!backToTop) return; backToTop.classList.toggle('show', (window.scrollY || document.documentElement.scrollTop) > 400); }
  if(backToTop){ backToTop.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'})); window.addEventListener('scroll', updateBackToTop); updateBackToTop(); }

  (function(){ const nav = document.querySelector('.chapter-nav'); if(!nav) return; let prev=null,next=null; nav.querySelectorAll('a').forEach(a=>{ if(/prev/i.test(a.textContent)) prev=a.href; if(/next/i.test(a.textContent)) next=a.href; }); document.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft'&&prev) location.href=prev; if(e.key==='ArrowRight'&&next) location.href=next; }); })();

  document.querySelectorAll('.quiz').forEach(quiz=>{ const qs = quiz.querySelectorAll('.q'); if(qs.length){ qs.forEach(q=>{ const r=q.querySelector('.result'); q.querySelectorAll('.option').forEach(opt=> opt.addEventListener('click', ()=>{ q.querySelectorAll('.option').forEach(o=>o.classList.remove('correct','incorrect')); const ok = opt.getAttribute('data-correct')==='true'; opt.classList.add(ok?'correct':'incorrect'); if(r) r.textContent = ok? 'Correct!' : 'Try again'; })); }); const reset=quiz.querySelector('[data-reset]'); if(reset){ reset.addEventListener('click', ()=>{ quiz.querySelectorAll('.option').forEach(o=>o.classList.remove('correct','incorrect')); quiz.querySelectorAll('.result').forEach(r=> r.textContent=''); }); } } });

  (function enhanceContent(){
    const content = document.querySelector('.book-content'); if(!content) return;
    function decodeEntities(str){ const el=document.createElement('textarea'); el.innerHTML=str; return el.value; }
    function formatInlineCode(text){ let html = text.replace(/(&lt;[^&]*?&gt;)/g,'<code>$1</code>'); html = html.replace(/^\s*(src|alt|href|id|class|style|type|name|title)\s*:\s*/i,(m,g1)=>`<code>${g1}</code>: `); return html; }
    content.querySelectorAll('p').forEach(p=>{ const t=p.textContent.trim(); if(/^\d{1,3}$/.test(t)) p.remove(); });
    content.querySelectorAll('p').forEach(p=>{
      const html=p.innerHTML; if(!/(<br\s*\/?>)/i.test(html)) return;
      let lines = html.split(/<br\s*\/?>/i).map(s=>s.replace(/&nbsp;/g,' ').trim()).filter(Boolean);
      lines = lines.map(line=> line.replace(/^(\d{1,3})\s+(?=[•\-\u2022o\*]\s)/,''));
      if(lines.length<2) return;
      const joined = lines.join('\n');
      const htmlStart = lines.filter(l=>/^\s*&lt;(!DOCTYPE|\/?[a-z][^\s>]*)/i.test(l)).length; const htmlIs = htmlStart>=3 && htmlStart/lines.length>=0.6;
      const cssProps = lines.filter(l=>/^\s*[a-zA-Z_-]+\s*:\s*[^;]+;\s*$/.test(l)).length; const hasBraces = /\{[\s\S]*\}/.test(joined) || lines.some(l=>l.includes('{')); const cssIs = hasBraces && cssProps>=3;
      const pyLines = lines.filter(l=>/^\s*(def\s|print\(|import\s|from\s+\w+\s+import\s)/.test(l)).length; const pyIs = pyLines>=2;
      const jsLines = lines.filter(l=>/^\s*(const|let|var)\s+/.test(l) || /function\s+/.test(l) || /=>/.test(l) || /document\.|console\./.test(l)).length; const semiLines = lines.filter(l=>/;\s*$/.test(l)).length; const jsIs = jsLines>=2 || semiLines>=3;
      const isCode = htmlIs || cssIs || pyIs || jsIs;
      if(isCode){
        function isHtmlLine(l){ return /^\s*&lt;(!DOCTYPE|\/?[a-z][^\s>]*)/i.test(l); }
        function isCssLine(l){ return /^\s*[a-zA-Z_-]+\s*:\s*[^;]+;\s*$/.test(l) || /\{|\}/.test(l); }
        function isPyLine(l){ return /^\s*(def\s|print\(|import\s|from\s+\w+\s+import\s)/.test(l); }
        function isJsLine(l){ return /^\s*(const|let|var)\s+/.test(l) || /function\s+/.test(l) || /=>/.test(l) || /document\.|console\./.test(l) || /;\s*$/.test(l); }
        const isCodeLine = lines.map(l=> (htmlIs && isHtmlLine(l)) || (cssIs && isCssLine(l)) || (pyIs && isPyLine(l)) || (jsIs && isJsLine(l)));
        let start=0; const frag=document.createDocumentFragment();
        while(start<lines.length){
          const codeStart = isCodeLine.indexOf(true,start);
          if(codeStart===-1){ const desc = lines.slice(start).join(' ').trim(); if(desc){ const np=document.createElement('p'); np.innerHTML = formatInlineCode(desc); frag.appendChild(np);} break; }
          if(codeStart>start){ const desc = lines.slice(start,codeStart).join(' ').trim(); if(desc){ const np=document.createElement('p'); np.innerHTML = formatInlineCode(desc); frag.appendChild(np);} }
          let codeEnd=codeStart; while(codeEnd<lines.length && isCodeLine[codeEnd]) codeEnd++;
          const code = lines.slice(codeStart,codeEnd).map(decodeEntities).join('\n');
          const lang = htmlIs? 'html' : cssIs? 'css' : pyIs? 'python' : jsIs? 'javascript' : 'code';
          const pre=document.createElement('pre'); const codeEl=document.createElement('code'); codeEl.className=`language-${lang}`; codeEl.textContent=code; pre.appendChild(codeEl); frag.appendChild(pre);
          start=codeEnd;
        }
        p.replaceWith(frag); return;
      }
      const bulletRe = /^([•\-\u2022\*]|o)\s+/i; const numberedRe = /^(\d{1,3})\.\s+/;
      function isBulletLine(l){ return bulletRe.test(l); } function isNumberedLine(l){ return numberedRe.test(l); }
      const block=document.createElement('div'); block.className='block';
      const maybeHeading = lines[0]; const firstIsHeading = /^(Introduction|What|The|How|Key|Main|CSS|JavaScript|Python|Robotics|Drone|Cabin|Exercises|Challenge|Beginner|Make Connections|Wing Design Research|Setting Up)/i.test(maybeHeading) && maybeHeading.length<120; let startIdx=0; if(firstIsHeading){ const h=document.createElement('h3'); h.textContent=maybeHeading.replace(/\s*:\s*$/,''); block.appendChild(h); startIdx=1; }
      let i=startIdx; let paraBuf=[]; function flushPara(){ if(paraBuf.length){ const np=document.createElement('p'); np.innerHTML = formatInlineCode(paraBuf.join(' ')); block.appendChild(np); paraBuf=[]; } }
      while(i<lines.length){ const line=lines[i]; if(isBulletLine(line) || isNumberedLine(line)){ const isNum=isNumberedLine(line); let run=[]; let j=i; let lastNum=null; while(j<lines.length){ const lj=lines[j]; if(isNum && isNumberedLine(lj)){ const m=lj.match(numberedRe); const num=m?parseInt(m[1],10):null; if(lastNum!==null && num!==null && num!== lastNum+1) break; lastNum=num; run.push(lj); j++; } else if(!isNum && isBulletLine(lj)){ run.push(lj); j++; } else { break; } } const qualifies = run.length>=3 || (isNum && run.length>=2 && lastNum!==null); if(qualifies){ flushPara(); const listEl=document.createElement(isNum?'ol':'ul'); run.forEach(r=>{ const text=r.replace(bulletRe,'').replace(numberedRe,'').trim(); const li=document.createElement('li'); li.innerHTML = formatInlineCode(text); listEl.appendChild(li); }); block.appendChild(listEl); i=j; continue; } paraBuf.push(line); i++; } else { paraBuf.push(line); i++; } }
      flushPara(); p.replaceWith(block);
    });
  })();

  (function enhanceCodeBlocks(){ const blocks=document.querySelectorAll('pre code'); blocks.forEach(code=>{ const pre=code.parentElement; if(pre && !pre.classList.contains('wrapped')){ pre.classList.add('wrapped'); const langMatch=(code.className||'').match(/language-([a-z0-9+#]+)/i); const lang= langMatch? langMatch[1].toUpperCase() : detectLang(code.textContent); const card=document.createElement('div'); card.className='code-card'; const bar=document.createElement('div'); bar.className='code-bar'; const langEl=document.createElement('div'); langEl.className='lang'; langEl.textContent=lang; const btn=document.createElement('button'); btn.className='copy-btn'; btn.textContent='Copy'; btn.addEventListener('click',()=>{ navigator.clipboard.writeText(code.textContent).then(()=>{ btn.textContent='Copied!'; setTimeout(()=> btn.textContent='Copy',1200); }); }); bar.appendChild(langEl); bar.appendChild(btn); const preClone=pre.cloneNode(true); card.appendChild(bar); card.appendChild(preClone); pre.replaceWith(card); } }); function detectLang(t){ const s=t.trim(); if(/<!doctype html>|<html|<head|<body|<div|<span|<a\s/i.test(s)) return 'HTML'; if(/\{\s*[^}]*:\s*[^}]*;|^\s*\.|^\s*#|@media|:root\s*\{/m.test(s)) return 'CSS'; if(/\bdef\b|\bprint\(|:\n\s+|\bimport\s+|\bfrom\s+.*\s+import\s+/m.test(s)) return 'PYTHON'; if(/\bfunction\b|=>|document\.|console\.|\bvar\b|\bconst\b|\blet\b/.test(s)) return 'JS'; return 'CODE'; } })();
})();


