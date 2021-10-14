# syntax=docker/dockerfile:experimental
FROM node:16 as base

RUN curl -f https://get.pnpm.io/v6.js | node - add --global pnpm

WORKDIR /app/

COPY . .

RUN pnpm install --frozen-lockfile --silent && \ 
  pnpm lint:fix && \
  pnpm build


FROM node:16-alpine as main

WORKDIR /app

EXPOSE 3000
COPY --from=base /app/dist .

CMD [ "node", "server.js" ]