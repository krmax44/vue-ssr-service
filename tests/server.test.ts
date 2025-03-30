import { describe, it, expect } from "vitest";
import path from "node:path";
import createServer from "../src/server";
import { Manifest } from "../src/render";

describe("Server Tests", () => {
  it("handles valid and invalid requests correctly", async () => {
    const manifestPath = path.resolve(__dirname, "fixtures/manifest.json");
    const manifest = await new Manifest(manifestPath).loadManifest();

    const server = createServer(manifest);

    const request = (body: any) =>
      server.request("/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

    // Test valid request with "basic.ts"
    const res1 = await request({
      entryName: "basic.ts",
      context: {
        msg: "Hello, World!",
      },
    });

    expect(res1.status).toBe(200);
    expect(await res1.text()).toBe("<div>Hello, World!</div>");

    // Test valid request with "testComponent"
    const res2 = await request({
      entryName: "testComponent",
      context: {
        msg: "Hello, World!",
      },
    });

    expect(res2.status).toBe(200);
    expect(await res2.text()).toBe("<div>Hello, World!</div>");

    // Test invalid request with non-existent entry
    const res3 = await request({
      entryName: "nonExistent.ts",
      context: {},
    });

    expect(res3.status).toBe(400);
  });
});
