FROM node:20-slim
WORKDIR /app

# 安装 Python3 和 pip
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip3 install openpyxl requests dashscope --break-system-packages

# 复制 Python 分析脚本
COPY scripts/skisight_analysis /app/skisight_analysis

# 复制前端和后端 bundle
COPY dist-server-bundle/server.mjs dist-server-bundle/sql-wasm.wasm ./dist-server-bundle/
COPY dist ./dist
RUN mkdir -p /tmp/data
ENV NODE_ENV=production
CMD ["node", "dist-server-bundle/server.mjs"]
