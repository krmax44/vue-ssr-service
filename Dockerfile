FROM oven/bun:1-alpine AS build

WORKDIR /usr/src/app

VOLUME [ "/var/assets" ]

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production --ignore-scripts

FROM oven/bun:1-alpine AS release

WORKDIR /usr/src/app
COPY --from=build /usr/src/app/node_modules ./node_modules

COPY package.json package.json
COPY ./src ./src

ENV NODE_ENV=production

CMD ["bun", "src/cli.ts", "--port", "3123", "--host", "0.0.0.0", "/var/assets/manifest.json"]

EXPOSE 3123