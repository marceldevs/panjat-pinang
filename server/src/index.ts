import { defineServer, defineRoom } from "colyseus";
import { GameRoom } from "./rooms/GameRoom.js";

const port = Number(process.env.PORT) || 2567;

const server = defineServer({
  rooms: {
    game: defineRoom(GameRoom).filterBy(["roomCode"]),
  },
  express: (app) => {
    app.get("/health", (_req, res) => {
      res.json({ ok: true, service: "panjat-pinang" });
    });
  },
});

server.listen(port).then(() => {
  console.log(`[panjat-pinang] Colyseus listening on :${port}`);
});
