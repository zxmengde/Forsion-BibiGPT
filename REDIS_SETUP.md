# 本地Redis配置说明

本项目已从Upstash迁移到本地Redis。以下是配置和使用说明。

## 环境变量配置

在 `.env` 文件中配置以下变量：

```env
# Local Redis configuration
REDIS_HOST=localhost      # 本地开发使用 localhost，Docker使用 redis
REDIS_PORT=6379           # Redis默认端口
REDIS_PASSWORD=           # 如果Redis设置了密码，填写密码
REDIS_DB=0                # Redis数据库编号，默认0
```

## 本地开发

### 方式1：使用Docker Compose（推荐）

项目已配置好Docker Compose，直接启动即可：

```bash
docker compose up -d
```

这会自动启动Redis服务和应用服务。

### 方式2：本地安装Redis

1. **安装Redis**：
   - macOS: `brew install redis`
   - Ubuntu/Debian: `sudo apt-get install redis-server`
   - Windows: 下载Redis for Windows或使用WSL

2. **启动Redis**：
   ```bash
   redis-server
   ```

3. **配置环境变量**：
   在 `.env` 文件中设置：
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

4. **启动应用**：
   ```bash
   npm run dev
   ```

## Docker部署

如果使用Docker Compose，Redis服务会自动配置：

- Redis服务名：`redis`
- 端口：`6379`
- 数据持久化：使用Docker volume `redis-data`

应用服务会自动连接到Redis服务。

## 功能说明

本地Redis提供以下功能：

1. **速率限制**：限制用户每日使用次数
   - 免费用户（按IP）：5次/天
   - 登录用户：5次/天
   - 使用自己API key的用户：10次/天

2. **缓存**：缓存视频摘要结果，避免重复调用OpenAI API
   - 缓存时间：24小时
   - 相同视频的请求会直接返回缓存结果

## 故障排除

### Redis连接失败

1. 检查Redis是否运行：
   ```bash
   redis-cli ping
   ```
   应该返回 `PONG`

2. 检查环境变量是否正确配置

3. 检查防火墙是否阻止了6379端口

### Docker中Redis连接失败

确保在Docker Compose中：
- Redis服务名正确（`redis`）
- 应用服务有 `depends_on: redis` 配置
- 环境变量 `REDIS_HOST=redis`

## 从Upstash迁移

如果你之前使用Upstash，现在可以：

1. 删除 `.env` 中的Upstash配置（已注释）
2. 添加本地Redis配置
3. 启动本地Redis或使用Docker Compose

所有功能保持不变，只是数据存储从云端迁移到本地。

