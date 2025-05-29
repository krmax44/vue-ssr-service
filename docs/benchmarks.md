# Benchmarks

Performed with [`oha`](https://github.com/hatoo/oha) on an Apple M1 Pro, 16 GB laptop, using Bun.

## Hello World example

Using the component from the [basic fixture](../tests/fixtures/basic.ts). This should represent a best-case scenario.

Server setup:

```sh
bun src/cli.ts tests/fixtures/manifest.json
```

Benchmark setup:

```sh
oha "http://localhost:3123/render" -n 100000 -c 50 \
  -d '{"entryName": "testComponent", "props": {"msg": "foo" } }' \
  -T application/json -m POST
```

> Success rate: 100.00%
> Total: 3.1596 secs
> Slowest: 0.0373 secs
> Fastest: 0.0001 secs
> Average: 0.0016 secs
> Requests/sec: 31649.8130
>
> Total data: 2.57 MiB
> Size/request: 27 B
> Size/sec: 834.52 KiB
