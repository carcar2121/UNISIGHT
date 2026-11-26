# UNISIGHT · Education & Gender Equality for 2050

> Project folder: **Proyecto Dea**

UNISIGHT helps young people understand two UN Sustainable Development Goals, **SDG 4 (Quality Education)** and **SDG 5 (Gender Equality)**, and motivates them to act:

1. **Inform** in an accessible, visual way, with data from the UN, UNESCO, UNICEF, UN Women and INEGI.
2. **Reflect on the future** with education scenarios for 2050 and interactive **What If?** stories.
3. **Take Action** with concrete steps at home, at school, in the community and on social media.

**Features:** minimalist design with floating 3D objects (Three.js), interactive charts with 2050 scenarios (Chart.js), interactive What If? stories with Education and Equality meters, a "Catch the knowledge" mini game, a pledge tracker filtered by place, a Legal section with APA 7 references, and a Meet Us section with the presentation video.

## Folder structure

```
Proyecto Dea/
├── index.html                 Page structure
├── css/styles.css             Design, palette, animations
├── js/
│   ├── main.js                Loads the Excel database and builds every section
│   ├── three-scene.js         3D objects of the hero
│   ├── charts.js              Interactive charts
│   ├── game.js                Mini game
│   ├── whatif.js              What If? interactive stories
│   └── data.js                Offline copy of the Excel (auto-generated)
├── database/Dea_Database.xlsx The database: ALL texts, buttons, functions, chart data, game items, palette, references
├── assets/img/logo.webp       Logo
├── assets/video/meet-us.mp4   Presentation video
└── tools/excel_to_js.py       Regenerates js/data.js from the Excel
```

## The Excel database

| Sheet | What it controls |
|---|---|
| Content | Every card and paragraph: `ID, Section, Topic, Information, Source, Link, Tag` |
| What_If | The interactive stories: one row per choice, with its result and Education / Equality points, plus the three 2050 endings |
| UI_Elements | Every button, label and control of the page (text, action, target) |
| Functions | What each JavaScript function does and when it runs |
| Chart_Data | The numbers behind the charts and the counters |
| Game | Items, points and facts of the mini game |
| Palette | Colours of the site |
| References | Sources in APA 7th edition (shown in the Legal section) |
| Settings | Title, tagline, hero texts, logo and video paths, footer |
| Guide | Explanation of each column |

**To change the page, edit the Excel and upload it.** On GitHub Pages the site reads `database/Dea_Database.xlsx` directly, so changes appear without touching the code.

When you open `index.html` by double-click, browsers block reading the Excel, so the page uses `js/data.js`. To refresh that copy after editing the Excel:

```bash
pip install openpyxl
python3 tools/excel_to_js.py
```

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Publish on GitHub Pages

1. Create a new repository on GitHub (for example `unisight`).
2. Upload the **contents** of this folder (drag and drop on github.com, or with git):
   ```bash
   git init
   git add .
   git commit -m "UNISIGHT website"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/unisight.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → main / (root)**.
4. Your site will be at `https://YOUR-USER.github.io/unisight/`.

## Notes

- Libraries load from the jsDelivr CDN, so you need an internet connection: Three.js 0.149, Chart.js 4.4, SheetJS 0.18.
- The 2050 projections and the What If? stories are team creations. They are not official forecasts.
- Before presenting, verify every figure against the source linked in the Excel (Source / Link columns).
- Pledges, story results and the best game score are saved only in the visitor's browser (localStorage).
