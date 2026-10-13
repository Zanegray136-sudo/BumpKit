# Open AV Toolkit

A browser tool for planning LED video walls: pick a panel and processor, size the wall, and get the data map, power plan, rigging figures, cable schedule, pick list and an engineering report. Everything runs in the browser and projects are saved to a file or a share link.

## Workflow (sidebar order)

| Page | What it does |
| --- | --- |
| Project | Job details, templates, and a whole-project summary |
| Screen | Panel, wall size, processor, mixed cabinet sizes, target-size solver, curve, custom panels, signal (bit depth and frame rate) |
| Data | Suggested or hand-drawn data map, with connected rounded cable arrows |
| Canvas | Pixel canvas per data port for the media server, shared canvas for several screens |
| Power | Circuits per cabinet, multicore, phase balance |
| Distro | Distro boxes, supply sizing, generator size and voltage drop |
| Rigging | Weight, rigging points and WLL, ground-stack ballast, build time |
| Cables | Cable schedule |
| Pick list | Cabinets, cables, spares, cases and prices, plus a prep checklist |
| Designer | Wall elevation export (SVG/PNG) with an optional scale figure |
| Report | PDF report, CSV exports and a processor setup sheet |

Press Ctrl/Cmd + K anywhere to jump to a page or run an action. The Checks menu in the top bar lists problems and warnings for every screen.

## Planning limits

All figures are planning estimates and are not a structural or electrical sign-off. In particular:

- Rigging, ballast and wind figures are simplified. Have flown and outdoor structures checked by a qualified rigger or engineer.
- Processor and panel specs are marked with where they came from. Items without a source have not been checked against a datasheet.
- The processor setup sheet lists values to enter. It is not a file the processor software can load.

## Publishing

The app is a static site with no server or database. `npm run build` writes it to `dist/`.

- **Netlify, Vercel or Cloudflare Pages:** connect the repository, build command `npm run build`, output folder `dist`. No other settings.
- **GitHub Pages:** push to `main` and the workflow in `.github/workflows/deploy.yml` builds and deploys it. In the repository settings, set Pages > Source to "GitHub Actions". The workflow sets `BASE_PATH` to the repository name so the site works at `user.github.io/repo-name/`.
- **Anywhere else:** upload the contents of `dist/`. If the site is not at the root of its domain, build with `BASE_PATH=/folder/ npm run build`.

## Development

```
npm install
npm run dev
npx tsc --noEmit -p tsconfig.app.json
```

Stack: React 19, TypeScript, Vite, Tailwind 4, jsPDF.

## Licence

MIT. See `LICENSE`.
