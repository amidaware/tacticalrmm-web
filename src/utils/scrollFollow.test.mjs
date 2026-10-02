// The scroll-follow rule for every streaming AI window.
//
// Run: node --test src/utils/scrollFollow.test.mjs
//
// There is no component test harness in this app, so the RULE lives in a pure module and is
// tested here on its own. What it protects: scrolling up in a chat to read or copy
// something must not be undone by the next streamed chunk.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isFollowingBottom, bottomGap, followThreshold, FOLLOW_FRACTION, FOLLOW_FLOOR_PX,
} from "./scrollFollow.js";

/** A scroller: 10,000px of content in a 600px window, scrolled to `scrollTop`. */
const el = (scrollTop, { scrollHeight = 10000, clientHeight = 600 } = {}) =>
  ({ scrollTop, scrollHeight, clientHeight });

test("hard against the bottom follows", () => {
  assert.equal(isFollowingBottom(el(9400)), true);
  assert.equal(bottomGap(el(9400)), 0);
});

test("within 1% of the scrolled area follows - one pixel past it does not", () => {
  // 1% of 10,000 = 100px.
  assert.equal(followThreshold(el(0)), 100);
  assert.equal(isFollowingBottom(el(9400 - 100)), true, "exactly 1% up still follows");
  assert.equal(isFollowingBottom(el(9400 - 101)), false, "just outside the band pauses");
});

test("scrolled up to read, it pauses - and that is the whole point", () => {
  assert.equal(isFollowingBottom(el(4000)), false);
  assert.equal(isFollowingBottom(el(0)), false);
});

test("the band scales with the conversation, because it is 1% of the WHOLE area", () => {
  // A 20-minute chat: 1% of 400,000px is 4,000px - a page or two, as specified.
  const long = { scrollHeight: 400000, clientHeight: 600 };
  assert.equal(followThreshold(el(0, long)), 4000);
  assert.equal(isFollowingBottom(el(399400 - 3999, long)), true);
  assert.equal(isFollowingBottom(el(399400 - 4001, long)), false);
});

test("a short transcript uses the floor, so one wheel click does not freeze it", () => {
  // 1% of 700px is 7px - smaller than a line of text, and smaller than the rounding
  // browsers apply at fractional zoom levels.
  const short = { scrollHeight: 700, clientHeight: 600 };
  assert.equal(followThreshold(el(0, short)), FOLLOW_FLOOR_PX);
  assert.equal(isFollowingBottom(el(100 - 20, short)), true, "within the floor still follows");
  assert.equal(isFollowingBottom(el(100 - 25, short)), false);
});

test("content shorter than its window always follows: there is nothing to scroll", () => {
  assert.equal(isFollowingBottom({ scrollTop: 0, scrollHeight: 300, clientHeight: 600 }), true);
});

test("nothing rendered yet counts as following, never as paused", () => {
  assert.equal(isFollowingBottom(null), true);
  assert.equal(isFollowingBottom(undefined), true);
});

test("the fraction is the number that was asked for", () => {
  assert.equal(FOLLOW_FRACTION, 0.01);
});
