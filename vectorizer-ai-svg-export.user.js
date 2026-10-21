// ==UserScript==
// @name             vectorizer.ai free SVG export (floating button)
// @match            https://vectorizer.ai/*
// @version          7.0
// @description      Captures vectorized Path2D draws and exports as SVG. Filters duplicate preview panes.
// @run-at           document-start
// @grant            none
// ==/UserScript==

(function inject() {
  const target = document.head || document.documentElement;
  if (!target) return setTimeout(inject, 10);
  const s = document.createElement('script');
  s.textContent = `
try {
  window.__vzMarkers = ['v7 start'];
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Все захваченные пути: {d, m, fill, stroke, sw, alpha, canvasId, seq}
  const captured = (window.__vzCaptured = []);
  let seq = 0;
  let canvasSeq = 0;
  const canvasIds = new WeakMap();
  const canvasId = (cv) => { let id = canvasIds.get(cv); if (!id) { id = 'cv' + (++canvasSeq); canvasIds.set(cv, id); } return id; };

  const OrigPath2D = window.Path2D;
  class CustomPath2D extends OrigPath2D {
    constructor(src) { super(); this.pathData=''; this.cx=null; this.cy=null; this.last='';
      if (typeof src === 'string') this.pathData += src; }
    _u(x,y,c){this.cx=x;this.cy=y;this.last=c;}
    moveTo(x,y){super.moveTo(x,y);this.pathData+='M'+x+' '+y+' ';this._u(x,y,'M');}
    lineTo(x,y){super.lineTo(x,y);this.pathData+='L'+x+' '+y+' ';this._u(x,y,'L');}
    closePath(){super.closePath();this.pathData+='Z ';this.cx=this.cy=null;this.last='Z';}
    arc(x,y,r,a0,a1,ccw){super.arc(x,y,r,a0,a1,ccw);
      const sx=x+r*Math.cos(a0),sy=y+r*Math.sin(a0),ex=x+r*Math.cos(a1),ey=y+r*Math.sin(a1);
      let da=a1-a0; if(!ccw&&da<0)da+=2*Math.PI; if(ccw&&da>0)da-=2*Math.PI;
      const L=Math.abs(da)>Math.PI?1:0,S=ccw?0:1;
      if(this.cx===null||this.last==='Z')this.pathData+='M'+sx+' '+sy+' ';
      else if(Math.hypot(this.cx-sx,this.cy-sy)>1e-6)this.pathData+='L'+sx+' '+sy+' ';
      this.pathData+='A'+r+' '+r+' 0 '+L+' '+S+' '+ex+' '+ey+' '; this._u(ex,ey,'A');}
    arcTo(x1,y1,x2,y2,r){super.arcTo(x1,y1,x2,y2,r);
      if(this.cx===null){this.moveTo(x1,y1);this.lineTo(x2,y2);return;}
      const x0=this.cx,y0=this.cy,dx1=x0-x1,dy1=y0-y1,dx2=x2-x1,dy2=y2-y1;
      const l1=Math.hypot(dx1,dy1),l2=Math.hypot(dx2,dy2);
      if(!l1||!l2||!r){this.lineTo(x1,y1);return;}
      const v1x=dx1/l1,v1y=dy1/l1,v2x=dx2/l2,v2y=dy2/l2;
      const ang=Math.acos(Math.min(1,Math.max(-1,v1x*v2x+v1y*v2y)));
      if(ang===0){this.lineTo(x1,y1);return;}
      const tan=r/Math.tan(ang/2);
      if(tan>l1||tan>l2){this.lineTo(x1,y1);return;}
      const t1x=x1+v1x*tan,t1y=y1+v1y*tan,t2x=x1+v2x*tan,t2y=y1+v2y*tan;
      const cw=v1x*v2y-v1y*v2x<0;
      this.lineTo(t1x,t1y); this.pathData+='A'+r+' '+r+' 0 0 '+(cw?1:0)+' '+t2x+' '+t2y+' ';
      this._u(t2x,t2y,'A');}
    bezierCurveTo(a,b,c,d,x,y){super.bezierCurveTo(a,b,c,d,x,y);
      this.pathData+='C'+a+' '+b+' '+c+' '+d+' '+x+' '+y+' '; this._u(x,y,'C');}
    quadraticCurveTo(cx,cy,x,y){super.quadraticCurveTo(cx,cy,x,y);
      this.pathData+='Q'+cx+' '+cy+' '+x+' '+y+' '; this._u(x,y,'Q');}
    rect(x,y,w,h){super.rect(x,y,w,h);
      this.pathData+='M'+x+' '+y+' L'+(x+w)+' '+y+' L'+(x+w)+' '+(y+h)+' L'+x+' '+(y+h)+' Z ';
      this.cx=this.cy=null;this.last='Z';}
    ellipse(cx,cy,rx,ry,rot,a0,a1,ccw){super.ellipse(cx,cy,rx,ry,rot,a0,a1,ccw);
      const rd=rot*180/Math.PI,cr=Math.cos(rot),sr=Math.sin(rot);
      const sx=cx+rx*Math.cos(a0)*cr-ry*Math.sin(a0)*sr,
            sy=cy+rx*Math.cos(a0)*sr+ry*Math.sin(a0)*cr,
            ex=cx+rx*Math.cos(a1)*cr-ry*Math.sin(a1)*sr,
            ey=cy+rx*Math.cos(a1)*sr+ry*Math.sin(a1)*cr;
      let da=a1-a0; if(!ccw&&da<0)da+=2*Math.PI; if(ccw&&da>0)da-=2*Math.PI;
      const L=Math.abs(da)>Math.PI?1:0,S=ccw?0:1;
      if(this.cx===null||this.last==='Z')this.pathData+='M'+sx+' '+sy+' ';
      else if(Math.hypot(this.cx-sx,this.cy-sy)>1e-6)this.pathData+='L'+sx+' '+sy+' ';
      this.pathData+='A'+rx+' '+ry+' '+rd+' '+L+' '+S+' '+ex+' '+ey+' '; this._u(ex,ey,'A');}
    getPathData(){return this.pathData.trim();}
  }
  window.Path2D = CustomPath2D;
  window.__vzMarkers.push('Path2D patched');

  const P = CanvasRenderingContext2D.prototype;
  const oFill = P.fill, oStroke = P.stroke;

  P.fill = function () {
    oFill.apply(this, arguments);
    const p = arguments[0];
    if (p instanceof CustomPath2D) {
      const d = p.getPathData();
      if (d) {
        const t = this.getTransform();
        captured.push({
          d, m: [t.a,t.b,t.c,t.d,t.e,t.f].join(' '),
          fill: String(this.fillStyle), alpha: this.globalAlpha,
          cv: canvasId(this.canvas), seq: seq++
        });
      }
    }
  };
  P.stroke = function () {
    oStroke.apply(this, arguments);
    const p = arguments[0];
    if (p instanceof CustomPath2D) {
      const d = p.getPathData();
      if (d) {
        const t = this.getTransform();
        captured.push({
          d, m: [t.a,t.b,t.c,t.d,t.e,t.f].join(' '),
          stroke: String(this.strokeStyle), sw: this.lineWidth || 1,
          alpha: this.globalAlpha, cv: canvasId(this.canvas), seq: seq++
        });
      }
    }
  };
  window.__vzMarkers.push('fill/stroke patched');

  // ---------- export: pick dominant canvas, dedupe ----------
  function buildSvg() {
    if (!captured.length) return null;

    // группируем по canvas — выбираем тот, где больше всего путей
    const byCv = {};
    for (const c of captured) (byCv[c.cv] ||= []).push(c);
    const bestCv = Object.keys(byCv).sort((a,b) => byCv[b].length - byCv[a].length)[0];
    const items = byCv[bestCv];

    // берём последний "полный кадр": находим последний seq, с которого рисовали
    // весь набор — проще: дедуп по (d + m), оставляя ПОСЛЕДНИЙ инстанс (свежий рендер)
    const seenLast = new Map();
    for (const c of items) seenLast.set(c.d + '|' + c.m, c);
    const unique = [...seenLast.values()].sort((a,b) => a.seq - b.seq);

    // дополнительно: выкидываем пути, у которых матрица смещает контент вне области рисунка
    // (дубли второй панели имеют e или f << 0). Берём модальную матрицу — самую частую.
    const mCount = {};
    for (const c of unique) mCount[c.m] = (mCount[c.m] || 0) + 1;
    const domM = Object.keys(mCount).sort((a,b) => mCount[b] - mCount[a])[0];
    const final = unique.filter(c => c.m === domM || mCount[c.m] <= mCount[domM] && c.m === domM);

    // финальный набор — только доминантная матрица (убирает split-view дубли)
    const result = unique.filter(c => c.m === domM);

    // размеры — по canvas
    const cv = [...document.querySelectorAll('canvas')].filter(c=>c.width>10)
      .sort((a,b)=>b.width*b.height - a.width*a.height)[0];

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    if (cv) {
      svg.setAttribute('viewBox', '0 0 ' + cv.width + ' ' + cv.height);
      svg.setAttribute('width', cv.width);
      svg.setAttribute('height', cv.height);
    }
    for (const c of result) {
      const el = document.createElementNS(SVG_NS, 'path');
      el.setAttribute('d', c.d);
      if (c.m !== '1 0 0 1 0 0') el.setAttribute('transform', 'matrix(' + c.m + ')');
      if (c.stroke) {
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', c.stroke);
        el.setAttribute('stroke-width', String(c.sw));
      } else {
        el.setAttribute('fill', c.fill);
      }
      if (c.alpha < 1) el.setAttribute('fill-opacity', String(c.alpha));
      svg.append(el);
    }
    window.__vzSvgEl = svg;
    return svg;
  }
  window.__vzBuild = buildSvg;

  // ---------- floating button ----------
  function mkBtn() {
    if (document.getElementById('vz-export-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'vz-export-btn';
    btn.textContent = '⬇ SVG (0)';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;padding:12px 18px;border-radius:10px;border:none;background:#5cb85c;color:#fff;font:600 14px/1 sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)';
    btn.onclick = () => {
      const svg = buildSvg();
      const n = svg ? svg.querySelectorAll('path').length : 0;
      if (!n) { btn.textContent = '⚠ 0 paths — vectorize first'; return; }
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\\n' + svg.outerHTML;
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = (document.title.replace(/ - Vectorizer\\.AI.*|\\.[^.]*$/g, '') || 'vectorized') + '.svg';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      btn.textContent = '✅ saved ' + n;
    };
    (document.body || document.documentElement).appendChild(btn);
    setInterval(() => { btn.textContent = '⬇ SVG (' + captured.length + ')'; }, 500);
    window.__vzMarkers.push('button added');
  }
  if (document.body) mkBtn(); else document.addEventListener('DOMContentLoaded', mkBtn);

  window.__vzExport = () => document.getElementById('vz-export-btn')?.click();
  window.__vzClear = () => { captured.length = 0; };
  window.__vzMarkers.push('v7 done');
  console.log('[vz-export] installed', window.__vzMarkers);
} catch(e){ window.__vzError = e.message + '\\n' + e.stack; console.error('[vz-export] FAILED:', e); }
`;
  target.appendChild(s);
  s.remove();
  console.log('[vz-export userscript] injected');
})();
