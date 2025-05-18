import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { createServer } from "vite";
import { ssrPlugin } from "../src";
import { beforeEach } from "node:test";

const port = 7454;
const url = `http://localhost:${port}/__vue-ssr`;

const request = (body: any) => {
  // workaround for happy-dom fetch cors error in node.js
  window.location.href = url;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

describe("Vite Dev Server", () => {
  let server: any;

  beforeEach(() => {
    // workaround for happy-dom fetch cors error in node.js
    window.location.href = url;
  });

  beforeAll(async () => {
    server = await createServer({
      root: resolve(__dirname, "fixtures"),
      plugins: [ssrPlugin()],
      build: {
        rollupOptions: {
          input: {
            testComponent: resolve(__dirname, "fixtures", "basic.ts"),
          },
        },
      },
    });

    await server.listen(port);
  });

  afterAll(async () => {
    await server.close();
  });

  it("handles valid requests", async () => {
    const res1 = await request({
      entryName: "basic",
      context: { msg: "Hello, world!" },
    });

    expect(res1.status).toBe(200);
    expect(await res1.text()).toBe("<div>Hello, world!</div>");

    const res2 = await request({
      entryName: "testComponent",
      context: { msg: "Hello, world!" },
    });

    expect(res2.status).toBe(200);
    expect(await res2.text()).toBe("<div>Hello, world!</div>");
  });

  it("handles invalid requests", async () => {
    console.log("w", window.location.href);
    const res3 = await fetch(url, {
      method: "GET",
    });
    expect(res3.status).toBe(405);

    const res4 = await request({});
    expect(res4.status).toBe(400);

    const res5 = await request({
      entryName: "nonExistent",
      context: {},
    });
    expect(res5.status).toBe(400);
  });
});
