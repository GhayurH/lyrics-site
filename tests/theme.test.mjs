// Colour parsing and accessible contrast logic are independent of the DOM.
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PALETTE, paletteForeground, parsePalette, validHex } from "../src/client/theme.ts";

test("custom palette accepts only complete six-digit hex colours", () => {
  assert.equal(validHex("#Ab34F0"), true);
  for (const value of ["red", "#fff", "#001122;", "var(--color)", null, 42]) {
    assert.equal(validHex(value), false);
  }
  assert.deepEqual(parsePalette({
    main: "#123456", secondary: "transparent", accent: "#AbCdEf",
  }), {
    main: "#123456", secondary: DEFAULT_PALETTE.secondary, accent: "#abcdef",
  });
  assert.deepEqual(parsePalette(null), DEFAULT_PALETTE);
});

test("automatic custom foregrounds keep typical palettes readable", () => {
  for (const palette of [
    DEFAULT_PALETTE,
    { main: "#121b2a", secondary: "#243043", accent: "#ffd166" },
    { main: "#fdfdfd", secondary: "#faf9f5", accent: "#005588" },
  ]) {
    const colors = paletteForeground(palette);
    assert(colors.ratio >= 4.5, JSON.stringify({ palette, colors }));
    assert(["#ffffff", "#171719"].includes(colors.text));
    assert(["#ffffff", "#171719"].includes(colors.accentText));
  }
});

test("widely opposed surfaces return a low ratio so the UI warns readers", () => {
  assert(paletteForeground({
    main: "#000000", secondary: "#ffffff", accent: "#c07070",
  }).ratio < 4.5);
});
