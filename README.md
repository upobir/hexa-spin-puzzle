# Triangle Puzzle

A browser-based puzzle game with an equilateral triangle tessellation. Click vertices where 6 triangles meet to rotate them clockwise.

## Play Online

Hosted on GitHub Pages: **https://[your-username].github.io/puzzle/**

(Replace `[your-username]` with your GitHub username and `puzzle` with your repo name.)

## Run Locally

Open `index.html` in a browser, or:

```bash
npx serve
```

Then open http://localhost:3000

## How to Play

- The canvas shows a square region tessellated with equilateral triangles
- Triangles are numbered 1 to N from left to right
- Click any vertex where 6 triangles meet (highlighted on hover) to rotate those 6 triangles clockwise
- Labels rotate with the triangles

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose the `main` branch and `/ (root)` folder
5. Save — your puzzle will be live at `https://[username].github.io/[repo-name]/`
