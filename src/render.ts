import fs from "node:fs/promises";
import path from "node:path";
import { renderToWebStream } from "vue/server-renderer";
import { VueSSRApp } from ".";
import { RenderError, type RootProps } from "./utils";
import { logger } from "./logger";

type ManifestFile = Record<
  string,
  { isEntry: boolean; file: string; name: string }
>;

export class Manifest {
  public entriesByName: Map<string, VueSSRApp> = new Map();
  public entriesBySrc: Map<string, VueSSRApp> = new Map();

  constructor(public manifestPath: string) {}

  public async loadManifest() {
    let manifest: ManifestFile;
    try {
      const manifestJson = await fs.readFile(this.manifestPath, "utf-8");
      manifest = JSON.parse(manifestJson) as ManifestFile;
    } catch (error) {
      throw new Error(
        `Could not load JSON manifest file at ${this.manifestPath}.`,
      );
    }

    for (const [srcKey, { isEntry, name, file }] of Object.entries(manifest)) {
      if (isEntry) {
        const entryPath = path.resolve(this.manifestPath, "..", file);
        const ssrApp = await importApp(entryPath);

        this.entriesByName.set(name, ssrApp);
        this.entriesBySrc.set(srcKey, ssrApp);
      }
    }

    return this;
  }

  public getEntryPath(name: string): VueSSRApp | undefined {
    return this.entriesByName.get(name) ?? this.entriesBySrc.get(name);
  }
}

async function importSSRApp(entryPath: string): Promise<any> {
  /** @vite-ignore */
  return (await import(entryPath))?.ssrApp;
}

export async function importApp(
  entryPath: string,
  importFactory: typeof importSSRApp = importSSRApp,
): Promise<VueSSRApp> {
  let ssrApp;

  try {
    ssrApp = await importFactory(entryPath);
  } catch (error) {
    logger.error(error);
    throw new RenderError(
      `Could not import the entry module at ${entryPath}. Does it exist?`,
    );
  }

  if (!ssrApp) {
    throw new RenderError(
      `Provided entry at ${entryPath} does not export an ssrApp instance`,
    );
  }

  // isinstance check doesn't work here
  if (ssrApp?.constructor?.name !== "VueSSRApp") {
    throw new RenderError(
      `Provided ssrApp at ${entryPath} is not an instance of VueSSRApp`,
    );
  }

  return ssrApp as VueSSRApp;
}

export async function renderApp(
  ssrApp: VueSSRApp,
  props: RootProps,
): Promise<ReadableStream<any>> {
  const app = await ssrApp.createApp(props);
  return renderToWebStream(app);
}
