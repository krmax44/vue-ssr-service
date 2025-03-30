// test the render command
import { describe, it, expect, vi } from "vitest";
import { resolve } from "node:path";
import { program, server } from "../src/cli";
import net from "node:net";

describe("CLI Tests", () => {
  it("listens to the correct port", async () => {
    expect.assertions(1);

    const port = "8342";

    await program.parseAsync(
      [resolve(__dirname, "fixtures", "manifest.json"), "--port", port],
      {
        from: "user",
      },
    );

    const res = await fetch("http://localhost:8342/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entryName: "basic.ts",
        context: { msg: "Hello, world!" },
      }),
    });

    expect(res.status).toBe(200);
    const s = server as any;
    s.close?.();
    s.stop?.();
  });

  it("listens to a socket", async () => {
    expect.assertions(1);

    const socket = resolve(__dirname, "socket.sock");

    await program.parseAsync(
      [resolve(__dirname, "fixtures", "manifest.json"), "--socket", socket],
      {
        from: "user",
      },
    );

    await new Promise<void>((r) => {
      const client = net.createConnection({ path: socket }, () => {
        console.log("CONNECTED");

        const body = JSON.stringify({
          entryName: "testComponent",
          context: { msg: "Hello, world!" },
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

        r();
      });
    });
  });

  it("render command works", async () => {
    const spy = vi.spyOn(process.stdout, "write");

    await program.parseAsync(
      [
        "render",
        resolve(__dirname, "fixtures", "basic.ts"),
        "--context",
        JSON.stringify({ msg: "Hello, world!" }),
      ],
      {
        from: "user",
      },
    );

    expect(spy).toHaveBeenCalledWith("<div>Hello, world!</div>");
    spy.mockRestore();
  });
});
