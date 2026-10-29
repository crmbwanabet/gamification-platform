// What useWheel must do each time it opens the hosted wheel (bug 2026-10-29).
//
// The wheel app (WheelWidget.jsx) renders NOTHING after its own X / GOT IT:
// handleClose latches `closed`, and only a fresh 'bwanabet-auth' message
// un-latches it. Our overlay is a transparent full-screen iframe (frame=full),
// so re-opening a latched wheel covered the Bonus Center with an empty frame
// that swallowed every click: the page looked frozen.
//  - logged in: re-send the token on every open, exactly as the wheel's own
//    embed.js does in openWidget() (harmless when not latched: the wheel only
//    un-latches, its availability check runs once).
//  - preview (test mode, no token ever): reload the frame when the wheel closed
//    itself since it loaded; test mode starts at the prompt again.
export function wheelReopenAction({ hasToken, closedSinceLoad }) {
  if (hasToken) return 'auth';
  return closedSinceLoad ? 'reload' : 'none';
}
