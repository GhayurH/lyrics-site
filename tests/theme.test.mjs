// Colour parsing and accessible contrast logic are independent of the DOM.
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PALETTE, DARK_THEME_NAMES, PRESET_THEME_NAMES, normalizeCssHex, paletteForeground, paletteTextColors, parsePalette, validHex, isThemeName } from "../src/client/theme.ts";
import { readFileSync } from "node:fs";

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

test("minified CSS hex colours expand to six digits for native colour inputs", () => {
  assert.equal(normalizeCssHex("#fff", "#123456"), "#ffffff");
  assert.equal(normalizeCssHex(" #000 ", "#123456"), "#000000");
  assert.equal(normalizeCssHex("#ABC", "#123456"), "#aabbcc");
  assert.equal(normalizeCssHex("#f4ead6", "#123456"), "#f4ead6");
  assert.equal(normalizeCssHex("red; background: transparent", "#123456"), "#123456");
});

test("advanced colour overrides are optional, normalized and validated", () => {
  const legacy = parsePalette({
    main: "#123456", secondary: "#234567", accent: "#abcdef",
  });
  assert.equal(Object.hasOwn(legacy, "primaryText"), false);
  assert.equal(Object.hasOwn(legacy, "mutedText"), false);
  assert.equal(Object.hasOwn(legacy, "borders"), false);
  assert.deepEqual(parsePalette({
    main: "#123456", secondary: "#234567", accent: "#abcdef",
    primaryText: "#ABCDEF", mutedText: "rgb(0,0,0)", borders: "#9911AA",
  }), {
    main: "#123456", secondary: "#234567", accent: "#abcdef",
    primaryText: "#abcdef", borders: "#9911aa",
  });
});

test("automatic muted text is distinct and readable against normal palettes", () => {
  for (const palette of [
    DEFAULT_PALETTE,
    { main: "#171719", secondary: "#222225", accent: "#ededed" },
    { main: "#000000", secondary: "#000000", accent: "#f5f5f5" },
    { main: "#f7f7f8", secondary: "#ffffff", accent: "#1d1f22" },
  ]) {
    const colors = paletteTextColors(palette);
    assert.notEqual(colors.muted, colors.primary);
    assert(colors.ratio >= 4.5, JSON.stringify({ palette, colors }));
    assert.match(colors.borders, /^#[0-9a-f]{6}$/);
  }
});

test("manual text and border colours override Auto without changing accent text", () => {
  const palette = {
    main: "#f7f7f8", secondary: "#ffffff", accent: "#1d1d1f",
    primaryText: "#111111", mutedText: "#555555", borders: "#777777",
  };
  const auto = paletteTextColors(DEFAULT_PALETTE);
  const manual = paletteTextColors(palette);
  assert.equal(manual.primary, "#111111");
  assert.equal(manual.muted, "#555555");
  assert.equal(manual.borders, "#777777");
  assert(manual.ratio >= 4.5);
  assert.notEqual(manual.borders, auto.borders);
  assert(paletteTextColors({ ...palette, mutedText: "#ffffff" }).ratio < 4.5);
});

test("Auto muted text and borders stay legible despite an unreadable manual primary", () => {
  const surfaces = { main: "#f7f7f8", secondary: "#ffffff", accent: "#1d1d1f" };
  const auto = paletteTextColors(surfaces);
  const overridden = paletteTextColors({ ...surfaces, primaryText: "#ffffff" });
  assert.equal(overridden.primary, "#ffffff");
  assert.equal(overridden.muted, auto.muted);
  assert.equal(overridden.borders, auto.borders);
  assert.notEqual(overridden.muted, "#ffffff");
  assert.notEqual(overridden.borders, "#f9f9fa");
  assert(overridden.ratio < 4.5);
});

test("preset Auto text roles are preserved exactly until Custom surfaces change", () => {
  for (const [main, secondary, primary, muted, borders] of [
    ["#171719", "#222225", "#ededed", "#b5b5ba", "#3a3a3f"],
    ["#000000", "#000000", "#f5f5f5", "#b5b5b5", "#333333"],
    ["#f7f7f8", "#ffffff", "#1d1d1f", "#66666b", "#dddddf"],
    ["#f4ead6", "#fbf4e6", "#352b21", "#6b5947", "#d5c4a8"],
  ]) {
    const palette = parsePalette({ main, secondary, accent: primary,
      inherited: { main, secondary, primary, muted, borders } });
    assert.equal(Object.hasOwn(palette, "primaryText"), false);
    assert.equal(Object.hasOwn(palette, "mutedText"), false);
    assert.equal(Object.hasOwn(palette, "borders"), false);
    const auto = paletteTextColors(palette);
    assert.deepEqual([auto.primary, auto.muted, auto.borders], [primary, muted, borders]);
    const changed = paletteTextColors({ ...palette, main: "#fefefe" });
    assert.notDeepEqual([changed.primary, changed.muted, changed.borders], [primary, muted, borders]);
    assert.deepEqual(paletteTextColors({ ...palette, main }), auto);
  }
});

test("invalid stored inherited colours never become CSS values", () => {
  const palette = parsePalette({
    main: "#171719", secondary: "#222225", accent: "#ededed",
    inherited: { main: "#171719", secondary: "#222225",
      primary: "red; color: transparent", muted: "#b5b5ba", borders: "#3a3a3f" },
  });
  assert.equal(Object.hasOwn(palette, "inherited"), false);
  const auto = paletteTextColors(palette);
  assert.equal(auto.primary, "#ffffff");
});

test("all reading presets have readable text and actions on their actual surfaces", () => {
  const css = readFileSync("src/styles/tokens.css", "utf8") + "\n" +
    readFileSync("src/styles/theme-palettes.css", "utf8");
  const curated = ["paper", "clay", "rosewood", "sage", "ocean", "slate", "dusk", "forest", "plum", "graphite"];
  const value = (id, role) => {
    const prefix = "--preset-" + id + "-" + role + ": ";
    const line = css.split("\n").find((part) => part.trim().startsWith(prefix));
    assert(line, "missing preset token: " + prefix);
    const hex = line.trim().slice(prefix.length).replace(";", "");
    assert.match(hex, /^#[0-9a-f]{6}$/i);
    return hex;
  };
  const luminance = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + .05) / (values[1] + .05);
  };
  assert.equal(PRESET_THEME_NAMES.length, curated.length + 5);
  for (const id of curated) {
    assert(PRESET_THEME_NAMES.includes(id), "preset not selectable: " + id);
    assert(isThemeName(id));
    assert(css.includes('html[data-theme="' + id + '"]'));
    const colors = Object.fromEntries(["main", "surface", "ink", "muted", "border", "tag", "accent", "button"]
      .map((role) => [role, value(id, role)]));
    for (const background of ["main", "surface"]) {
      for (const foreground of ["ink", "muted"]) {
        assert(contrast(colors[background], colors[foreground]) >= 4.5,
          id + " has insufficient " + foreground + " contrast on " + background);
      }
    }
    assert(contrast(colors.accent, colors.button) >= 4.5, id + " has insufficient button contrast");
    const scheme = DARK_THEME_NAMES.includes(id) ? "dark" : "light";
    assert(css.includes('html[data-theme="' + id + '"] {\n  color-scheme: ' + scheme));
  }
  assert.equal(isThemeName("custom"), true);
  assert.equal(isThemeName("unrecognized"), false);
});
