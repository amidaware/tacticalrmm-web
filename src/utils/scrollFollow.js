// Should a live view keep following its own bottom?
//
// Asked for (owner, 2026-09-22): "when i scroll up in any of the AI windows... i need it to
// PAUSE where I am when new info shows up at the bottom of the screen.. i am usually
// reviewing or trying to copy / paste ... it should only keep updating with the most recent
// data when i am at the bottom of the screen within 1% of the entire scrolled area".
//
// One definition, used by every window that streams text (PiChat.vue - the device chat and
// the AI decision chat - and CommandStream.vue), because "how close to the bottom counts as
// at the bottom" is the kind of number that otherwise ends up different in three places.
//
// The threshold is 1% of `scrollHeight` - the ENTIRE scrolled area, as specified - so it
// scales with the conversation: a comfortable band on a long transcript, a few pixels on a
// short one. Hence the floor: without it, a transcript one line taller than its window
// would unpin itself on a single wheel click and then sit there paused, which reads as a
// frozen chat rather than a deliberate hold.

/** 1% of the scrolled area. */
export const FOLLOW_FRACTION = 0.01;
/** Never less than this many pixels, for short transcripts (and sub-pixel zoom levels). */
export const FOLLOW_FLOOR_PX = 24;

/** Distance in px from the bottom of the scrolled area. 0 = hard against the bottom. */
export function bottomGap(el) {
  if (!el) return 0;
  return el.scrollHeight - el.scrollTop - el.clientHeight;
}

/** The band, in px, that still counts as "at the bottom" for this element. */
export function followThreshold(el, { fraction = FOLLOW_FRACTION, floor = FOLLOW_FLOOR_PX } = {}) {
  if (!el) return floor;
  return Math.max(floor, el.scrollHeight * fraction);
}

/**
 * Is this scroller at (or within 1% of) its bottom?
 *
 * A missing element counts as "yes": nothing has been rendered yet, so there is no reading
 * position to protect, and the alternative would be a window that never auto-scrolls at all.
 */
export function isFollowingBottom(el, opts) {
  if (!el) return true;
  return bottomGap(el) <= followThreshold(el, opts);
}
