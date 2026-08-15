import { Client } from "@colyseus/sdk";

async function main() {
  const client = new Client("http://localhost:2567");
  const code = "ZZ99";
  const a = await client.create("game", { name: "Host", roomCode: code });
  console.log("created", a.sessionId, (a.state as { roomCode?: string }).roomCode);
  const b = await client.join("game", { name: "Guest", roomCode: code });
  console.log(
    "joined",
    b.sessionId,
    "players",
    (b.state as { players?: { size: number } }).players?.size
  );
  a.send("ready", { ready: true });
  b.send("ready", { ready: true });
  await new Promise((r) => setTimeout(r, 300));
  a.send("start", {});
  await new Promise((r) => setTimeout(r, 800));
  console.log("phase", (a.state as { phase?: string }).phase);
  await a.leave();
  await b.leave();
  console.log("JOIN_FLOW_OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
