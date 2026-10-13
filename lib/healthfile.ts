import { Unzip, UnzipInflate } from "fflate";
import type { AppleHealthParser } from "./applehealth";

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

async function isZip(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b; // "PK"
}

/**
 * Stream an Apple Health export (export.zip or export.xml) through the parser.
 * Nothing is uploaded: the file is read in chunks inside the browser.
 */
export async function readAppleHealth(file: File, parser: AppleHealthParser, onProgress: (fraction: number) => void): Promise<void> {
  const reader = file.stream().getReader();
  let read = 0;
  let tick = 0;

  if (await isZip(file)) {
    let found = false;
    let failure: Error | null = null;
    const unzip = new Unzip();
    unzip.register(UnzipInflate);
    unzip.onfile = (f) => {
      if (!/(^|\/)export\.xml$/.test(f.name)) return; // skip export_cda.xml, ECGs, GPX routes
      found = true;
      const dec = new TextDecoder("utf-8");
      f.ondata = (err, data, final) => {
        if (err) {
          failure = err;
          return;
        }
        parser.feed(dec.decode(data, { stream: !final }));
      };
      f.start();
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value.length;
      unzip.push(value, false);
      if (failure) throw failure;
      if (++tick % 6 === 0) {
        onProgress(Math.min(0.99, read / file.size));
        await yieldToUi();
      }
    }
    unzip.push(new Uint8Array(0), true);
    if (failure) throw failure;
    if (!found) throw new Error("This zip doesn't contain export.xml. Use the file from Health → Export All Health Data.");
  } else {
    const dec = new TextDecoder("utf-8");
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value.length;
      parser.feed(dec.decode(value, { stream: true }));
      if (++tick % 6 === 0) {
        onProgress(Math.min(0.99, read / file.size));
        await yieldToUi();
      }
    }
    parser.feed(dec.decode());
  }
  onProgress(1);
}
