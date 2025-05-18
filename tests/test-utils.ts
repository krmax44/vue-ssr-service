import { type RootProps } from "../src";

export function prepareBody(
  props: RootProps,
  inner: string,
  tag = "test-component",
) {
  document.body.innerHTML = `<${tag}><script type="application/json">${JSON.stringify({ props })}</script>${inner}</${tag}>`;
}
