/*
 * ════════════════════════════════════════════════════════════════
 *  CulCloud Platform — PM2 Ecosystem Configuration
 *
 *  架构分层（PM2 + Docker Compose 混合治理）:
 *
 *   ┌── PM2 (应用层) ────────────────────────────────────┐
 *   │  • flask-analytics   :5050   数据分析 API          │
 *   │  • culcloud-frontend :5173   Vite 开发服务器        │
 *   │  特点: 本地 Python/Node 进程, 热重载, 频繁修改      │
 *   └─────────────────────────────────────────────────────┘
 *
 *   ┌── Docker Compose (基础设施层) ──────────────────────┐
 *   │  • redis       :6379   任务队列 / 缓存              │
 *   │  • minio       :9010   S3 对象存储 (S3 API)        │
 *   │  • gotenberg   :3000   文档格式转换服务             │
 *   │  • api         :8000   FastAPI 文件处理后端         │
 *   │  特点: 有状态, 资源隔离, 容器化部署                 │
 *   └─────────────────────────────────────────────────────┘
 *
 *  通信:
 *    前端 → FastAPI (8000): 文件上传/转换/管理等业务操作
 *    前端 → Flask (5050):   Analytics 大屏数据
 *    Flask → Redis/MinIO:  实时查询
 *    Flask → spark-output/: 离线分析结果
 *
 *  启动顺序:
 *    1. docker compose -f docker-compose.demo.yml up -d
 *    2. pm2 start ecosystem.config.js
 *    3. pm2 logs
 *
 *  注意:
 *    npm 必须用 /opt/homebrew/bin/npm 而不是 PATH 中的 npm
 *    （QClaw 的 npm 是 bash 脚本，PM2 无法 fork 解析）
 * ════════════════════════════════════════════════════════════════
 */

module.exports = {
  apps: [

    // ─── 数据分析 API (Flask) ───────────────────────────
    {
      name: 'flask-analytics',
      cwd: './flask-analytics',
      script: 'app.py',
      interpreter: 'python3',
      exec_mode: 'fork',
      instances: 1,
      watch: ['app.py', 'services'],
      autorestart: true,
      max_restarts: 10,
      time: true,
      env: {
        PORT: '5050',
        FLASK_DEBUG: '1',
        REDIS_URL: 'redis://localhost:6379/0',
        MINIO_ENDPOINT: 'localhost:9010',
        MINIO_ACCESS_KEY: 'admin',
        MINIO_SECRET_KEY: 'admin123',
        MINIO_BUCKET: 'culcloud-files',
        SPARK_OUTPUT_DIR: __dirname + '/data/spark-output',
      },
      error_file: '../logs/flask-analytics-error.log',
      out_file: '../logs/flask-analytics-out.log',
      merge_logs: true,
    },

    // ─── 前端 Vite 开发服务器 ──────────────────────────
    // 使用 node_modules/.bin/vite（Node.js 脚本），避免 PATH 解析问题
    {
      name: 'culcloud-frontend-dev',
      cwd: './file-cloud-frontend',
      script: './node_modules/.bin/vite',
      args: ['--host', '127.0.0.1', '--port', '5173'],
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      time: true,
      env: {
        NODE_ENV: 'development',
        VITE_API_BASE_URL: 'http://127.0.0.1:8000',
        VITE_ANALYTICS_API: 'http://127.0.0.1:5050',
      },
      error_file: '../logs/frontend-error.log',
      out_file: '../logs/frontend-out.log',
      merge_logs: true,
    },

    // ─── 前端生产构建（一次性任务）────────────────────
    {
      name: 'culcloud-frontend-build',
      cwd: './file-cloud-frontend',
      script: './node_modules/.bin/vite',
      args: ['build'],
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      autorestart: false,
      time: true,
      env: {
        NODE_ENV: 'production',
        VITE_API_BASE_URL: 'http://127.0.0.1:8000',
        VITE_ANALYTICS_API: 'http://127.0.0.1:5050',
      },
    },

    // ─── 前端生产预览 ─────────────────────────────────
    {
      name: 'culcloud-frontend-preview',
      cwd: './file-cloud-frontend',
      script: './node_modules/.bin/vite',
      args: ['preview', '--host', '127.0.0.1', '--port', '4173'],
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      autorestart: true,
      time: true,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '4173',
        VITE_API_BASE_URL: 'http://127.0.0.1:8000',
        VITE_ANALYTICS_API: 'http://127.0.0.1:5050',
      },
    },
  ],
};
