# DSSS portfolio

Source of the portfolio and services page of DSSS (Domen Skomina Spletne Storitve). Single page in Slovenian: projects, services, indicative prices, about and contact form.

**Live:** https://portfolio.skomina.si

## Stack

- HTML, CSS and vanilla JavaScript, no build step
- three.js r150 from jsDelivr for the particle and fluid background
- Self-hosted Geist and Geist Mono fonts (license in `media/fonts/OFL.txt`)
- Contact form through FormSubmit with Cloudflare Turnstile

## Run locally

    python3 -m http.server 8000

Then open http://localhost:8000. Use a server rather than opening the file directly, because the page fetches `data/projects.json`.

## Structure

- `index.html` - page content, meta tags and JSON-LD
- `css/style.css` - styles
- `js/main.js` - renderer, camera and frame loop
- `js/fluid.js`, `js/particles.js` - background simulation
- `js/ui.js` - navigation, project filters, dialogs, contact form
- `js/analytics.js` - in-memory event counters, no cookies
- `data/projects.json` - project data
- `media/` - images and fonts
- `404.html`, `robots.txt`, `sitemap.xml`, `CNAME`

## Editing

The project list exists in four places that must stay in sync: the cards and the JSON-LD in `index.html`, `data/projects.json`, and `DEFAULT_PROJECTS` in `js/ui.js`.

CSS, JavaScript and JSON are cache-busted with manual `?v=` strings. Update the string when you change a file.

## Deploy

GitHub Pages publishes the `main` branch to the domain in `CNAME`. A push to `main` goes live. GitHub Pages does not apply the `_headers` file.
