FROM node:20-slim
WORKDIR /app

# 安装 Python3 和 pip
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip3 install openpyxl requests dashscope --break-system-packages

# 复制 Python 分析脚本
COPY scripts/skisight_analysis /app/skisight_analysis

# 复制数据导入脚本和种子数据文件
COPY scripts/import-sessions.py /app/scripts/
COPY scripts/auto-seed.py /app/scripts/
COPY scripts/seed-data/ /app/scripts/seed-data/

# 复制 package.json 并安装 Node 依赖
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci

# 复制服务端源代码
COPY server/ ./server/
COPY tsconfig.json ./
# 复制前端构建产物
COPY dist ./dist

# 复制 sql-wasm.wasm
COPY dist-server-bundle/sql-wasm.wasm ./dist-server-bundle/

RUN mkdir -p /tmp/data
ENV NODE_ENV=production

# 启动服务（用 tsx 直接运行 TypeScript）
CMD ["npx", "tsx", "server/index.ts"]
