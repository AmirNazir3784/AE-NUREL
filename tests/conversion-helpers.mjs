import { readFileSync } from "node:fs";
// Normalize checkout line endings before tests deliberately construct CRLF input.
export const fixture = name => readFileSync(new URL("./fixtures/conversions/" + name, import.meta.url), "utf8").replace(/\r\n/g, "\n");
export const bytes = text => new TextEncoder().encode(text).buffer;
export const openFile = (reader, name, text = fixture(name)) => reader({name, size:bytes(text).byteLength},bytes(text));
export const cue = (text, start = "00:00:01,000", end = "00:00:03,000") => "1\n" + start + " --> " + end + "\n" + text + "\n";
