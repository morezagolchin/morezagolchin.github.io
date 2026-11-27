// Shared with the project pages: <script src="/ui-tabs.js" defer></script>
// Slides the yellow tile (.ui-tabs::before, see theme.css) of every .ui-tabs
// track over its selected item. Pages only change aria-selected, aria-pressed
// or aria-current on the items; this script follows. A selection change
// slides the tile; items moving between tracks, resizes and fonts loading
// move it instantly.
(() => {
  const SELECTED = ':scope > :is([aria-selected="true"], [aria-pressed="true"], [aria-current="page"])';
  const tracks = document.querySelectorAll(".ui-tabs");
  if (!tracks.length) return;

  function place(track, slide) {
    if (!slide) track.removeAttribute("data-animate");
    const item = track.querySelector(SELECTED);
    track.toggleAttribute("data-empty", !item);
    if (item) {
      track.style.setProperty("--ix", item.offsetLeft + "px");
      track.style.setProperty("--iy", item.offsetTop + "px");
      track.style.setProperty("--iw", item.offsetWidth + "px");
      track.style.setProperty("--ih", item.offsetHeight + "px");
    }
    track.setAttribute("data-ready", "");
    if (!slide) {
      track.offsetWidth; // apply the new position before turning the slide back on
      track.setAttribute("data-animate", "");
    }
  }

  const resizes = new ResizeObserver((entries) => {
    const changed = new Set(entries.map((e) => e.target.closest(".ui-tabs")));
    for (const track of changed) if (track) place(track, false);
  });
  const watchSizes = (track) => {
    resizes.observe(track);
    for (const item of track.children) resizes.observe(item);
  };

  // A batch with items added or removed (a layout change) jumps; a batch with
  // only selection changes slides.
  const mutations = new MutationObserver((records) => {
    const moved = new Set();
    const selected = new Set();
    for (const record of records) {
      const track = record.target.closest(".ui-tabs");
      if (!track) continue;
      if (record.type === "childList") moved.add(track);
      else selected.add(track);
    }
    for (const track of moved) {
      watchSizes(track);
      place(track, false);
    }
    for (const track of selected) if (!moved.has(track)) place(track, true);
  });

  for (const track of tracks) {
    watchSizes(track);
    mutations.observe(track, {
      childList: true,
      subtree: true,
      attributeFilter: ["aria-selected", "aria-pressed", "aria-current"],
    });
    place(track, false);
  }
})();
