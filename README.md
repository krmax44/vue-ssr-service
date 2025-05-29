# Vue SSR service

A fast microservice to render server-side render Vue components. It's designed for use with non-JavaScript web servers, such as Django, Ruby on Rails etc. Works great with Vite.

## Getting started with Vite

Let's assume we have a basic, slow feeling Vue SPA app, with a root component like so.

```vue
<script lang="ts" setup>
import { ref, onMounted } from "vue";

const name = ref("");

onMounted(() => {
  // get the name of the current user via api
  name.value = await fetchNameFromServer();
});
</script>

<template>
  <p>Hello, {{ name }}</p>
</template>
```

First, we'll have to adapt the Vite configuration a little:

```ts
import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { ssrPlugin } from "vue-ssr-service/vite";

export default defineConfig({
  // the ssrPlugin is only used during development
  plugins: [vue(), ssrPlugin()],
  build: {
    manifest: "manifest.json", // required to load the built assets in production
    rollupOptions: {
      input: {
        // heads-up: Vite will no longer scan the index.html for entries
        // make sure to include all your entrypoints here
        myApp: resolve("./myApp.ts"),
      },
    },
  },
  environments: {
    client: {
      build: {
        outDir: resolve("dist", "client"),
      },
    },
    ssr: {
      build: {
        outDir: resolve("dist", "server"),
        ssr: true,
      },
    },
  },
});
```

Also, we'll have to adapt the main entry file. Right now, it probably looks something like this:

```ts
import { createApp } from "vue";
import MyApp from "./MyApp.vue";

const app = createApp(MyApp);
app.use(/* i.e. pinia */);
app.mount("#app");
```

We'll change it as follows:

```ts
import { VueSSRApp } from "vue-ssr-service/entry";
import MyApp from "./components/MyApp.vue";

// vue-ssr-service will grab this export to render it!
export const ssrApp = new VueSSRApp(MyApp, (app) => {
  app.use(/* ... */);
});

ssrApp.mount("#app");
```

Let's update the component. It will receive the name directly as a prop from the server. No more need for an API call, the app loads instantly!

```vue
<script lang="ts" setup>
defineProps<{ name: string }>();
</script>

<template>
  <p>Hello, {{ $props.name }}</p>
</template>
```

Now, let's adjust the `build` command, and then build the app using `npm run build`:

```diff
// package.json
{
  "scripts": {
-   "build": "vite build"
+   "build": "npm run build:client && npm run build:server",
+   "build:client": "vite build",
+   "build:server": "vite build --ssr"
  }
}
```

Which will create a folder structure like this:

```
dist
│
└───client
│   │   manifest.json
│   └───assets
│       │   myApp.js
│       │   myApp.css
│
└───server
│   │   manifest.json
│   │   myApp.js
```

Now, start the `vue-ssr-service` server by pointing it to the server's manifest file:

```sh
$ vue-ssr-service ./path/to/dist/server/manifest.json

Server running at http://127.0.0.1:3123
```

Let's see if it works:

```sh
$ curl "localhost:3123/render" \
    -d '{"entryName": "myApp", "props": { "name":"friend" } }' \
    -X POST \
    -H "Content-Type: application/json"

<p>Hello, friend!</p>
```

Next, take a look at integrating it into your backend.

## Integrating into a backend

First, your backend needs to be able to serve the assets built by Vite, i.e. include the scripts and styles in the HTML templates. During development, it's also nice to have Vite's Hot Module Replacement script included. There possibly are tools for your web framework already out there to help you with this, for example [django-vite](https://github.com/MrBin99/django-vite).

Next, the backend views need to be connected to `vue-ssr-service`, i.e. request the server-side rendered app with the corresponding props. Your view template might roughly look like this:

```html
<script src="./path/to/myapp.js"></script>
<div id="app"></div>

<!-- myapp.js will mount to #app -->
```

It will have to be adapted in two ways:

1. A `<script type="application/json">` element containing JSON serialized data, including props, needs to be added as the first child of the root element. If there are no props to pass, it may be omitted.
2. The backend requests the SSR-rendered app from `vue-ssr-service` and inserts the resulting HTML right after.

> [!IMPORTANT]
> Make sure not to add any whitespace, as it may interfere with hydration.

> [!TIP]
> For better performance, cache the rendered HTML – being aware of the implications.

```html
<script src="./path/to/myapp.js"></script>

<div id="app">
  <!-- whitespace added for readability - all whitespace needs to be removed to hydrate properly though! -->
  <script type="application/json">
    { "props": { "name": "friend" } }
  </script>
  <p>Hello, friend!</p>
</div>

<!-- myapp.js will hydrate #app -->
```

### Error Handling

Should `vue-ssr-service` not be able to render the app, `forceClientRender` in the JSON props should be set to `true`. The client will then mount the app as if it was not in SSR mode.

> [!WARNING]
> Client re-renders may come at a performance penalty. Make sure to carefully monitor for any SSR errors.

```html
<script src="./path/to/myapp.js"></script>

<div id="app">
  <script type="application/json">
    { "props": { "name": "friend" }, "forceClientRender": true }
  </script>
  <!-- oops, ssr failed! -->
</div>
```

## Installation

With Docker:

```sh
docker build -t vue-ssr-service .
docker run -t vue-ssr-service -p 3000:3000
```

With Bun or Node.js:

```sh
git clone https://github.com/krmax44/vue-ssr-service

bun install
bun start

# or:
npm install
npm start
```

## Usage

### CLI

```
Usage: vue-ssr-service [options] [command] <manifest>

Service to render Vue components to HTML

Arguments:
  manifest                  Path to the server manifest.json file

Options:
  -p, --port <number>       Port to run the server on (default: "3123")
  -h, --host <string>       Host to run the server on (default: "127.0.0.1")
  -s, --socket <string>     Socket to run the server on (overrides host and port) (default: "")
  -V, --version             output the version number
  --help                    display help for command

Commands:
  render [options] <entry>  Renders to stdout and exits.
```

### API

**POST `/render`**:

Request body (JSON):

- `entryName`: Either name or filename of the entry (`src`/`file` key in `manifest.json`)
- `props`: Data which will be passed as props to the root component

Response:

- The rendered component as HTML.
