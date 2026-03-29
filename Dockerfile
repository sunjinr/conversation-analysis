FROM node:20-slim
WORKDIR /app
COPY dist-server-bundle/server.mjs dist-server-bundle/sql-wasm.wasm ./dist-server-bundle/
COPY dist ./dist
RUN mkdir -p /tmp/data
ENV NODE_ENV=production
CMD ["node", "dist-server-bundle/server.mjs"]
