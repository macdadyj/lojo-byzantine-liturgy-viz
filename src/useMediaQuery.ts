import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", listener);
      return () => list.removeEventListener("change", listener);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phone layout: narrow portrait, or a short landscape touch screen (a phone turned sideways keeps it). */
export const phoneQuery = "(max-width: 720px), (max-height: 520px) and (pointer: coarse)";
