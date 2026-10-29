// Gráficos em SVG simples. As cores vêm de variáveis CSS (.ch-*), então funcionam no claro e no escuro.
function niceTicks(min, max, n = 4) {
  if (min === max) { min -= 1; max += 1; }
  const step0 = (max - min) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = Math.max(1, (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

const f1 = n => Math.round(n * 10) / 10;

export function lineChart(points, { fmtY = v => String(v), label = 'Gráfico de evolução' } = {}) {
  if (!points.length) return '';
  const W = 340, H = 200, L = 42, R = 18, T = 20, B = 28;
  const ys = points.map(p => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  const span = (max - min) || Math.max(1, Math.abs(max) * 0.2);
  min = Math.max(0, min - span * 0.2);
  max = max + span * 0.2;
  const ticks = niceTicks(min, max, 4);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const X = i => points.length === 1 ? L + (W - L - R) / 2 : L + (W - L - R) * i / (points.length - 1);
  const Y = v => T + (H - T - B) * (1 - (v - lo) / ((hi - lo) || 1));

  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">`;
  ticks.forEach(t => {
    s += `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${f1(Y(t))}" y2="${f1(Y(t))}"/>`;
    s += `<text class="ch-txt" x="${L - 6}" y="${f1(Y(t)) + 3.5}" text-anchor="end">${fmtY(t)}</text>`;
  });
  if (points.length > 1) {
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${f1(X(i))} ${f1(Y(p.y))}`).join(' ');
    s += `<path class="ch-line" d="${d}" fill="none"/>`;
  }
  const last = points.length - 1;
  points.forEach((p, i) => {
    s += `<circle class="${i === last ? 'ch-end' : 'ch-dot'}" cx="${f1(X(i))}" cy="${f1(Y(p.y))}" r="${i === last ? 5 : 3.2}"/>`;
  });
  const lx = X(last);
  const anchor = lx > W - 50 ? 'end' : 'middle';
  s += `<text class="ch-val" x="${f1(lx)}" y="${f1(Y(points[last].y)) - 11}" text-anchor="${anchor}">${fmtY(points[last].y)}</text>`;
  const idxs = points.length <= 2 ? points.map((_, i) => i) : [0, Math.floor(last / 2), last];
  [...new Set(idxs)].forEach(i => {
    const a = i === 0 && points.length > 1 ? 'start' : (i === last && points.length > 1 ? 'end' : 'middle');
    s += `<text class="ch-txt" x="${f1(X(i))}" y="${H - 8}" text-anchor="${a}">${points[i].label}</text>`;
  });
  return s + '</svg>';
}

export function barChart(items, { label = 'Gráfico de barras' } = {}) {
  const W = 340, H = 150, L = 8, R = 8, T = 22, B = 26;
  const max = Math.max(1, ...items.map(i => i.v));
  const bw = (W - L - R) / items.length;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">`;
  s += `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
  items.forEach((it, i) => {
    const h = (H - T - B) * (it.v / max);
    const x = L + i * bw + bw * 0.18;
    const w = bw * 0.64;
    const y = H - B - h;
    s += `<rect class="${it.hi ? 'ch-bar-hi' : 'ch-bar'}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(Math.max(h, it.v ? 2 : 0))}" rx="3"/>`;
    s += `<text class="ch-txt" x="${f1(x + w / 2)}" y="${f1(y) - 5}" text-anchor="middle">${it.v || ''}</text>`;
    s += `<text class="ch-txt" x="${f1(x + w / 2)}" y="${H - 9}" text-anchor="middle">${it.label}</text>`;
  });
  return s + '</svg>';
}
