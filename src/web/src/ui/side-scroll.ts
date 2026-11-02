/**
 * A row too long for its place (the panel's tabs, the courts along the map) scrolls with the mouse wheel and by dragging
 * with the mouse, as a finger already scrolls it on a touch screen (Haakon, 2 November 2026: "you can only scroll with
 * arrow keys, not with dragging your mouse or mouse wheel"). A drag never clicks what it started on. Given as the row's
 * ref (`ref={sideScroll}`), whose cleanup React calls when the row goes.
 */
export function sideScroll(el: HTMLElement | null): (() => void) | undefined {
  if (el === null) return;
  const overflows = () => el.scrollWidth > el.clientWidth + 1;
  const wheel = (e: WheelEvent) => {
    // A sideways wheel or trackpad scrolls the row by itself; an upright wheel is turned sideways.
    if (!overflows() || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
  };
  let start: { id: number; x: number; left: number } | null = null;
  let dragged = false;
  const down = (e: PointerEvent) => {
    dragged = false;
    if (e.pointerType === "mouse" && e.button === 0 && overflows()) start = { id: e.pointerId, x: e.clientX, left: el.scrollLeft };
  };
  const move = (e: PointerEvent) => {
    if (start === null || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    if (!dragged && Math.abs(dx) < 6) return;
    if (!dragged) {
      dragged = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
    }
    el.scrollLeft = start.left - dx;
  };
  const up = (e: PointerEvent) => {
    if (start === null || e.pointerId !== start.id) return;
    start = null;
    el.classList.remove("dragging");
  };
  const click = (e: MouseEvent) => {
    if (!dragged) return;
    dragged = false;
    e.stopPropagation();
    e.preventDefault();
  };
  el.addEventListener("wheel", wheel, { passive: false });
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("click", click, true);
  return () => {
    el.removeEventListener("wheel", wheel);
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    el.removeEventListener("click", click, true);
  };
}
