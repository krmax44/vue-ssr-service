import { VueSSRApp } from "../../src";

export const component = {
  props: {
    msg: {
      type: String,
      required: true,
    },
  },
  template: `<div>{{ $props.msg }}</div>`,
};

export const ssrApp = new VueSSRApp(component);
