# To do

## Content
- [ ] Add projects to the Projects panel (replace "Nothing here yet"): two or three cards with what it is, my role, the tools used, and a link to a live demo or the code. Consider moving chessooly / arcazooly there if they're portfolio pieces.
- [ ] Add a clear one-line intro: who I am and what I do, readable within a few seconds.
- [ ] Contacts: make sure email (or a contact form), GitHub and LinkedIn are there.
- [ ] Add a link to a downloadable CV / résumé (PDF).

## Sharing and search
- [ ] Add Open Graph meta tags (title, description, preview image) so links show a preview on LinkedIn, Slack, WhatsApp, etc.
- [ ] Add a favicon.
- [ ] Give the page a title and meta description with my name and field.

## Shared look for project pages
Make pages under morezagolchin.github.io/<project>/ (e.g. the Playground projects) match this site, from one place.
- [ ] Split style.css: `theme.css` for the shared look (colour variables for light and dark mode, fonts, spacing, radius, borders, base styles for text, links, buttons and cards); `style.css` keeps only the home page's own parts (tabs, DNA background, mosaic).
- [ ] Link `<link rel="stylesheet" href="/theme.css">` from every project page, and use the theme variables (`var(--text)`, `var(--surface)`, `var(--border)`, ...) instead of fixed colours.
- [ ] Optional: a shared header, `/site-header.js` defining a `<site-header>` tag with my name and a link back home.
- [ ] List the theme's variable names in the README: values can change, but renaming or removing one breaks the projects that use it.
- [ ] Add a checklist for new projects: link `/theme.css`, add `<site-header>`, use only theme colours.
- [ ] Check how chessooly and arcazooly are built, and update each one to use the theme.

## Checks
- [ ] Contrast: check the text stays readable over the DNA background and see-through boxes, in light and dark mode.
- [ ] Test on a real phone, especially tab switching and the Playground animation.
- [ ] Check the mosaic and DNA animations don't make the page sluggish or drain the battery on older laptops and phones.
- [ ] Test the animations in Chrome and Safari (so far only checked in Firefox).
