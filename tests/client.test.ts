import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { prepareBody } from "./test-utils";
import { VueSSRApp } from "../src";

const context = { msg: "Hello, world!" };

const { ssrApp: basicApp, component: basicComponent } = await import(
  "./fixtures/basic"
);
const { ssrApp: interactiveApp } = await import("./fixtures/interactive");

beforeEach(() => {
  // Reset the DOM before each test
  basicApp.app?.unmount();
  document.body.innerHTML = "";
});

describe("SSR Client Tests", () => {
  it("renders basic app correctly", async () => {
    expect.assertions(1);

    prepareBody(context, "<div>Hello, world!</div>");

    await basicApp.mount("test-component");

    expect(basicApp.app?._instance?.isMounted).toBe(true);
  });

  it("warns about missing props", async () => {
    expect.assertions(1);

    prepareBody({}, "<div>Hello, world!</div>");
    const spy = vi.spyOn(console, "warn");

    await basicApp.mount("test-component");

    expect(spy.mock.lastCall?.[0]).toContain(
      "[Vue warn]: Missing required prop",
    );

    await nextTick();
    spy.mockRestore();
  });

  it("detects hydration mismatches", async () => {
    expect.assertions(1);

    prepareBody(context, "<div>Bar</div>");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await basicApp.mount("test-component");

    expect(errorSpy).toHaveBeenCalledWith(
      "Hydration completed but contains mismatches.",
    );

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("handles interactive app updates", async () => {
    expect.assertions(1);

    document.body.innerHTML = `<test-component><button>0</button></test-component>`;

    await interactiveApp.mount("test-component");

    const button = document.querySelector("button");
    button?.click();

    await nextTick();

    expect(button?.textContent).toBe("1");
  });

  it("allows configuring the app", async () => {
    expect.assertions(1);
    prepareBody(context, "<div>Hello, world!</div>");

    const configureApp = vi.fn((app) => {
      app.config.globalProperties.$customProperty = "test";
    });
    const ssrApp = new VueSSRApp(basicComponent, configureApp);

    const element = document.querySelector("test-component")!;

    await ssrApp.mount(element);

    expect(ssrApp.app?.config.globalProperties.$customProperty).toBe("test");
  });

  it("throws error when no element exists", async () => {
    expect.assertions(1);

    prepareBody(context, "<div>Hello, world!</div>");

    await expect(basicApp.mount("#non-existent")).rejects.toThrow(
      "No elements with selector",
    );
  });

  it("re-renders the app when forceClientRender is true", async () => {
    expect.assertions(2);

    document.body.innerHTML = `<test-component><script type="application/json">${JSON.stringify({ context, forceClientRender: true })}</script></test-component>`;

    await basicApp.mount("test-component");

    expect(basicApp.app?._instance?.isMounted).toBe(true);
    expect(document.querySelector("test-component")?.innerHTML).toBe(
      "<div>Hello, world!</div>",
    );
  });
});
