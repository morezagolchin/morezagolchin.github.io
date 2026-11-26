// Mosaic background: fills each `.mosaic canvas` with square tiles in the
// mosaic palette. Tiles under and around the pointer round off into smaller
// circles, then ease back into squares. When switching to or from the panel's
// tab, the rows of tiles slide in and out, each starting at a slightly
// different, random time (started by tabs.js). Coming in, the whole grid
// slides in, then after a pause the tiles under each card vanish and the
// card pops in.
// Going out, the cards pop out first and the tiles under them grow back.
// The gaps between tiles are left transparent, so the page shows through.
// Cards in the panel are laid out on the tile grid (see .mosaic in style.css),
// so each one covers whole tiles and its edges sit in the grout.
(() => {
  const TILE = 28;       // target tile size in CSS pixels
  const GAP = 3;         // grout width in CSS pixels
  const REACH = 150;     // how far around the pointer tiles round off, in CSS pixels
  const MORPH_IN = 150;  // how fast tiles turn into circles (ms; lower is faster)
  const MORPH_OUT = 600; // how fast they turn back once the pointer moves on
  const BORDER = 1.5;     // tile border width in CSS pixels (color: --mosaic-border in style.css)
  const SHRINK = 0.10;   // how much smaller a full circle is than its square (0.25 = 25%)
  // How much each tile differs from the others, so they don't move in step.
  // 0 = all alike; 1 = anywhere from none to twice the base value.
  const VARY_SPEED = 0.7;  // MORPH_IN and MORPH_OUT
  const VARY_REACH = 0.4;  // REACH
  const VARY_SHRINK = 0.6; // SHRINK

  // A random multiplier between 1 - amount and 1 + amount.
  const vary = (amount) => 1 + amount * (Math.random() * 2 - 1);

  // Tab switches: each row slides for part of the panel slide, starting at a
  // random time within it. The shorter a row's slide, the more the rows'
  // start times can differ.
  const FLY_TIME = 0.7;       // a row's slide, as a share of the panel slide's duration
  const VARY_FLY_TIME = 0.1;  // how much rows' speeds differ (0.1 = up to 10%)
  const POP_DELAY = 80;      // pause after the last row lands, before the cards pop in (ms)
  const VANISH_TIME = 200;    // tiles under the cards vanishing, after the pause (ms)
  const POP_IN = 280;         // a card popping in, halfway through the vanishing (ms)
  const POP_OUT = 0.3;        // a card popping out, as a share of the panel slide's duration

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function mosaic(canvas) {
    const ctx = canvas.getContext("2d");
    // The panel's content covers the canvas, so listen on the panel itself.
    const area = canvas.parentElement;
    const cards = [...area.querySelectorAll(".card")];

    const palette = getComputedStyle(canvas)
      .getPropertyValue("--mosaic-palette").trim().split(/\s+/);

    // Each tile keeps a random palette color, its own random speed, reach and
    // shrink, and how round it is (0 = square, 1 = circle), all stable across
    // redraws (e.g. on resize).
    const tiles = new Map();
    function tile(row, col) {
      const key = row + "," + col;
      if (!tiles.has(key)) {
        tiles.set(key, {
          color: palette[Math.floor(Math.random() * palette.length)],
          speed: vary(VARY_SPEED),
          reach: REACH * vary(VARY_REACH),
          shrink: SHRINK * vary(VARY_SHRINK),
          round: 0,
        });
      }
      return tiles.get(key);
    }

    let grid = null;    // tile layout for the current canvas size
    let covered = [];   // tile ranges under cards, which aren't drawn (except in tab switches)
    let pointer = null; // pointer position in CSS pixels, or null when outside
    // The tab-switch flight in progress: { phase: "in" | "out", move: -1 (tiles
    // head left) or 1 (right), start (ms), duration (ms), rows (each row's
    // timing) }, or null.
    let flight = null;

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

    // The tile ranges each card sits on. Measured from the card's layout box,
    // so a card scaled while popping in or out still counts at full size.
    function coveredTiles(pitch, offsetY) {
      const base = canvas.getBoundingClientRect();
      return cards.map((card) => {
        const parent = card.offsetParent.getBoundingClientRect();
        const left = parent.left + card.offsetParent.clientLeft + card.offsetLeft;
        const top = parent.top + card.offsetParent.clientTop + card.offsetTop;
        const r = { left, top, right: left + card.offsetWidth, bottom: top + card.offsetHeight };
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
    // fading smoothly to 0 at the tile's reach.
    function goalAt(x, y, reach) {
      if (!pointer) return 0;
      const d = Math.hypot(x - pointer.x, y - pointer.y) / reach;
      return d >= 1 ? 0 : (1 - d * d) ** 2;
    }

    const progress = (now, from, length) => Math.min(1, Math.max(0, (now - from) / length));

    // A row's timing in the current flight; each row gets its own random start
    // time for each flight. `start` and `end` are when it leaves and arrives.
    function rowTiming(row) {
      if (!flight.rows[row]) {
        const time = flight.duration * Math.min(1, FLY_TIME * vary(VARY_FLY_TIME));
        const start = flight.start + Math.random() * (flight.duration - time);
        flight.rows[row] = { start, end: start + time };
      }
      return flight.rows[row];
    }

    // How far a row is from home during a flight: 0 = home, 1 = off the edge.
    function rowAwayFromHome(row, now) {
      if (!flight) return 0;
      const { start, end } = rowTiming(row);
      const p = progress(now, start, end - start);
      return flight.phase === "in" ? (1 - p) ** 3 : p ** 3; // ease out / ease in
    }

    // When the tiles under the cards start to vanish, coming in.
    const vanishStart = () => flight.start + flight.duration + POP_DELAY;

    // How far a tile under a card has vanished during a flight: 0 = there,
    // 1 = gone. Coming in, it goes after every row has landed and the pause;
    // going out, it grows back while the card pops out.
    function vanished(now) {
      if (flight.phase === "in") return progress(now, vanishStart(), VANISH_TIME);
      return 1 - progress(now, flight.start, flight.duration * POP_OUT);
    }

    // Pop the cards in while the tiles under them vanish, or out at the start
    // of the slide out. The animations are kept here to cancel on the next
    // switch: the browser may not list them while the panel is hidden.
    // Neither one fills forwards, so nothing can keep a card hidden afterwards.
    let cardAnimations = [];
    function popCards() {
      for (const animation of cardAnimations) animation.cancel();
      cardAnimations = [];
      if (!flight) return;
      const small = { opacity: 0, transform: "scale(0.6)" };
      const full = { opacity: 1, transform: "scale(1)" };
      // Going out, the cards stay hidden a little past the slide, by which
      // time tabs.js has hidden the panel.
      const outTime = flight.duration + 100;
      cardAnimations = cards.map((card) =>
        flight.phase === "in"
          ? card.animate([small, { opacity: 1, transform: "scale(1.04)", offset: 0.7 }, full], {
              duration: POP_IN,
              delay: vanishStart() + VANISH_TIME / 2 - performance.now(),
              easing: "ease-out",
              fill: "backwards", // hidden until then
            })
          : card.animate(
              [
                { ...full, easing: "ease-in" },
                { ...small, offset: (flight.duration * POP_OUT) / outTime },
                small,
              ],
              outTime,
            ),
      );
    }

    // Draws every tile after moving its roundness toward its goal for `dt` ms.
    // Returns true while any tile is still changing.
    function draw(dt) {
      if (!grid) return false;
      const { w, h, cols, rows, pitch, offsetY } = grid;
      const size = pitch - GAP;
      const now = performance.now();
      // Read each time, so it follows a light/dark mode switch.
      const border = getComputedStyle(canvas).getPropertyValue("--mosaic-border").trim();
      ctx.strokeStyle = border;
      ctx.lineWidth = BORDER;
      // Rows slide in from, or out to, the right edge or the left one.
      const fromRight = flight && (flight.phase === "in") === (flight.move < 0);
      const end = flight && (flight.phase === "in" ? vanishStart() + VANISH_TIME : flight.start + flight.duration);
      let changing = !!flight && now < end;
      ctx.clearRect(0, 0, w, h);
      for (let r = 0; r < rows; r++) {
        // A whole canvas width takes the row completely off the edge.
        const away = rowAwayFromHome(r, now);
        const dx = away * (fromRight ? w : -w);
        for (let c = 0; c < cols; c++) {
          // Tiles under cards are only drawn while switching tabs.
          const gone = !isCovered(r, c) ? 0 : flight ? vanished(now) : 1;
          if (gone >= 1) continue;
          const t = tile(r, c);
          const x = c * pitch + GAP / 2;
          const y = offsetY + r * pitch + GAP / 2;
          const goal = goalAt(x + size / 2, y + size / 2, t.reach);
          const time = (goal > t.round ? MORPH_IN : MORPH_OUT) / t.speed;
          const step = reducedMotion.matches ? 1 : 1 - Math.exp(-dt / time);
          t.round += (goal - t.round) * step;
          if (Math.abs(goal - t.round) < 0.005) t.round = goal;
          else changing = true;
          // Sliding tiles are circles that square up as they land, and
          // vanishing ones shrink away as circles.
          const round = Math.max(t.round, away, gone);
          // Shrink toward the tile's center as it rounds off.
          const s = size * (1 - t.shrink * round) * (1 - gone);
          const inset = (size - s) / 2;
          ctx.fillStyle = t.color;
          ctx.beginPath();
          ctx.roundRect(x + dx + inset, y + inset, s, s, (round * s) / 2);
          ctx.fill();
          // The border sits just inside the tile's edge, so tiles keep their size.
          if (border && s > BORDER * 2) {
            const b = BORDER / 2;
            ctx.beginPath();
            ctx.roundRect(x + dx + inset + b, y + inset + b, s - BORDER, s - BORDER, Math.max(0, (round * s) / 2 - b));
            ctx.stroke();
          }
        }
      }
      // Once landed, the tiles are home for good. After flying out they stay
      // away until the panel is hidden and the next switch resets them.
      if (!changing && flight && flight.phase === "in") flight = null;
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
      // Keep animating if tiles are mid-flight (e.g. the panel was just shown).
      if (draw(Infinity)) wake();
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
    // Sent by tabs.js when the panel slides in or out, or the slide is stopped.
    area.addEventListener("panelslide", (event) => {
      const { phase, move, delay = 0, duration } = event.detail;
      flight = phase === "stop" ? null : { phase, move, start: performance.now() + delay, duration, rows: [] };
      popCards();
      draw(0); // before the next paint, so no frame shows the tiles in the wrong place
      wake();
    });
    const resizes = new ResizeObserver(resize);
    for (const el of [canvas, ...cards]) resizes.observe(el);
  }

  document.querySelectorAll(".mosaic canvas").forEach(mosaic);
})();
