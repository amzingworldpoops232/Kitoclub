# KITO CLUB

Indie volcanic pixel platformer with PvE rooms and multiplayer lobby.

## Deploy on Render (recommended — one URL for everything)

Render hosts the **game UI + multiplayer server** together.

### Quick deploy

1. Push this folder to **GitHub**.
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect your repo — Render reads `render.yaml` automatically.
4. Click **Apply** and wait for the deploy to finish.
5. Open your live URL: `https://kito-club.onrender.com` (name may vary).

### Manual deploy (no Blueprint)

1. **New** → **Web Service** → connect GitHub repo.
2. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Health check path:** `/health`
3. **Create Web Service**.

No server URL in settings needed — Socket.io uses the same Render URL.

> Free tier may spin down after inactivity; first visit can take ~30s to wake up.

---

## Play locally

```bash
npm install
npm start
```

Open **http://localhost:3000**

---

## Other hosting (optional)

| Setup | Frontend | Backend |
|-------|----------|---------|
| **Render only** | Render | Render (easiest) |
| Netlify + Fly/Render | Netlify | Set **Server URL** in game settings |

See `netlify.toml` / `fly.toml` if you split frontend and backend.

---

## Controls

- **PC:** A/D move, W/Space jump
- **Mobile:** D-pad
- **Chat:** **CHAT** button in-game

## Multiplayer

1. **PLAY** → **PvE**
2. Create or join a room
3. Host presses **START**

PvP shows “pvp mode still in devlopment - LORD KITO” 😭
