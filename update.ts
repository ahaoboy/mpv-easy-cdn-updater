import { writeFileSync } from "fs";
import { encode, File, Fmt } from "@easy-install/easy-archive";
import {
  downloadBinaryFromGithub,
  getScriptFiles,
  tryFix,
} from "@mpv-easy/mpsm";

const DATA = JSON.parse(
  await fetch(
    "https://raw.githubusercontent.com/mpv-easy/mpsm-scripts/main/scripts-full.json",
  ).then((i) => i.text()),
);

// GITHUB limit 50MB
const MAX_ZIP_SIZE = 50 * 1024 * 1024;

for (const name in DATA) {
  const { download } = DATA[name] as Record<string, string>;
  const zipName = name + ".zip";

  if (![".js", ".lua", ".zip", ".conf"].some((i) => download.endsWith(i))) {
    continue;
  }

  try {
    const scriptFiles = await getScriptFiles(download, DATA[name]);
    if (!scriptFiles.length) {
      continue;
    }
    const confURL = download.split(".").slice(0, -1).join(".") + ".conf";
    try {
      // detect conf
      const buffer = await downloadBinaryFromGithub(confURL);
      if (buffer) {
        const confName = confURL.split("/").at(-1)!;
        const file = new File(
          confName,
          new Uint8Array(buffer),
          undefined,
          false,
          BigInt(+new Date()),
        );
        scriptFiles.push(file);
      }
    } catch {
      console.log("not found conf: ", confURL, DATA[name]);
    }

    const fixFiles = tryFix(scriptFiles, DATA[name]);

    const bin = encode(Fmt.Zip, fixFiles);
    if (!bin) {
      console.log("encode error");
      continue;
    }

    if (bin.length > MAX_ZIP_SIZE) {
      console.log("too big", bin.length, DATA[name]);
      continue;
    }
    writeFileSync(zipName, bin);
  } catch (e) {
    console.log(DATA[name], e);
  }
}
