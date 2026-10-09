import { readFileSync } from "node:fs";
export const fixture = name => readFileSync(new URL("./fixtures/conversions/" + name, import.meta.url), "utf8");
export const bytes = text => new TextEncoder().encode(text).buffer;
export const openFile = (reader, name, text = fixture(name)) => reader({name, size:bytes(text).byteLength},bytes(text));
export const cue = (text, start = "00:00:01,000", end = "00:00:03,000") => "1\n" + start + " --> " + end + "\n" + text + "\n";
