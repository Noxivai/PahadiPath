# PahadiPath

A standalone, dependency-free web MVP for discovering treks and trails in Uttarakhand.

## Run locally

Requires Node.js 18 or newer.

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set the `PORT` environment variable to use a different port.

## Publish on GitHub Pages

The `.github/workflows/pages.yml` workflow deploys the static site after a push to `main`. Create a GitHub repository, push the contents of this folder to its `main` branch, then in **Settings → Pages** set **Build and deployment → Source** to **GitHub Actions**. The first deployment will publish the site at `https://<github-username>.github.io/<repository-name>/`.

## MVP features

- Search trails by name, region, description, or season.
- Filter by difficulty and sort by distance or altitude.
- Read trail details and save favorites in browser storage.
- Manage the trail list at [http://localhost:3000/admin.html](http://localhost:3000/admin.html): add, edit, delete, search, or restore starter trails.
- Responsive layouts for mobile and desktop.

The admin panel is a local demo and stores trail changes in this browser's `localStorage`; changes are shared between PahadiPath tabs in the same browser, but not with other devices or visitors. It has no login or server-backed database and is not suitable for managing a publicly deployed site.

Trail information is indicative, not a live route or safety report. Confirm access, weather, permits, and current conditions with local guides and official sources before travelling. Images are loaded from Unsplash.

## Validate

```sh
npm test
```
