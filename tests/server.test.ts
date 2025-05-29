import { describe, it, expect } from "vitest";
import path, { resolve } from "node:path";
import fs from "node:fs/promises";
import net from "node:net";
import { createServer, startServer } from "../src/server";
import { Manifest } from "../src/render";

describe("endpoints", () => {
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
      props: {
        msg: "Hello, World!",
      },
    });

    expect(res1.status).toBe(200);
    expect(await res1.text()).toBe("<div>Hello, World!</div>");

    // Test valid request with "testComponent"
    const res2 = await request({
      entryName: "testComponent",
      props: {
        msg: "Hello, World!",
      },
    });

    expect(res2.status).toBe(200);
    expect(await res2.text()).toBe("<div>Hello, World!</div>");

    // Test invalid request with non-existent entry
    const res3 = await request({
      entryName: "nonExistent.ts",
      props: {},
    });

    expect(res3.status).toBe(400);
  });
});

describe("real server", () => {
  it("listens to the correct port", async () => {
    expect.assertions(1);

    const manifestPath = resolve(__dirname, "fixtures", "manifest.json");
    const port = 8342;

    const server = await startServer(manifestPath, { port });

    const res = await fetch("http://localhost:8342/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entryName: "basic.ts",
        props: { msg: "Hello, world!" },
      }),
    });

    expect(res.status).toBe(200);
    const s = server as any;
    s.close?.();
    s.stop?.();
  });

  it("listens to a socket", async () => {
    expect.assertions(1);

    const manifestPath = resolve(__dirname, "fixtures", "manifest.json");
    const socket = resolve(__dirname, "socket.sock");

    const server = await startServer(manifestPath, { socket });

    await new Promise<void>((resolve, reject) => {
      const client = net.createConnection({ path: socket }, () => {
        const body = JSON.stringify({
          entryName: "testComponent",
          props: { msg: "Hello, world!" },
        });

        client.write(
          "POST /render HTTP/1.1\r\n" +
            "Host: localhost\r\n" +
            "Content-Type: application/json\r\n" +
            `Content-Length: ${body.length}\r\n` +
            "\r\n" +
            body,
        );
      });

      client.on("data", (data) => {
        const res = data.toString();
        const statusLine = res.split("\r\n")[0];
        const statusCode = parseInt(statusLine.split(" ")[1], 10);
        expect(statusCode).toBe(200);
        client.end();

        const s = server as any;
        s.close?.();
        s.stop?.();

        resolve();
      });

      client.on("error", (err) => {
        console.error("Error:", err);
        const s = server as any;
        s.close?.();
        s.stop?.();

        reject();
      });
    }).finally(() => {
      fs.unlink(socket).catch(() => {});
    });
  });
});
