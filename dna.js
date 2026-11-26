// Fills the fixed background with a random DNA sequence whose bases keep
// changing, one at a time, at random places and random moments.
// The pace is set per base, so it looks the same on every screen size:
// a bigger screen shows more bases, so more of them change each second.
(() => {
  const BASES = "ACGT";
  const SECONDS_PER_BASE = 6; // how long a base lasts before it changes, on average
  const TICK = 100;             // how often changes are made, in ms

  const el = document.querySelector(".dna-bg");
  if (!el) return;

  const randomBase = () => BASES[Math.floor(Math.random() * BASES.length)];
  let text = "";
  let visible = 0; // how many bases fit on screen (the first ones in the text)

  // Measure one character in the background's font to work out how many fit.
  function charSize() {
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
    probe.textContent = "A".repeat(50);
    el.append(probe);
    const rect = probe.getBoundingClientRect();
    probe.remove();
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || rect.height;
    return { width: rect.width / 50, height: lineHeight };
  }

  // Only ever extend the text, so the pattern doesn't reshuffle on resize.
  // The text covers the whole screen even if the window is smaller, so it
  // rarely needs to grow.
  function fill() {
    const { width, height } = charSize();
    const style = getComputedStyle(el);
    const innerW = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const innerH = el.clientHeight - parseFloat(style.paddingTop);
    visible = Math.max(1, Math.floor(innerW / width)) * Math.ceil(innerH / height);

    const w = Math.max(innerWidth, screen.width);
    const h = Math.max(innerHeight, screen.height);
    const needed = Math.ceil(w / width + 2) * Math.ceil(h / height + 2);
    if (needed > text.length) {
      let more = "";
      for (let i = text.length; i < needed; i++) more += randomBase();
      text += more;
      el.textContent = text;
    }
    visible = Math.min(visible, text.length);
  }

  // Change one random on-screen base to a different one.
  function mutate(node) {
    const i = Math.floor(Math.random() * visible);
    const others = BASES.replace(text[i], "");
    const b = others[Math.floor(Math.random() * others.length)];
    text = text.slice(0, i) + b + text.slice(i + 1);
    node.replaceData(i, 1, b);
  }

  // Each tick changes visible / SECONDS_PER_BASE bases per second on average:
  // the whole part every time, plus one more by chance for the fraction.
  // Left still when the viewer asks for reduced motion.
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  function tick() {
    const node = el.firstChild;
    if (node && !reducedMotion.matches && !document.hidden) {
      const expected = (visible / SECONDS_PER_BASE) * (TICK / 1000);
      let count = Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0);
      while (count--) mutate(node);
    }
  }

  fill();
  addEventListener("resize", fill);
  setInterval(tick, TICK);
})();
