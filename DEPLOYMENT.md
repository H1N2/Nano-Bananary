# Nano-Bananary 服务器部署文档

本文档详细介绍如何将 Nano-Bananary 项目部署到生产服务器。

## 系统要求

### 服务器环境
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Node.js**: 18.0+ (推荐 18.17.0 或更高版本)
- **内存**: 最少 1GB RAM (推荐 2GB+)
- **存储**: 最少 10GB 可用空间
- **网络**: 稳定的互联网连接

### 必需软件
- Node.js 和 npm
- Git
- PM2 (进程管理器，可选但推荐)
- Nginx (反向代理，可选)

## 部署步骤

### 1. 服务器准备

#### 更新系统包
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### 安装 Node.js
```bash
# 使用 NodeSource 仓库安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 安装 PM2 (推荐)
```bash
npm install -g pm2
```

### 2. 代码部署

#### 克隆项目
```bash
# 创建项目目录
sudo mkdir -p /var/www
cd /var/www

# 克隆代码
sudo git clone https://github.com/your-username/Nano-Bananary.git
sudo chown -R $USER:$USER /var/www/Nano-Bananary
cd Nano-Bananary
```

#### 安装依赖
```bash
npm install
```

### 3. 环境配置

#### 创建生产环境配置
```bash
# 复制环境变量文件
cp .env.example .env

# 编辑环境变量
nano .env
```

#### 环境变量配置示例
```env
# Gemini API 配置
VITE_API_KEY=your_gemini_api_key_here

# 代理设置 (如果需要)
VITE_PROXY_HOST=your_proxy_host
VITE_PROXY_PORT=your_proxy_port
VITE_PROXY_USERNAME=your_proxy_username
VITE_PROXY_PASSWORD=your_proxy_password

# 生产环境配置
NODE_ENV=production
PORT=3000
```

### 4. 构建项目

```bash
# 构建生产版本
npm run build
```

### 5. 部署方式选择

#### 方式一: 使用 PM2 (推荐)

创建 PM2 配置文件:
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'nano-bananary',
    script: 'npx',
    args: 'serve -s dist -l 3000',
    cwd: '/var/www/Nano-Bananary',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

启动应用:
```bash
# 安装 serve (静态文件服务器)
npm install -g serve

# 使用 PM2 启动
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

#### 方式二: 使用 Docker (可选)

创建 Dockerfile:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
```

构建和运行:
```bash
# 构建镜像
docker build -t nano-bananary .

# 运行容器
docker run -d -p 3000:3000 --name nano-bananary-app nano-bananary
```

### 6. Nginx 反向代理配置 (推荐)

#### 安装 Nginx
```bash
sudo apt install nginx -y
```

#### 创建站点配置
```bash
sudo nano /etc/nginx/sites-available/nano-bananary
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 启用站点
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/nano-bananary /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 7. SSL 证书配置 (推荐)

#### 使用 Let's Encrypt
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 监控和维护

### PM2 常用命令
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs nano-bananary

# 重启应用
pm2 restart nano-bananary

# 停止应用
pm2 stop nano-bananary

# 删除应用
pm2 delete nano-bananary
```

### 日志管理
```bash
# PM2 日志轮转
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 系统监控
```bash
# 安装系统监控工具
sudo apt install htop iotop -y

# 监控系统资源
htop

# 监控磁盘 I/O
sudo iotop
```

## 更新部署

### 自动化更新脚本
创建更新脚本 `update.sh`:
```bash
#!/bin/bash
set -e

echo "开始更新 Nano-Bananary..."

# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 构建项目
npm run build

# 重启应用
pm2 restart nano-bananary

echo "更新完成！"
```

```bash
# 赋予执行权限
chmod +x update.sh

# 执行更新
./update.sh
```

## 故障排除

### 常见问题

1. **应用无法启动**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :3000
   
   # 检查 PM2 日志
   pm2 logs nano-bananary
   ```

2. **API 调用失败**
   - 检查 `.env` 文件中的 API Key 配置
   - 确认网络连接正常
   - 检查代理设置

3. **静态文件加载失败**
   ```bash
   # 检查构建文件
   ls -la dist/
   
   # 检查 Nginx 配置
   sudo nginx -t
   ```

4. **内存不足**
   ```bash
   # 检查内存使用
   free -h
   
   # 重启应用释放内存
   pm2 restart nano-bananary
   ```

### 性能优化

1. **启用 Gzip 压缩**
   在 Nginx 配置中添加:
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   ```

2. **配置缓存策略**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

## 安全建议

1. **防火墙配置**
   ```bash
   # 启用 UFW
   sudo ufw enable
   
   # 允许必要端口
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   ```

2. **定期更新**
   ```bash
   # 定期更新系统
   sudo apt update && sudo apt upgrade -y
   
   # 更新 Node.js 依赖
   npm audit fix
   ```

3. **备份策略**
   ```bash
   # 创建备份脚本
   #!/bin/bash
   tar -czf /backup/nano-bananary-$(date +%Y%m%d).tar.gz /var/www/Nano-Bananary
   ```

## 支持

如果在部署过程中遇到问题，请:

1. 检查本文档的故障排除部分
2. 查看项目的 GitHub Issues
3. 联系技术支持

---

**注意**: 请确保在生产环境中妥善保管 API Key 等敏感信息，不要将其提交到版本控制系统中。