# QRent Scraper - Docker 部署指南

## ⚠️ 重要说明

- **RealEstate.com.au** 使用 **Kasada** 反爬虫保护
- 首次运行需要 **在本地手动完成人机验证**
- 验证后的 browser profile 需要 **上传到服务器**
- Docker 容器使用 **Xvfb 虚拟显示器**运行非 headless 浏览器
- 内存建议 **3GB+**

---

## 第一步：本地完成人机验证（首次必须）

### 1.1 在本地运行爬虫完成验证

```bash
cd packages/scraper

# 运行爬虫，手动完成 RealEstate 的人机验证
python run_scraper.py --scrapers realestate --universities UNSW --no-database --no-scoring --no-commute
```

当浏览器弹出时：
1. 等待 RealEstate 页面加载
2. 如果出现 CAPTCHA，**手动完成验证**
3. 验证成功后，爬虫会开始爬取
4. 完成后，browser profile 会保存在 `rea_profile/` 目录

### 1.2 验证 profile 已保存

```bash
ls -la rea_profile/
# 应该看到 Cookies, Local Storage 等文件
```

---

## 第二步：上传到服务器

### 2.1 创建部署目录结构

```bash
# 在本地执行
mkdir -p deploy_package/browser_profiles

# 复制必要文件
cp -r src deploy_package/
cp main.py run_scraper.py requirements.txt deploy_package/
cp Dockerfile docker-compose.yml entrypoint.sh deploy_package/
cp .env deploy_package/ 2>/dev/null || echo "No .env file"

# 复制 browser profiles（重要！）
cp -r rea_profile deploy_package/browser_profiles/rea
cp -r domain_profile deploy_package/browser_profiles/domain 2>/dev/null || mkdir -p deploy_package/browser_profiles/domain
```

### 2.2 上传到服务器

```bash
# 压缩
tar -czf qrent-scraper.tar.gz deploy_package

# 上传
scp qrent-scraper.tar.gz user@your-server:/path/to/

# 或直接 scp 目录
scp -r deploy_package user@your-server:/path/to/qrent-scraper
```

---

## 第三步：服务器部署

### 3.1 SSH 登录服务器

```bash
ssh user@your-server
cd /path/to/

# 解压
tar -xzf qrent-scraper.tar.gz
cd deploy_package
# 或者
cd qrent-scraper
```

### 3.2 安装 Docker（如果没有）

```bash
# Ubuntu 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker

# 安装 docker-compose
sudo apt-get install -y docker-compose-plugin
```

### 3.3 配置环境变量

```bash
cat > .env << 'EOF'
# 数据库 (可选)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=qrent

# API Keys (可选)
DASHSCOPE_API_KEY=your_dashscope_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
EOF
```

### 3.4 设置权限

```bash
chmod +x entrypoint.sh
sudo chown -R 1000:1000 browser_profiles output logs 2>/dev/null || true
mkdir -p output logs
```

### 3.5 构建并运行

```bash
# 构建镜像
docker-compose build

# 运行爬虫
docker-compose run --rm scraper python run_scraper.py \
  --scrapers domain realestate \
  --universities UNSW \
  --no-database
```

---

## 手动运行命令

```bash
# 完整爬取 UNSW + USYD (包含评分和通勤时间)
docker-compose run --rm scraper python main.py run \
  --universities UNSW USYD \
  --scrapers domain realestate

# 只爬取 Domain (不需要特殊验证)
docker-compose run --rm scraper python run_scraper.py \
  --scrapers domain \
  --universities UNSW \
  --no-database

# 只爬取 RealEstate
docker-compose run --rm scraper python run_scraper.py \
  --scrapers realestate \
  --universities UNSW \
  --no-database
```

---

## 配置说明

### 内存配置

默认限制 3GB 内存。如需调整，编辑 `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 4G  # 增加到 4GB
```

### 输出文件

- CSV 文件: `./output/`
- 日志文件: `./logs/`
- Browser Profile: `./browser_profiles/`

---

## 定时任务 (Cron)

每天凌晨 3 点自动运行:

```bash
# 编辑 crontab
crontab -e

# 添加以下行
0 3 * * * cd /path/to/qrent-scraper && docker-compose run --rm scraper python run_scraper.py --universities UNSW USYD --no-database >> logs/cron.log 2>&1
```

---

## 故障排除

### 1. RealEstate 被反爬虫拦截

```
原因: browser profile 没有正确上传，或者验证已过期

解决:
1. 在本地重新运行爬虫，手动完成验证
2. 重新上传 rea_profile/ 目录到服务器的 browser_profiles/rea/
3. 重新运行
```

### 2. 浏览器启动失败

```bash
# 增加共享内存
docker-compose run --rm --shm-size=2g scraper python run_scraper.py ...
```

### 3. 权限问题

```bash
sudo chown -R 1000:1000 output logs browser_profiles
```

### 4. 查看日志

```bash
# 容器日志
docker-compose logs scraper

# 爬虫日志
cat logs/scraper_*.log
```

### 5. 清理资源

```bash
# 停止并删除容器
docker-compose down

# 删除镜像重新构建
docker-compose down --rmi all
docker-compose build --no-cache
```

---

## 快速命令参考

| 命令 | 说明 |
|------|------|
| `docker-compose build` | 构建镜像 |
| `docker-compose run --rm scraper ...` | 运行爬虫 |
| `docker-compose logs` | 查看日志 |
| `docker-compose down` | 停止容器 |
| `docker-compose down --rmi all` | 删除镜像 |
