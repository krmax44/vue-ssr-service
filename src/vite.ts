import type { Plugin } from "vite";
import { readStream, requestSchema } from "./utils";
import { importApp, renderApp } from "./render";

let inputs: Record<string, string> = {};

export const ssrPlugin = (): Plugin => ({
  name: "vue-ssr-server-plugin",

  config(config) {
    const _inputs = config.build?.rollupOptions?.input;
    if (!Array.isArray(_inputs) && typeof _inputs === "object") {
      inputs = _inputs;
    }
  },

  configureServer(server) {
    server.middlewares.use("/__vue-ssr", function handle(req, res) {
      if (req.method !== "POST") {
        res.writeHead(405);
        res.end("Invalid request method");
      }

      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        let jsonData;

        try {
          jsonData = JSON.parse(body);
        } catch (error) {
          res.statusCode = 400;
          return res.end("Invalid JSON");
        }

        const { success, error, data } = requestSchema.safeParse(jsonData);
        if (!success) {
          res.statusCode = 400;
          return res.end(JSON.stringify(error));
        }

        let { entryName, props } = data;

        if (inputs[entryName]) {
          entryName = inputs[entryName];
        }

        const importFactory = async (entry: string) =>
          (await server.ssrLoadModule(entry))?.ssrApp;

        let ssrApp;

        try {
          ssrApp = await importApp(entryName, importFactory);
        } catch (e) {
          res.statusCode = 400;
          return res.end((e as Error).message);
        }

        const stream = await renderApp(ssrApp, props);

        res.writeHead(200, { "Content-Type": "text/html" });

        await readStream(stream, (data) => {
          res.write(data);
        });
        res.end();
      });
    });
  },
});
