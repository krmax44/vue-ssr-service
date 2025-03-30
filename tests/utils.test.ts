import { describe, it, expect } from "vitest";
import { Manifest } from "../src/render";

describe("Manifest Tests", () => {
  it("throws error when file does not exist", async () => {
    const manifestPath = "/path/to/nonexistent/manifest.json";
    const manifest = new Manifest(manifestPath);

    await expect(() => manifest.loadManifest()).rejects.toThrow(
      "Could not load JSON manifest file at",
    );
  });
});
