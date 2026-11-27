// Shared with the project pages: <script src="/site-footer.js" defer></script>
// Fills every <site-footer> with the site's footer line (styled in theme.css):
//
//   <site-footer source="https://github.com/morezagolchin/<repo>" ai></site-footer>
//
// source: link to the page's code ("Source on GitHub"); left out if missing.
// ai:     adds "Code written by AI (Claude)"; leave it off on pages you wrote.
(() => {
  const OWNER = "Mohammadreza Golchin";
  const YEAR = 2026;

  for (const footer of document.querySelectorAll("site-footer")) {
    const parts = [];
    const text = (content) => {
      const span = document.createElement("span");
      span.textContent = content;
      parts.push(span);
    };

    text(`© ${YEAR} ${OWNER}`);
    if (footer.hasAttribute("ai")) text("Code written by AI (Claude)");
    const source = footer.getAttribute("source");
    if (source) {
      const link = document.createElement("a");
      link.href = source;
      link.textContent = "Source on GitHub";
      parts.push(link);
    }

    // A custom element isn't a <footer>, so give it the footer's role.
    footer.setAttribute("role", "contentinfo");
    footer.replaceChildren(...parts);
  }
})();
