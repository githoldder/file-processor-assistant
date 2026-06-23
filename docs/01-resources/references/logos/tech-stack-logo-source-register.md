# 第二章技术栈 Logo 来源登记

访问日期: 2026-06-23

| 文件 | 技术 | 来源 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| logo-react.png | React | `/Users/caolei/Desktop/school-gtd-dashboard/docs/02-process/figure/logos/logo-react.png` | 本地复用 | 用户指定的既有项目素材 |
| logo-typescript.svg | TypeScript | `/Users/caolei/Desktop/school-gtd-dashboard/docs/02-process/figure/logos/logo-typescript.svg` | 本地复用 | 用户指定的既有项目素材 |
| logo-redis.svg | Redis | `/Users/caolei/Desktop/springboot-lgg/docs/02-process/document/latex/分布式/figures/logo-redis.svg` | 本地复用 | 用户指定的既有项目素材 |
| logo-minio.svg | MinIO | `/Users/caolei/Desktop/springboot-lgg/docs/02-process/document/latex/分布式/figures/logo-minio.svg` | 本地复用 | 用户指定的既有项目素材 |
| logo-fastapi.svg | FastAPI | `https://cdn.simpleicons.org/fastapi/009688` | 社区 SVG | Simple Icons CDN |
| logo-celery.svg | Celery | `https://cdn.simpleicons.org/celery/37814A` | 社区 SVG | Simple Icons CDN |
| logo-apache-spark.svg | Apache Spark | `https://cdn.simpleicons.org/apachespark/E25A1C` | 社区 SVG | Simple Icons CDN |
| logo-apache-hadoop.svg | Apache Hadoop | `https://cdn.simpleicons.org/apachehadoop/66CCFF` | 社区 SVG | Simple Icons CDN |
| logo-apache-echarts.svg | Apache ECharts | `https://cdn.simpleicons.org/apacheecharts/AA344D` | 社区 SVG | Simple Icons CDN |
| logo-vite.svg | Vite | `https://cdn.simpleicons.org/vite/646CFF` | 社区 SVG | Simple Icons CDN |
| logo-libreoffice.svg | LibreOffice | `https://cdn.simpleicons.org/libreoffice/18A303` | 社区 SVG | Simple Icons CDN |
| logo-pdfjs.svg | PDF.js | `https://commons.wikimedia.org/wiki/Special:FilePath/Pdf-js_logo.svg` | 公开 SVG | Wikimedia Commons 稳定文件入口 |
| logo-gotenberg.png | Gotenberg | `https://gotenberg.dev/img/logo.png` | 官方 PNG | 官网导航栏与页脚使用的官方图片资源 |
| logo-pm2.svg | PM2 | `/Users/caolei/Desktop/springboot-lgg/docs/02-process/document/latex/分布式/figures/logo-pm2.svg` | 本地复用 | 用户指定的既有项目素材 |
| logo-docker-compose.svg | Docker Compose | `https://cdn.simpleicons.org/docker/2496ED` | 社区 SVG | Docker Compose 使用 Docker 标识表示容器编排技术 |
| logo-html5-canvas.svg | HTML5 Canvas | `https://cdn.simpleicons.org/html5/E34F26` | 社区 SVG | Canvas API 归属于 HTML5 Web 技术体系 |
| logo-flask.svg | Flask | `https://cdn.simpleicons.org/flask/000000` | 社区 SVG | Simple Icons CDN |

处理规则:

- SVG 文件统一保留在 `figures/logos/`，并使用 `rsvg-convert` 转为 `figures/logos-pdf/` 下的 PDF。
- PNG 文件统一保留在 `figures/logos/`，并使用 Pillow 转为白底 PDF，避免 LaTeX 编译时透明背景或格式兼容问题。
- Gotenberg 官网未暴露同名 SVG，故使用官网 PNG，不手工仿制 SVG。
