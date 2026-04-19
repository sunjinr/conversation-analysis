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

# 复制 package.json 并安装 Node 依赖（express、sql.js 等 external 模块）
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 复制前端和后端 bundle
COPY dist-server-bundle/server.mjs dist-server-bundle/sql-wasm.wasm ./dist-server-bundle/
COPY dist ./dist
RUN mkdir -p /tmp/data
ENV NODE_ENV=production

# 启动服务（数据导入在 server 启动时自动执行）
CMD ["node", "dist-server-bundle/server.mjs"]
