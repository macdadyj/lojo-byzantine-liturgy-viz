import { useRef, useState } from "react";
import { walkStick } from "../scene/walkGoal";

/** How far (CSS px) the thumb travels from the centre for a full-speed walk. */
const reach = 44;

/**
 * A thumb stick for Free look on touch screens. It follows only the finger that pressed it, so the other
 * thumb can drag the view at the same time.
 */
export function Joystick() {
  const finger = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  function release() {
    finger.current = null;
    walkStick.x = 0;
    walkStick.y = 0;
    setKnob({ x: 0, y: 0 });
  }

  return (
    <div
      className="joystick"
      role="application"
      aria-label="Walk: drag the thumb to move"
      onPointerDown={(event) => {
        if (finger.current) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        finger.current = { id: event.pointerId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (finger.current?.id !== event.pointerId) return;
        move(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (finger.current?.id === event.pointerId) release();
      }}
      onPointerCancel={(event) => {
        if (finger.current?.id === event.pointerId) release();
      }}
      onLostPointerCapture={(event) => {
        if (finger.current?.id === event.pointerId) release();
      }}
    >
      <span className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} aria-hidden="true" />
      <span className="joystick-label" aria-hidden="true">
        Move
      </span>
    </div>
  );

  function move(clientX: number, clientY: number) {
    const start = finger.current;
    if (!start) return;
    let dx = clientX - start.x;
    let dy = clientY - start.y;
    const length = Math.hypot(dx, dy);
    if (length > reach) {
      dx = (dx / length) * reach;
      dy = (dy / length) * reach;
    }
    walkStick.x = dx / reach;
    walkStick.y = -dy / reach;
    setKnob({ x: dx, y: dy });
  }
}
