# How to Run the Frontend

**Important:** You must run commands from this folder: `frontend/oilandgasclub` (where `package.json` and `angular.json` are).

---

## Run the Public Site (http://localhost:4200/)

1. Open a terminal.
2. Go to the frontend workspace:
   ```bash
   cd D:\oilandgasclub\frontend\oilandgasclub
   ```
3. Install dependencies (first time only):
   ```bash
   npm install
   ```
4. Start the site dev server:
   ```bash
   npm run start:site
   ```
   Or: `ng serve site --port 4200`

5. Wait until you see:
   ```
   ➜  Local:   http://localhost:4200/
   ```
6. Open your browser at **http://localhost:4200/**

---

## Run the Elearn App (http://localhost:4201/)

From the same folder (`frontend/oilandgasclub`):

```bash
npm run start:elearn
```

Then open **http://localhost:4201/**

---

## If "It's Not Running"

- **Wrong folder:** If you run from `backend\Elearn.Serverless` or the repo root, `npm run start:site` will fail (no package.json there). Always `cd` to `frontend\oilandgasclub` first.
- **Port in use:** If port 4200 is already in use, stop the other process or run: `ng serve site --port 4202` and use http://localhost:4202/
- **Dependencies:** Run `npm install` from `frontend\oilandgasclub` if you see module-not-found errors.
