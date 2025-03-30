import { describe, it, expect } from "vitest";
import path from "node:path";
import { renderApp, importApp } from "../src/render";
import { readableStreamToString } from "../src/utils";

const context = { msg: "Hello, world!" };

describe("SSR Render Tests", () => {
  it("renders basic app correctly", async () => {
    expect.assertions(1);

    const entryPath = path.join(__dirname, "fixtures/basic.ts");
    const ssrApp = await importApp(entryPath);
    const stream = await renderApp(ssrApp, context);

    const result = await readableStreamToString(stream);

    expect(result).toMatch(`<div>Hello, world!</div>`);
  });

  it("throws error when file does not exist", async () => {
    const entryPath = path.join(__dirname, "fixtures/does-not-exist.ts");

    await expect(() => importApp(entryPath)).rejects.toThrow(
      "Could not import the entry module",
    );
  });

  it("throws error when no export is provided", async () => {
    const entryPath = path.join(__dirname, "fixtures/empty.ts");

    await expect(() => importApp(entryPath)).rejects.toThrow(
      "does not export an ssrApp instance",
    );
  });

  it("throws error when `ssrApp` is not a class instance", async () => {
    const entryPath = path.join(__dirname, "fixtures/not-an-app.ts");

    await expect(() => importApp(entryPath)).rejects.toThrow(
      "is not an instance of VueSSRApp",
    );
  });
});
