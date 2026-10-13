import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
function tokens(selector) {
  const block = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}
function color(palette, name) {
  const value = palette[name];
  assert.ok(value, `Missing semantic color token: ${name}`);
  return value.startsWith("var(") ? color(palette, value.slice(4, -1)) : value;
}
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const levels = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (levels[0] + 0.05) / (levels[1] + 0.05);
}

describe("shared light and dark theme contrast", () => {
  const light = tokens(":root");
  it("action, supporting accent and feedback roles stay independent", () => {
    for (const palette of [light, { ...light, ...tokens('@media (prefers-color-scheme: dark)') }]) {
      assert.notEqual(color(palette, "--action"), color(palette, "--accent"));
      assert.notEqual(color(palette, "--on-action"), color(palette, "--on-accent"));
      assert.notEqual(color(palette, "--action"), color(palette, "--warning"));
      assert.notEqual(color(palette, "--action"), color(palette, "--error-fill"));
    }
  });
  for (const [theme, palette] of [["light", light], ["dark", { ...light, ...tokens('@media (prefers-color-scheme: dark)') }]]) {
    it(`${theme}: readable text, links, actions and state messages meet AA`, () => {
      const pairs = [
        ...["--background", "--page-surface", "--surface", "--surface-soft", "--surface-elevated"].flatMap((surface) => [["--foreground", surface], ["--muted", surface]]),
        ["--accent", "--surface"], ["--accent", "--surface-soft"], ["--accent", "--accent-soft"], ["--accent", "--hover-surface"],
        ["--accent-hover", "--surface"], ["--accent-hover", "--hover-surface"],
        ["--accent-pressed", "--accent-soft"], ["--placeholder", "--surface"],
        ...["--action", "--action-hover", "--action-pressed"].map((action) => ["--on-action", action]),
        ...[["--info", "--info-soft"], ["--success", "--success-soft"], ["--error", "--error-soft"], ["--warning", "--warning-soft"]].flatMap(([text, soft]) => [[text, soft], [text, "--surface"], [text, "--surface-soft"]]),
        ...["--error-fill", "--error-fill-hover", "--error-fill-pressed"].map((fill) => ["--on-error", fill]), ["--disabled-text", "--disabled"],
        ["--orange-ink", "--orange-soft"],
        ["--footer-text", "--footer"], ["--footer-muted", "--footer"],
        ["--nav-text", "--nav-bg"], ["--nav-muted", "--nav-bg"],
        ["--nav-text", "--video-surface"], ["--on-dark-muted", "--contrast-surface"],
      ];
      for (const [text, background] of pairs) {
        const ratio = contrast(color(palette, text), color(palette, background));
        assert.ok(ratio >= 4.5, `${text} on ${background}: ${ratio.toFixed(2)}:1`);
      }
    });
    it(`${theme}: field boundaries, focus indicators and product symbols meet non-text contrast`, () => {
      for (const [foreground, background] of [
        ...["--surface", "--surface-soft", "--surface-elevated"].flatMap((surface) => [["--control-border", surface], ["--focus", surface], ["--action-border", surface]]),
        ["--focus-on-dark", "--nav-bg"], ["--focus-on-dark", "--video-surface"],
        ["--accent-fill", "--surface"], ["--accent", "--accent-soft"],
        ...["--icon-surface", "--icon-neutral", "--icon-medium", "--icon-deep"].map((tile) => ["--on-accent", tile]),
        ...["--icon-surface", "--icon-neutral", "--icon-medium", "--icon-deep"].map((tile) => ["--orange-ink", tile]),
      ]) {
        const ratio = contrast(color(palette, foreground), color(palette, background));
        assert.ok(ratio >= 3, `${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
      }
    });
  }
});
