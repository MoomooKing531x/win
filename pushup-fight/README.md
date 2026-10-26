# PUSHUP FIGHT

Single-file pushup fighting game (camera pose detection, duel + sumo modes).

## Put it on GitHub (free hosting)

```bash
cd pushup-fight
git init
git add .
git commit -m "Pushup Fight"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then on GitHub: **Settings -> Pages -> Source: GitHub Actions**.
After the workflow finishes your game is at `https://<you>.github.io/<repo>/`.
(HTTPS is required for the camera, and GitHub Pages provides it.)

## Multiplayer

On GitHub Pages the game automatically uses **NET: ONLINE P2P** (WebRTC through
PeerJS's free public broker, no server of yours):

- **Create room**: host gets a 4-letter code, friends enter it under Join.
- **1v1 queue**: two players who queue the same mode get matched.
- The public room list does not work in P2P mode, so share the code.
- Test alone with two browser windows (not tabs) side by side.

Notes: if the PeerJS public broker is down, P2P won't connect. Strict
corporate/school networks can block WebRTC. Peers are matched by well-known IDs
(`ffpu-<CODE>`), so don't treat rooms as private or secure.

## Optional: your own game server

GitHub Pages can't run Node. If you later host `server/pushup-hub.js` elsewhere
(Render, Fly, a VPS), hook it into your WebSocket server as described at the top
of that file, and point the page at it. Currently the client connects to the same
host it was served from (`location.host`), so serve index.html from that server too.
