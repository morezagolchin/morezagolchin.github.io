// Fills the fixed background with a DNA sequence.
// Put a real sequence in SEQUENCE to use it (it repeats to fill the screen);
// leave it empty to use random bases.
(() => {
  const SEQUENCE = "";
  const BASES = "ACGT";

  const el = document.querySelector(".dna-bg");
  if (!el) return;

  const seq = SEQUENCE.toUpperCase().replace(/[^ACGT]/g, "");
  let text = "";

  function base(i) {
    return seq ? seq[i % seq.length] : BASES[Math.floor(Math.random() * BASES.length)];
  }

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
  function fill() {
    const { width, height } = charSize();
    const w = Math.max(innerWidth, screen.width);
    const h = Math.max(innerHeight, screen.height);
    const needed = Math.ceil(w / width + 2) * Math.ceil(h / height + 2);
    if (needed <= text.length) return;
    let more = "";
    for (let i = text.length; i < needed; i++) more += base(i);
    text += more;
    el.textContent = text;
  }

  fill();
  addEventListener("resize", fill);
})();
