# AgentHub 部署指南

## 概述

AgentHub 支持 Docker 容器化部署，包含多阶段构建：
- **API 服务**：Fastify + TypeScript API 服务器
- **Web 服务**：Next.js 静态导出 + Nginx 反向代理

## 快速部署

### 前提条件

- Docker 20.10+
- Docker Compose 2.0+
- 域名（可选，用于生产环境）

### 1. 克隆代码

```bash
git clone https://github.com/your-org/agenthub.git
cd agenthub
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# 必需
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters

# 可选
DATABASE_URL=libsql:file:/app/data/agenthub.db
PORT=3001
ALLOWED_ORIGINS=https://your-domain.com
```

### 3. 构建并启动

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 4. 验证部署

- Web: http://localhost:3000
- API: http://localhost:3001
- API 文档: http://localhost:3001/docs
- 健康检查: http://localhost:3001/health

## 生产环境部署

### 1. 配置 Nginx 反向代理（可选）

如果使用外部 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Web 静态文件
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. 配置 HTTPS（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

### 3. 配置防火墙

```bash
# 开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 4. 使用 Systemd 管理服务

创建 `/etc/systemd/system/agenthub.service`：

```ini
[Unit]
Description=AgentHub Docker Compose
Requires=docker-compose.service
After=network-online.target docker-compose.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/agenthub
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable agenthub
sudo systemctl start agenthub
sudo systemctl status agenthub
```

## Docker 命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f api
docker-compose logs -f web

# 进入容器
docker-compose exec api sh
docker-compose exec web sh

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

## 数据管理

### 备份数据库

```bash
# 备份
docker-compose exec api tar -czf /tmp/backup.tar.gz /app/data

# 复制备份到主机
docker-compose cp api:/tmp/backup.tar.gz ./backup.tar.gz
```

### 恢复数据库

```bash
# 复制备份到容器
docker-compose cp ./backup.tar.gz api:/tmp/backup.tar.gz

# 恢复
docker-compose exec api sh -c "cd /app && tar -xzf /tmp/backup.tar.gz"
```

## 环境变量参考

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | API 端口 | `3001` |
| `DATABASE_URL` | 数据库路径 | `libsql:file:/app/data/agenthub.db` |
| `JWT_SECRET` | JWT 密钥 | （必需） |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |
| `ALLOWED_ORIGINS` | 允许的跨域来源 | `*` |
| `NEXT_PUBLIC_API_URL` | API 地址（前端用） | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_URL` | 应用地址（前端用） | `http://localhost:3000` |

## 故障排除

### API 无法启动

```bash
# 检查日志
docker-compose logs api

# 常见问题：
# 1. 端口被占用
netstat -tlnp | grep 3001

# 2. 权限问题
chown -R 1001:1001 ./data
```

### Web 无法访问

```bash
# 检查日志
docker-compose logs web

# 检查 Nginx 配置
docker-compose exec web nginx -t
```

### 数据库问题

```bash
# 检查数据库文件
docker-compose exec api ls -la /app/data

# 重建数据库（谨慎！）
docker-compose down
rm -rf ./data
docker-compose up -d
```

## 扩展部署

### 使用 Docker Swarm

```bash
docker stack deploy -c docker-compose.yml agenthub
```

### 使用 Kubernetes

需要创建 Kubernetes 配置文件：
- `k8s-api-deployment.yaml`
- `k8s-web-deployment.yaml`
- `k8s-service.yaml`
- `k8s-ingress.yaml`

## 监控

### 日志聚合

使用 ELK Stack 或 Loki：

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
```

## 安全建议

1. **修改默认 JWT_SECRET**
2. **启用 HTTPS**
3. **限制 ALLOWED_ORIGINS**
4. **定期备份数据库**
5. **使用只读数据库用户**（如使用 PostgreSQL）
6. **配置 Rate Limiting**
7. **启用防火墙**
