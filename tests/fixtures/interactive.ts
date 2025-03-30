import { VueSSRApp } from "../../src";

const component = {
  data() {
    return {
      count: 0,
    };
  },
  template: `<button @click="count++">{{ count }}</button>`,
};

export const ssrApp = new VueSSRApp(component);
