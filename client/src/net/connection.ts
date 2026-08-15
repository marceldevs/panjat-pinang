import { Client, Room } from "@colyseus/sdk";

export type GameRoom = Room;

function endpoint(): string {
  const env = import.meta.env.VITE_COLYSEUS_URL as string | undefined;
  if (env) return env;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Dev: Vite proxies /ws → Colyseus. Prod: same origin nginx /ws.
    return `${proto}//${window.location.host}/ws`;
  }
  return "ws://localhost:2567";
}

let client: Client | null = null;

export function getClient(): Client {
  if (!client) client = new Client(endpoint());
  return client;
}

export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function createGameRoom(
  name: string
): Promise<{ room: GameRoom; roomCode: string }> {
  const roomCode = generateRoomCode();
  const room = await getClient().create("game", { name, roomCode });
  return { room, roomCode };
}

export async function joinGameRoom(roomCode: string, name: string): Promise<GameRoom> {
  return getClient().join("game", {
    roomCode: roomCode.toUpperCase(),
    name,
  });
}

export interface NetSession {
  room: GameRoom;
  sessionId: string;
  roomCode: string;
}

let active: NetSession | null = null;

export function setActiveSession(session: NetSession | null): void {
  active = session;
}

export function getActiveSession(): NetSession | null {
  return active;
}
