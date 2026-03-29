FROM node:20-slim
RUN useradd -m -u 1000 appuser
WORKDIR /app
COPY package.json package-lock.json tsconfig.server.json ./
RUN npm ci
COPY server ./server
COPY src ./src
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js ./
RUN npx vite build && npx tsc --project tsconfig.server.json
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 7860
ENV PORT=7860
ENV NODE_ENV=production
CMD ["node", "dist-server/index.js"]
