# Multi-stage: build client + server, serve via nginx + node
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm install

COPY shared ./shared
COPY server ./server
COPY client ./client
COPY tsconfig.base.json ./

RUN npm run build -w shared \
 && npm run build -w client \
 && npm run build -w server

FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache nginx supervisor

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf

ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
