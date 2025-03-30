FROM oven/bun:1-alpine AS build

WORKDIR /usr/src/app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine AS release

WORKDIR /usr/src/app
COPY --from=build /usr/src/app/node_modules ./node_modules

COPY package.json package.json
COPY ./src ./src

ENV NODE_ENV=production

CMD ["bun", "start", "--port", "3123"]

EXPOSE 3123