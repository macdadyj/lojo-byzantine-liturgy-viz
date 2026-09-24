import type { SpaceId } from "./spaces";

export type Role = "priest" | "deacon" | "people" | "choir" | "reader";

export type PhaseId = "gathering" | "word" | "faithful" | "sending";

export type RouteId = "little-entrance" | "great-entrance";

export type HearLine =
  | { kind: "speech"; who: Role; text: string }
  | { kind: "note"; text: string };

export type LiturgyStep = {
  id: string;
  phase: PhaseId;
  title: string;
  spaces: SpaceId[];
  roles: Role[];
  see: string;
  hear: HearLine[];
  why: string;
  route?: RouteId;
};

export function phaseLabel(phase: PhaseId): string {
  switch (phase) {
    case "gathering":
      return "Gathering";
    case "word":
      return "Liturgy of the Word";
    case "faithful":
      return "Liturgy of the Faithful";
    case "sending":
      return "Sending";
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}

export const roleLabels: Record<Role, string> = {
  priest: "Priest",
  deacon: "Deacon",
  people: "People",
  choir: "Choir",
  reader: "Reader",
};
