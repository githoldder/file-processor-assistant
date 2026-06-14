Figure 目录说明

本目录用于管理报告截图、接口测试输出和旧素材归档；LaTeX 正式引用的图片位于
docs/02-process/document/latex/分布式/figures。

screenshots-real
  真实终端、浏览器、服务面板截图。例如 PM2、Nacos、RabbitMQ、WebSocket、Newman CLI。

screenshots-generated
  报告级生成截图。当前包含微信小程序结算页、订单列表、订单详情，以及由真实
  Newman CLI 输出渲染得到的终端截图。

archive/fake-screenshots
  旧版 S01-S12 占位截图和失败截图归档，不再用于正式报告。

newman-cli-output.txt
  npx newman run tests/apifox-collection.json --reporters cli 的真实终端输出。
  生成脚本会读取该文件并渲染 S11-newman-cli-real.png。

pdf-pages
  如果需要把参考 PDF 页面渲染为图片或留存页图，放这里。

正式 LaTeX 图片目录规则：
1. figures-src/svg 保存可编辑 SVG 源文件。
2. figures 保存当前 LaTeX 引用的 PNG 图片。
3. figures-pdf 保存可替换 PNG 的 PDF 矢量图。
4. 未被正文引用且容易误导的旧图统一放入 figures-src/archive-noise。
