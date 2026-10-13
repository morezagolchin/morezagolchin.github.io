// Mosaic background: fills each `.mosaic canvas` with square tiles in the
// mosaic palette. Tiles under and around the pointer round off into circles,
// then ease back into squares.
// The gaps between tiles show the canvas's CSS background as grout.
// Cards in the panel are laid out on the tile grid (see .mosaic in style.css),
// so each one covers whole tiles and its edges sit in the grout.
(() => {
  const TILE = 28;       // target tile size in CSS pixels
  const GAP = 3;         // grout width in CSS pixels
  const REACH = 150;     // how far around the pointer tiles round off, in CSS pixels
  const MORPH_IN = 150;  // how fast tiles turn into circles (ms; lower is faster)
  const MORPH_OUT = 600; // how fast they turn back once the pointer moves on

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function mosaic(canvas) {
    const ctx = canvas.getContext("2d");
    // The panel's content covers the canvas, so listen on the panel itself.
    const area = canvas.parentElement;
    const cards = [...area.querySelectorAll(".card")];

    const palette = getComputedStyle(canvas)
      .getPropertyValue("--mosaic-palette").trim().split(/\s+/);

    // Each tile keeps a random palette color and how round it is
    // (0 = square, 1 = circle), stable across redraws (e.g. on resize).
    const tiles = new Map();
    function tile(row, col) {
      const key = row + "," + col;
      if (!tiles.has(key)) {
        tiles.set(key, {
          color: palette[Math.floor(Math.random() * palette.length)],
          round: 0,
        });
      }
      return tiles.get(key);
    }

    let grid = null;    // tile layout for the current canvas size
    let covered = [];   // tile ranges hidden under cards, which aren't drawn
    let pointer = null; // pointer position in CSS pixels, or null when outside

    // Put the content on the grid: the panel padding and the space between
    // cards are one tile (from CSS), and each card is made exactly as tall as
    // a whole number of tiles.
    function fitCards(pitch, offsetY) {
      area.style.setProperty("--tile", pitch + "px");
      area.style.setProperty("--grout", GAP + "px");
      area.style.setProperty("--offset-y", offsetY + "px");
      for (const card of cards) {
        card.style.minHeight = "";
        const rows = Math.max(1, Math.ceil((card.offsetHeight + GAP) / pitch - 0.01));
        card.style.minHeight = rows * pitch - GAP + "px";
      }
    }

    // The tile ranges each card sits on.
    function coveredTiles(pitch, offsetY) {
      const base = canvas.getBoundingClientRect();
      return cards.map((card) => {
        const r = card.getBoundingClientRect();
        return {
          c0: Math.round((r.left - base.left - GAP / 2) / pitch),
          c1: Math.round((r.right - base.left + GAP / 2) / pitch),
          r0: Math.round((r.top - base.top - offsetY - GAP / 2) / pitch),
          r1: Math.round((r.bottom - base.top - offsetY + GAP / 2) / pitch),
        };
      });
    }
    const isCovered = (row, col) =>
      covered.some((k) => row >= k.r0 && row < k.r1 && col >= k.c0 && col < k.c1);

    // How round a tile centered at (x, y) should be: 1 under the pointer,
    // fading smoothly to 0 at REACH.
    function goalAt(x, y) {
      if (!pointer) return 0;
      const d = Math.hypot(x - pointer.x, y - pointer.y) / REACH;
      return d >= 1 ? 0 : (1 - d * d) ** 2;
    }

    // Draws every tile after moving its roundness toward its goal for `dt` ms.
    // Returns true while any tile is still changing.
    function draw(dt) {
      if (!grid) return false;
      const { w, h, cols, rows, pitch, offsetY } = grid;
      const size = pitch - GAP;
      let changing = false;
      ctx.clearRect(0, 0, w, h);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (isCovered(r, c)) continue;
          const t = tile(r, c);
          const x = c * pitch + GAP / 2;
          const y = offsetY + r * pitch + GAP / 2;
          const goal = goalAt(x + size / 2, y + size / 2);
          const time = goal > t.round ? MORPH_IN : MORPH_OUT;
          const step = reducedMotion.matches ? 1 : 1 - Math.exp(-dt / time);
          t.round += (goal - t.round) * step;
          if (Math.abs(goal - t.round) < 0.005) t.round = goal;
          else changing = true;
          ctx.fillStyle = t.color;
          ctx.beginPath();
          ctx.roundRect(x, y, size, size, (t.round * size) / 2);
          ctx.fill();
        }
      }
      return changing;
    }

    // Also runs when a hidden panel is first shown, since its size changes
    // from 0, and when the cards change size.
    function resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;

      // Square tiles: a whole number of them fills the width exactly.
      // Vertically, the whole rows that fit are centered, so none is cut off.
      const cols = Math.max(1, Math.round(w / TILE));
      const pitch = w / cols;
      const rows = Math.max(1, Math.floor(h / pitch + 0.01));
      const offsetY = Math.max(0, (h - rows * pitch) / 2);
      fitCards(pitch, offsetY);
      covered = coveredTiles(pitch, offsetY);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      grid = { w, h, cols, rows, pitch, offsetY };
      draw(Infinity);
    }

    // Animate only while tiles are changing.
    let frame = 0;
    let last = 0;
    function tick(now) {
      const dt = last ? now - last : 16;
      last = now;
      if (draw(dt)) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        last = 0;
      }
    }
    function wake() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function track(event) {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      wake();
    }
    function leave() {
      pointer = null;
      wake();
    }

    area.addEventListener("pointermove", track);
    area.addEventListener("pointerdown", track);
    area.addEventListener("pointerleave", leave);
    area.addEventListener("pointercancel", leave);
    const resizes = new ResizeObserver(resize);
    for (const el of [canvas, ...cards]) resizes.observe(el);
  }

  document.querySelectorAll(".mosaic canvas").forEach(mosaic);
})();
