import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") colorIndex = 0;
  @type("boolean") ready = false;
  @type("boolean") isHost = false;
  @type("boolean") connected = true;
  @type("boolean") inactive = false;
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("number") progress = 0;
  @type("number") poleIndex = 0;
  @type("string") mode = "ground";
  @type("number") facing = 1;
  @type("number") ragdollTimer = 0;
  @type("string") heldAbility = "";
  @type("boolean") hasSecondChance = false;
  @type("string") lastClimbGrade = "";
  @type("number") lastClimbFlash = 0;
  @type("string") climbId = "";
  @type("number") climbDuration = 0;
  @type("number") climbZoneCenter = 0;
  @type("number") climbZoneSize = 0;
  @type("number") climbStartedAt = 0;
  @type("string") effects = "";
}

export class PickupState extends Schema {
  @type("string") id = "";
  @type("string") type = "";
  @type("number") poleIndex = 0;
  @type("number") height = 0;
  @type("number") x = 0;
  @type("number") y = 0;
}

export class GameState extends Schema {
  @type("string") phase = "LOBBY";
  @type("string") roomCode = "";
  @type("string") hostId = "";
  @type("number") tick = 0;
  @type("number") time = 0;
  @type("number") countdownRemaining = 0;
  @type("number") victoryFreezeRemaining = 0;
  @type("string") winnerId = "";
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type([PickupState]) pickups = new ArraySchema<PickupState>();
  @type("string") oiledPoles = "";
  @type(["string"]) rankings = new ArraySchema<string>();
}
