// Tabs for the panels. On wide screens each column switches on its own:
// About me / Contacts on the left, Projects / Playground on the right.
// On narrow screens the columns merge: the right column's tabs move into the
// left tab bar and only one panel is shown.
(() => {
  // Keep in sync with the breakpoint in style.css.
  const wide = matchMedia("(min-width: 48rem)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  // Panel slides: the old panel leaves first, then the new one comes in.
  const SLIDE_OUT = { duration: 450, easing: "cubic-bezier(0.32, 0, 0.67, 0)" }; // ease-in
  const SLIDE_IN = { duration: 450, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }; // ease-in-out

  const panels = document.querySelector(".panels");
  const sideList = document.querySelector(".tabs-side");
  const mainList = document.querySelector(".tabs-main");
  if (!panels || !sideList || !mainList) return;
  const lists = [sideList, mainList];

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

  // Move each tab bar's highlight (.tabs::before) under its selected tab.
  // It slides there if the bar has data-animate.
  function placeHighlights() {
    for (const list of lists) {
      const tab = tabsIn(list).find(isSelected);
      if (!tab) continue;
      list.style.setProperty("--ix", tab.offsetLeft + "px");
      list.style.setProperty("--iy", tab.offsetTop + "px");
      list.style.setProperty("--iw", tab.offsetWidth + "px");
      list.style.setProperty("--ih", tab.offsetHeight + "px");
    }
  }

  // Jump without sliding: used on first load, resize and layout changes.
  function placeHighlightsInstantly() {
    for (const list of lists) list.removeAttribute("data-animate");
    placeHighlights();
    for (const list of lists) {
      list.offsetWidth; // apply the new position before turning the slide back on
      list.setAttribute("data-animate", "");
    }
  }

  // Finish any panel slides in progress right away.
  function stopSlides(scope) {
    for (const tab of scope) {
      const panel = panelOf(tab);
      for (const animation of panel.getAnimations()) animation.cancel();
      leaving.delete(panel);
    }
  }

  // Where a sliding panel stays visible: between the screen edges, or on wide
  // screens up to the edge of the neighbouring column.
  function slideWindow(tab) {
    let left = 0;
    let right = document.documentElement.clientWidth;
    if (wide.matches) {
      if (columnOf(tab) === "side") right = mainList.getBoundingClientRect().left;
      else left = sideList.getBoundingClientRect().right;
    }
    return { left, right };
  }

  // Pan the old panel out and the new one in, in the direction the highlight
  // moves: a tab further along the bar comes in from the right.
  function slide(fromTab, toTab) {
    const from = panelOf(fromTab);
    const to = panelOf(toTab);
    const order = tabsIn(toTab.parentElement);
    const dir = order.indexOf(toTab) > order.indexOf(fromTab) ? 1 : -1;

    // Both panels share one grid cell, so they have the same box at rest.
    const box = from.getBoundingClientRect();
    const view = slideWindow(toTab);
    const roomLeft = box.left - view.left;
    const roomRight = view.right - box.right;

    const move = (x) => `translateX(${x}px)`;
    // Clip a panel moved by x to the window, so it disappears at the screen
    // or neighbour's edge rather than at its own.
    const clip = (x) => `inset(0px ${x - roomRight}px 0px ${-roomLeft - x}px)`;
    // Far enough to be completely outside the window.
    const outX = dir > 0 ? -(box.width + roomLeft) : box.width + roomRight;
    const inX = dir > 0 ? box.width + roomRight : -(box.width + roomLeft);

    leaving.add(from);
    from.animate(
      [
        { transform: move(0), clipPath: clip(0) },
        { transform: move(outX), clipPath: clip(outX) },
      ],
      SLIDE_OUT,
    ).onfinish = () => {
      leaving.delete(from);
      render();
    };
    to.animate(
      [
        { transform: move(inX), clipPath: clip(inX) },
        { transform: move(0), clipPath: clip(0) },
      ],
      // Wait (fully clipped, so invisible) until the old panel has left.
      { ...SLIDE_IN, delay: SLIDE_OUT.duration, fill: "backwards" },
    );
  }

  function layout() {
    stopSlides(tabs);
    const target = wide.matches ? mainList : sideList;
    if (mainTabs[0].parentElement !== target) target.append(...mainTabs);
    render();
    placeHighlightsInstantly();
    panels.setAttribute("data-ready", "");
  }

  function select(tab) {
    const previous = tabsIn(tab.parentElement).find(isSelected);
    if (previous === tab) return;
    // On wide screens only this tab's column is affected.
    stopSlides(wide.matches ? tabs.filter((t) => columnOf(t) === columnOf(tab)) : tabs);
    if (previous && previous !== tab && !reducedMotion.matches) slide(previous, tab);
    selected[columnOf(tab)] = tab;
    current = tab;
    render();
    placeHighlights();
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
  // Tabs can move or change size (window resize, tabs wrapping, fonts loading).
  const resizes = new ResizeObserver(placeHighlightsInstantly);
  for (const el of [...lists, ...tabs]) resizes.observe(el);
  layout();
})();
