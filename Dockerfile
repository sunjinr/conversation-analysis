FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install tsx
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY .env.example ./.env.example
EXPOSE 7860
ENV PORT=7860
ENV NODE_ENV=production
CMD ["npx", "tsx", "server/index.ts"]
