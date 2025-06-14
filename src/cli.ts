import { Command } from "commander";
import { importApp, renderApp } from "./render.js";
import { startServer } from "./server.js";
import { readStream } from "./utils.js";
import { logger } from "./logger.js";

export const program = new Command();

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
  .option("--log-level <string>", "Log level", "info")
  .version("0.1.0")
  .action(async (manifestPath, { port, host, socket, logLevel }) => {
    logger.level = logLevel;
    await startServer(manifestPath, { port, host, socket });
  });

program
  .command("render")
  .description("Renders to stdout and exits.")
  .argument("<entry>", "Entry point to the SSR app")
  .option("--props <string>", "Root props (JSON) to pass to the app")
  .option("--log-level <string>", "Log level", "info")
  .action(async (entry, options) => {
    logger.level = options.logLevel;
    const props = options.props ? JSON.parse(options.props) : {};

    const app = await importApp(entry);
    const stream = await renderApp(app, props);

    await readStream(stream, (data) => process.stdout.write(data));
  });

program.parse();
