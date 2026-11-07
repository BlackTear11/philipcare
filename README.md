# Philip Davis Visit Tracker

A simple mobile-friendly visit booking page for Philip at Hazeldene House.

- No logins
- Shared calendar (everyone with the link sees the same bookings)
- Book morning (AM) or afternoon (PM) visits for the next 3 weeks
- Max 3 visits per AM / PM slot

## Run locally

```bash
cd F:\philip-visit-tracker
npm install
npm start
```

Open http://localhost:3000

## Host online (free) — Render

1. Create a free account at https://render.com
2. Push this folder to a GitHub repository
3. In Render: **New → Web Service**
4. Connect the GitHub repo
5. Use these settings:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click **Deploy**
7. Share the URL Render gives you (something like `https://philip-visit-tracker.onrender.com`)

### Important note about free hosting

On Render’s free plan, the app sleeps after inactivity (first load can take ~30 seconds), and the disk may reset on redeploy. Day-to-day family use is fine; if you redeploy, existing bookings in `bookings.json` may be cleared unless you add a paid persistent disk later.
