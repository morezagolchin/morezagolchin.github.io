// Tabs for the panels. On wide screens each column switches on its own:
// About me / Contacts on the left, Projects / Playground on the right.
// On narrow screens the columns merge: the right column's tabs move into the
// left tab bar and only one panel is shown.
// The yellow tile over the selected tab is moved by ui-tabs.js, which follows
// the aria-selected changes made here.
(() => {
  // Keep in sync with the breakpoint in style.css.
  const wide = matchMedia("(min-width: 48rem)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  // Panel slides: the old panel leaves first, then the new one comes in.
  const SLIDE_OUT = { duration: 450, easing: "cubic-bezier(0.32, 0, 0.67, 0)" }; // ease-in
  const SLIDE_IN = { duration: 450, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }; // ease-in-out

  const panels = document.querySelector(".panels");
  // Each tab bar (a box) holds a tab list (the .ui-tabs track).
  const sideBar = document.querySelector(".tabs-side");
  const mainBar = document.querySelector(".tabs-main");
  const sideList = sideBar?.querySelector(".ui-tabs");
  const mainList = mainBar?.querySelector(".ui-tabs");
  if (!panels || !sideList || !mainList) return;

  const tabsIn = (list) => [...list.querySelectorAll('[role="tab"]')];
  const sideTabs = tabsIn(sideList);
  const mainTabs = tabsIn(mainList);
  const tabs = [...sideTabs, ...mainTabs];

  const panelOf = (tab) => document.getElementById(tab.getAttribute("aria-controls"));
  const columnOf = (tab) => (sideTabs.includes(tab) ? "side" : "main");
  const isSelected = (tab) => tab.getAttribute("aria-selected") === "true";

  // The selected tab in each column (wide), and the one selected overall (narrow).
  const selected = {
    side: sideTabs.find(isSelected) || sideTabs[0],
    main: mainTabs.find(isSelected) || mainTabs[0],
  };
  let current = selected.side;

  // Panels that are still sliding out; they stay visible until they finish.
  const leaving = new Set();

  function render() {
    for (const tab of tabs) {
      const on = wide.matches ? tab === selected[columnOf(tab)] : tab === current;
      tab.setAttribute("aria-selected", on);
      tab.tabIndex = on ? 0 : -1;
      const panel = panelOf(tab);
      panel.hidden = !(on || leaving.has(panel));
    }
  }

  // Finish any panel slides in progress right away.
  function stopSlides(scope) {
    for (const tab of scope) {
      const panel = panelOf(tab);
      for (const animation of panel.getAnimations({ subtree: true })) animation.cancel();
      panel.dispatchEvent(new CustomEvent("panelslide", { detail: { phase: "stop" } }));
      leaving.delete(panel);
    }
  }

  // Where a sliding panel stays visible: between the screen edges, or on wide
  // screens up to the edge of the neighbouring column.
  function slideWindow(tab) {
    let left = 0;
    let right = document.documentElement.clientWidth;
    if (wide.matches) {
      if (columnOf(tab) === "side") right = mainBar.getBoundingClientRect().left;
      else left = sideBar.getBoundingClientRect().right;
    }
    return { left, right };
  }

  // Pan the old panel out and the new one in, in the direction the highlight
  // moves: a tab further along the bar comes in from the right.
  // Both panels must be visible (render() has run), so they can be measured.
  function slide(fromTab, toTab) {
    const from = panelOf(fromTab);
    const to = panelOf(toTab);
    const order = tabsIn(toTab.parentElement);
    const dir = order.indexOf(toTab) > order.indexOf(fromTab) ? 1 : -1;
    const view = slideWindow(toTab);

    // Pan one element out of the window, or into it.
    function pan(el, out, timing) {
      const box = el.getBoundingClientRect();
      const roomLeft = box.left - view.left;
      const roomRight = view.right - box.right;
      const move = (x) => `translateX(${x}px)`;
      // Clip an element moved by x to the window, so it disappears at the
      // screen or neighbour's edge rather than at its own.
      const clip = (x) => `inset(0px ${x - roomRight}px 0px ${-roomLeft - x}px)`;
      // Far enough to be completely outside the window, on the side it leaves
      // towards or comes in from.
      const away = (dir > 0) === out ? -(box.width + roomLeft) : box.width + roomRight;
      const frames = [
        { transform: move(0), clipPath: clip(0) },
        { transform: move(away), clipPath: clip(away) },
      ];
      return el.animate(out ? frames : frames.reverse(), timing);
    }

    // A mosaic panel stays put and animates its tiles and cards itself
    // (mosaic.js), told by a "panelslide" event. A stand-in animation of the
    // panel times the slide, so it finishes and gets cancelled like the others.
    function slidePanel(panel, out, timing) {
      if (!panel.classList.contains("mosaic")) return pan(panel, out, timing);
      panel.dispatchEvent(new CustomEvent("panelslide", {
        detail: { phase: out ? "out" : "in", move: -dir, delay: timing.delay || 0, duration: timing.duration },
      }));
      return panel.animate([{ opacity: 1 }, { opacity: 1 }], timing);
    }

    slidePanel(from, true, SLIDE_OUT).onfinish = () => {
      leaving.delete(from);
      render();
    };
    // Wait (fully clipped, so invisible) until the old panel has left.
    slidePanel(to, false, { ...SLIDE_IN, delay: SLIDE_OUT.duration, fill: "backwards" });
  }

  function layout() {
    stopSlides(tabs);
    const target = wide.matches ? mainList : sideList;
    if (mainTabs[0].parentElement !== target) target.append(...mainTabs);
    render();
    panels.setAttribute("data-ready", "");
  }

  function select(tab) {
    const previous = tabsIn(tab.parentElement).find(isSelected);
    if (previous === tab) return;
    // On wide screens only this tab's column is affected.
    stopSlides(wide.matches ? tabs.filter((t) => columnOf(t) === columnOf(tab)) : tabs);
    const animate = previous && !reducedMotion.matches;
    if (animate) leaving.add(panelOf(previous));
    selected[columnOf(tab)] = tab;
    current = tab;
    render();
    if (animate) slide(previous, tab);
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const list = tabsIn(tab.parentElement);
      const i = list.indexOf(tab);
      const next = {
        ArrowRight: list[(i + 1) % list.length],
        ArrowLeft: list[(i - 1 + list.length) % list.length],
        Home: list[0],
        End: list[list.length - 1],
      }[event.key];
      if (!next) return;
      event.preventDefault();
      select(next);
      next.focus();
    });
  }

  wide.addEventListener("change", layout);
  layout();
})();
