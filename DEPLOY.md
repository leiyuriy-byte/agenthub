# AgentHub 部署指南

> **项目状态**: ✅ 开发完成，生产部署就绪  
> **最后更新**: 2026-04-11

---

## 快速部署（推荐）

### 一行命令完成生产部署

```bash
# 在服务器上以 root 权限运行：
curl -fsSL https://your-repo/deploy.sh | bash -s -- \
  --domain yourdomain.com \
  --email your@email.com \
  --repo https://github.com/your-org/agenthub.git
```

---

## 目录

1. [前置要求](#前置要求)
2. [本地开发](#本地开发)
3. [Docker 部署](#docker-部署)
4. [生产环境部署](#生产环境部署)
5. [生产环境 Nginx + SSL](#生产环境-nginx--ssl)
6. [环境变量](#环境变量)
7. [数据库管理](#数据库管理)
8. [故障排除](#故障排除)
9. [扩展部署](#扩展部署)

---

## 前置要求

| 依赖 | 版本 | 用途 |
|------|------|------|
| Docker | 20.10+ | 容器化部署 |
| Docker Compose | 2.0+ | 服务编排 |
| Ubuntu 24.04 | LTS | 推荐操作系统 |

---

## 本地开发

```bash
# 克隆代码
git clone https://github.com/your-org/agenthub.git
cd agenthub

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入必要的值

# 启动开发服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

访问：
- Web: http://localhost:3000
- API: http://localhost:3001
- API 文档: http://localhost:3001/docs

---

## Docker 部署

### 开发环境

```bash
# 启动所有服务
make dev

# 或直接使用 docker-compose
docker-compose up -d
```

### 生产构建

```bash
# 方式一：使用 Makefile（推荐）
make build          # 无缓存构建
make build-dev      # 使用缓存构建

# 方式二：直接使用 docker-compose
docker-compose build --no-cache
docker-compose up -d
```

---

## 生产环境部署

### 方式一：使用部署脚本（推荐）

```bash
# 在服务器上以 root 运行
wget -q https://your-repo/agenthub/deploy.sh && chmod +x deploy.sh

# 执行部署
./deploy.sh \
  --domain agenthub.com \
  --email admin@agenthub.com \
  --repo https://github.com/your-org/agenthub.git
```

部署脚本会自动：
1. 安装 Docker 和 Docker Compose
2. 克隆/更新代码
3. 创建生产环境变量文件
4. 构建并启动容器
5. 配置 Nginx + Let's Encrypt SSL
6. 设置防火墙 (UFW)
7. 配置 Systemd 服务实现开机自启

### 方式二：手动部署

```bash
# 1. 准备代码目录
sudo mkdir -p /opt/agenthub
sudo git clone https://github.com/your-org/agenthub.git /opt/agenthub
cd /opt/agenthub

# 2. 配置环境变量
sudo cp .env.production.example /opt/agenthub/.env
sudo nano /opt/agenthub/.env   # 编辑填入实际值

# 3. 构建并启动
sudo docker-compose build --no-cache
sudo docker-compose up -d

# 4. 配置 Nginx（参考下一节）
```

### 方式三：Systemd 管理

```bash
# 安装 Systemd 服务
sudo cp deploy.sh /opt/agenthub/   # deploy.sh 包含 systemd 配置
sudo systemctl daemon-reload
sudo systemctl enable agenthub
sudo systemctl start agenthub

# 管理命令
sudo systemctl status agenthub
sudo systemctl restart agenthub
sudo journalctl -u agenthub -f
```

---

## 生产环境 Nginx + SSL

如果使用外部 Nginx（非容器内），配置 `/etc/nginx/sites-available/agenthub`：

```nginx
# HTTP -> HTTPS 重定向
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

# HTTPS 代理到 Docker 容器
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书（通过 Let's Encrypt 自动管理）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # WebSocket 支持
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Web 静态文件
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

获取 SSL 证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
# 自动续期已配置
```

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `JWT_SECRET` | ✅ | - | JWT 密钥（至少 32 字符） |
| `NODE_ENV` | | `production` | 运行环境 |
| `PORT` | | `3001` | API 端口 |
| `DATABASE_URL` | | `libsql:file:/app/data/agenthub.db` | 数据库路径 |
| `ALLOWED_ORIGINS` | | `*` | 允许的跨域来源（生产应设为域名） |
| `GITHUB_CLIENT_ID` | | - | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | | - | GitHub OAuth App Client Secret |
| `GOOGLE_CLIENT_ID` | | - | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | | - | Google OAuth Client Secret |
| `SMTP_HOST` | | - | SMTP 服务器 |
| `SMTP_PORT` | | `587` | SMTP 端口 |
| `SMTP_USER` | | - | SMTP 用户名 |
| `SMTP_PASSWORD` | | - | SMTP 密码 |
| `SMTP_FROM` | | `noreply@localhost` | 发件人地址 |
| `NEXT_PUBLIC_API_URL` | | `http://localhost:3001` | 前端构建时 API 地址 |
| `NEXT_PUBLIC_APP_URL` | | `http://localhost:3000` | 前端构建时应用地址 |

### 生成安全的 JWT Secret

```bash
openssl rand -base64 48 | tr -d '/+=' | head -c 64
```

---

## 数据库管理

### 备份

```bash
# 使用 Makefile
make db-backup

# 手动备份
mkdir -p ./backups
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T api sh -c "tar -czf /tmp/backup_$DATE.tar.gz -C /app data"
docker-compose cp api:/tmp/backup_$DATE.tar.gz ./backups/agenthub_$DATE.tar.gz
docker-compose exec -T api rm /tmp/backup_$DATE.tar.gz
```

### 恢复

```bash
# 使用 Makefile
make db-restore FILE=agenthub_20240101_120000.tar.gz

# 手动恢复（⚠️ 会覆盖当前数据）
docker-compose cp ./backups/your-backup.tar.gz api:/tmp/restore.tar.gz
docker-compose exec -T api sh -c "rm -rf /app/data && mkdir -p /app/data && tar -xzf /tmp/restore.tar.gz -C /app"
docker-compose exec -T api rm /tmp/restore.tar.gz
docker-compose restart api
```

### 迁移

```bash
# 运行迁移
make migrate

# 或手动
docker-compose exec api sh -c "cd /app && pnpm --filter @agenthub/api db:migrate"
```

### 初始化数据（Seeding）

```bash
make seed

# 或手动
docker-compose exec api sh -c "cd /app && pnpm --filter @agenthub/api db:seed"
```

---

## 故障排除

### API 无法启动

```bash
# 查看日志
docker-compose logs api

# 常见问题：
# 1. 端口被占用
ss -tlnp | grep 3001

# 2. 数据库文件权限
chown -R 1001:1001 ./data

# 3. JWT_SECRET 未设置
grep JWT_SECRET .env
```

### Web 无法访问

```bash
# 查看日志
docker-compose logs web

# 检查 Nginx 配置（容器内）
docker-compose exec web nginx -t

# 检查端口
ss -tlnp | grep 3000
```

### 数据库损坏

```bash
# ⚠️ 这会清除所有数据！
docker-compose down
rm -rf ./data
docker-compose up -d
# 重新运行迁移和种子
make migrate
make seed
```

### 构建失败

```bash
# 清理并重新构建
docker-compose down
docker system prune -af --volumes
docker-compose build --no-cache
docker-compose up -d
```

### 查看资源使用

```bash
docker stats
```

---

## 扩展部署

### Docker Swarm

```bash
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml agenthub
```

### Kubernetes

```bash
# 需要创建 K8s 配置文件
kubectl apply -f k8s/
```

### 监控（Loki + Prometheus + Grafana）

```bash
# 启动监控栈
docker-compose -f docker-compose.monitoring.yml up -d

# 访问
# Grafana: http://localhost:3002
# Prometheus: http://localhost:3003
```

---

## 安全建议

1. ✅ 修改默认 `JWT_SECRET`
2. ✅ 启用 HTTPS（Let's Encrypt）
3. ✅ 限制 `ALLOWED_ORIGINS` 到你的域名
4. ✅ 定期备份数据库
5. ✅ 配置防火墙（仅开放 80/443）
6. ✅ 启用 Docker 日志轮转（已配置 max-size 50m）
7. ✅ 定期更新镜像版本

---

## 常用命令速查

```bash
# 启动/停止
make dev          # 开发环境启动
make prod         # 生产环境部署
make stop         # 停止服务

# 日志
make logs         # 所有日志
make logs-api     # API 日志
make logs-web     # Web 日志

# 维护
make restart      # 重启服务
make db-backup    # 备份数据库
make health       # 健康检查

# 清理
make clean        # 删除所有容器和卷（⚠️ 清除数据）
```
