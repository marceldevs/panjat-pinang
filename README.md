# Panjat Pinang Mayhem

Mobile-web multiplayer climbing chaos game. Colyseus 0.17 authoritative server + Phaser 3 client, Indonesian kampung theme.

## Quick start

```bash
npm install
npm run build -w shared
npm run dev
```

- Client: http://localhost:5173
- Server: ws://localhost:2567 (proxied as `/ws` from Vite)

## Play

1. Open two browser tabs (landscape on mobile)
2. Tab A: **Buat Ruangan** → note the 4-letter code
3. Tab B: **Gabung Ruangan** → enter code
4. Both press **Ready**, host presses **Mulai**
5. Jump onto a pole, press **PANJAT**, tap the timing bar

**Offline:** Home → Latihan Offline

## Controls

| Action | Touch | Keyboard |
|--------|-------|----------|
| Move | ◀ ▶ | A/D or arrows |
| Jump / pole switch | LONCAT | W / Up |
| Climb / tap bar | PANJAT / bar | Space |
| Ability | ABILITY | E |

## Workspace

- `shared/` — simulation core (physics, climbing, abilities)
- `server/` — Colyseus `GameRoom`
- `client/` — Phaser 3 + Vite

## Docker

```bash
docker build -t panjat-pinang .
docker run -p 8080:80 panjat-pinang
```

Open http://localhost:8080
