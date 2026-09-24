import { useEffect } from "react";
import { nextIndex, prevIndex } from "./liturgy/navigate";
import { steps } from "./liturgy/steps";

function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function useLiturgyKeyboard(setIndex: (update: (current: number) => number) => void) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      const count = steps.length;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((current) => nextIndex(current, count));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((current) => prevIndex(current, count));
      } else if (event.key === "Home") {
        event.preventDefault();
        setIndex(() => 0);
      } else if (event.key === "End") {
        event.preventDefault();
        setIndex(() => count - 1);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIndex]);
}
