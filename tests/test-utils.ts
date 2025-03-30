import { Context } from "../src";

export function prepareBody(
  context: Context,
  inner: string,
  tag = "test-component",
) {
  document.body.innerHTML = `<${tag}><script type="application/json">${JSON.stringify({ context })}</script>${inner}</${tag}>`;
}
