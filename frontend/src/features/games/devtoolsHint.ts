// A review hint for the admin, never proof and never shown to players: did the browser window look
// like it had developer tools docked during a game?
//
// Docked dev tools take space from one side of the page only, so the gap between the window and
// the page grows in one direction while the other stays normal. Page zoom grows both gaps, so it
// is not counted. To keep false alarms low it only runs on desktop (fine pointer) and needs the
// sign on two checks in a row. Known limits: undocked dev tools are not noticed, and a large
// browser side panel can look the same.

export type WindowSize = {
  outerWidth: number;
  outerHeight: number;
  innerWidth: number;
  innerHeight: number;
};

const WIDTH_GAP = 200; // px taken from the side by docked dev tools
const HEIGHT_GAP = 300; // px taken from the bottom (normal browser bars are ~60–160 px)
const NORMAL_WIDTH_GAP = 40;
const NORMAL_HEIGHT_GAP = 200;

export function looksLikeDockedDevtools(size: WindowSize) {
  if (!size.outerWidth || !size.outerHeight || !size.innerWidth || !size.innerHeight) return false;
  const widthGap = size.outerWidth - size.innerWidth;
  const heightGap = size.outerHeight - size.innerHeight;
  const side = widthGap > WIDTH_GAP && heightGap < NORMAL_HEIGHT_GAP;
  const bottom = heightGap > HEIGHT_GAP && widthGap < NORMAL_WIDTH_GAP;
  return side || bottom;
}

type Environment = {
  size: () => WindowSize;
  desktop: () => boolean;
  every: (ms: number, check: () => void) => () => void;
};

const browser: Environment = {
  size: () => window,
  desktop: () => window.matchMedia?.('(pointer: fine)').matches ?? false,
  every: (ms, check) => {
    const timer = window.setInterval(check, ms);
    return () => window.clearInterval(timer);
  },
};

/** Watches one game session. `flagged()` is true once the sign was seen on two checks in a row. */
export function watchDevtools(environment: Environment = browser, intervalMs = 2000) {
  let flagged = false;
  let streak = 0;
  const check = () => {
    streak = looksLikeDockedDevtools(environment.size()) ? streak + 1 : 0;
    if (streak >= 2) flagged = true;
  };
  const stop = environment.desktop() ? environment.every(intervalMs, check) : () => {};
  if (environment.desktop()) check();
  return { flagged: () => flagged, stop };
}
