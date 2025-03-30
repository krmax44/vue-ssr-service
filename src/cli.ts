#!/usr/bin/env node

import { Command } from "commander";
import { serve, type ServerType } from "@hono/node-server";
import { importApp, renderApp, Manifest } from "./render";
import createServer from "./server";
import { readStream } from "./utils";

export const program = new Command();
export let server: Bun.Server | ServerType;

program
  .name("vue-ssr-service")
  .description("Service to render Vue components to HTML")
  .argument("<manifest>", "Path to the server manifest.json file")
  .option("-p, --port <number>", "Port to run the server on", "3123")
  .option("-h, --host <string>", "Host to run the server on", "127.0.0.1")
  .option(
    "-s, --socket <string>",
    "Socket to run the server on (overrides host and port)",
    "",
  )
  .version("0.1.0")
  .action(async (manifestPath, { port, host, socket }) => {
    const manifest = await new Manifest(manifestPath).loadManifest();

    const app = createServer(manifest);

    const isBun = (process.versions as any).bun !== undefined;
    if (socket) {
      if (isBun) {
        server = Bun.serve({ fetch: app.fetch, unix: socket });
      } else {
        server = serve({
          fetch: app.fetch,
          port: socket,
        });
      }

      console.log(`Server running at unix://${socket}`);
    } else {
      if (isBun) {
        server = Bun.serve({ fetch: app.fetch, port, hostname: host });
      } else {
        server = serve({ fetch: app.fetch, port, hostname: host });
      }

      console.log(`Server running at http://${host}:${port}`);
    }
  });

program
  .command("render")
  .description("Renders to stdout and exits.")
  .argument("<entry>", "Entry point to the SSR app")
  .option("--context <string>", "JSON Context to pass to the app")
  .action(async (entry, options) => {
    const context = options.context ? JSON.parse(options.context) : {};

    const app = await importApp(entry);
    const stream = await renderApp(app, context);

    await readStream(stream, (data) => process.stdout.write(data));
  });

if (import.meta.main) program.parse();
