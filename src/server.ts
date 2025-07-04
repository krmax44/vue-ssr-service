import { Hono } from "hono";
import { serve, type ServerType } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { Manifest, renderApp } from "./render.js";
import { HTTPException } from "hono/http-exception";
import { RenderError, requestSchema } from "./utils.js";
import { logger } from "./logger.js";

export function createServer(manifest: Manifest) {
  const app = new Hono();

  app.post("/render", zValidator("json", requestSchema), async (c) => {
    const { entryName, props } = c.req.valid("json");

    try {
      const ssrApp = manifest.getEntryPath(entryName);
      if (!ssrApp) {
        throw new RenderError("Entry not found in manifest");
      }

      const stream = await renderApp(ssrApp, props);

      logger.debug(`Rendered ${entryName}`);

      return c.newResponse(stream, 200, {
        "Content-Type": "text/html",
      });
    } catch (error) {
      const isRenderError = error instanceof RenderError;
      const code = isRenderError ? 400 : 500;
      const message = isRenderError
        ? error.message
        : "Could not render component";

      if (!isRenderError) {
        logger.error(error);
      }

      throw new HTTPException(code, { message });
    }
  });

  return app;
}

type Server = Bun.Server | ServerType;
interface ServerOptions {
  port?: number;
  host?: string;
  socket?: string;
}

export async function startServer(
  manifestPath: string,
  options: ServerOptions = {},
): Promise<Server | void> {
  let server: Server;
  let manifest: Manifest;

  try {
    manifest = await new Manifest(manifestPath).loadManifest();
  } catch (error) {
    return logger.error(error);
  }

  const app = createServer(manifest);

  const { port = 3123, host = "localhost", socket } = options;

  const isBun = (process.versions as any).bun !== undefined;
  if (socket) {
    if (isBun) {
      server = Bun.serve({ fetch: app.fetch, unix: socket });
    } else {
      server = serve({
        fetch: app.fetch,
        port: socket as any,
      });
    }

    logger.info(`Server running at unix://${socket}`);
  } else {
    if (isBun) {
      server = Bun.serve({ fetch: app.fetch, port, hostname: host });
    } else {
      server = serve({ fetch: app.fetch, port, hostname: host });
    }

    logger.info(`Server running at http://${host}:${port}`);
  }

  return server;
}
