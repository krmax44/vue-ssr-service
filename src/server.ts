import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { Manifest, renderApp } from "./render";
import { HTTPException } from "hono/http-exception";
import { RenderError, requestSchema } from "./utils";

export default function createServer(manifest: Manifest) {
  const app = new Hono();

  app.post("/render", zValidator("json", requestSchema), async (c) => {
    const { entryName, context } = c.req.valid("json");

    try {
      const ssrApp = manifest.getEntryPath(entryName);
      if (!ssrApp) {
        throw new RenderError("Entry not found in manifest");
      }

      const stream = await renderApp(ssrApp, context);

      return c.newResponse(stream, 200, {
        "Content-Type": "text/html",
      });
    } catch (error) {
      const code = error instanceof RenderError ? 400 : 500;

      throw new HTTPException(code, {
        message: (error as Error).message || "Could not render component",
      });
    }
  });

  return app;
}
