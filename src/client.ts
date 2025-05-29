import { createSSRApp, type App, type Component } from "vue";
export type RootProps = Record<string, unknown>;

export class VueSSRApp {
  public app?: App<Element>;

  /**
   * Creates a new VueSSRApp instance.
   *
   * @param rootComponent - The root component of the app.
   * @param selector - The element or selector to mount the app to.
   * @param configureApp - Optional function to configure the app (e.g., adding plugins).
   * @throws Will throw an error if the selector is a string and no matching element is found.
   * @example
   * ```ts
   * import { VueSSRApp } from 'vue-ssr-service'
   * import HelloWorld from './components/HelloWorld.vue'
   *
   * export const ssrApp = new VueSSRApp(HelloWorld)
   * ssrApp.mount('#app')
   * ```
   */
  constructor(
    public rootComponent: Component,
    private configureApp?: (app: App<Element>) => void | Promise<void>,
  ) {}

  public async createApp(
    props: RootProps,
    factory = createSSRApp,
  ): Promise<App<Element>> {
    const app = factory(this.rootComponent, props);

    if (this.configureApp) {
      this.configureApp(app);
    }

    return app;
  }

  /**
   * Mounts the app to the provided element.
   * In SSR mode, it will do nothing.
   */
  public async mount(selector: Element | string): Promise<void> {
    if (!import.meta.env?.SSR) {
      let element;
      if (typeof selector === "string") {
        element = document.querySelector<Element>(selector);

        if (!element) {
          throw new Error(`No elements with selector ${selector} found`);
        }
      } else {
        element = selector;
      }

      const jsonElement = element.querySelector<HTMLScriptElement>(
        'script[type="application/json"]',
      );

      const json = jsonElement ? JSON.parse(jsonElement.innerHTML) : {};
      const props = json?.props || {};
      const forceClientRender = json?.forceClientRender || false;

      if (forceClientRender) {
        const { createApp } = await import("vue");
        this.app = await this.createApp(props, createApp);
      } else {
        this.app = await this.createApp(props);
      }

      jsonElement?.remove();

      this.app.mount(element);
    }
  }
}
