# v1.0.1 更新日志

## 版本信息
- **版本号**: v1.0.1
- **发布日期**: 2026-03-12
- **项目**: 文件处理全能助手 (File Processing All-in-One Helper)

---

## 新增功能

### SVG 转换支持
- SVG → PDF 转换
- SVG → PNG 转换

---

## Bug修复

### 1. SVG转换失败
**问题**: SVG文件转换时提示"PIL.UnidentifiedImageError: cannot identify image file"

**原因**: 后端使用cairosvg进行SVG转换，但cairosvg需要系统级cairo库支持，Docker镜像中未安装

**解决方案**: 修改 `backend/app/services/converter.py`，将SVG转换改为使用Gotenberg服务

```python
# 修改前: 使用cairosvg
def svg_to_png(self, svg_data: bytes):
    return cairosvg.svg2png(bytestring=svg_data)

# 修改后: 使用Gotenberg
def svg_to_png(self, svg_data: bytes):
    pdf_data = self._gotenberg_convert(svg_data, "svg", "pdf")
    images = self.pdf_to_images(pdf_data, dpi=300, fmt="PNG")
    return images[0]
```

### 2. 转换卡在0%
**问题**: 点击开始转换后，浏览器一直显示转换进度0%

**原因**: API容器不稳定导致nginx超时

**解决方案**: 重启API容器确保服务正常运行

---

## 测试信息

### 测试文件位置
```
tests/e2e/
├── test_svg_e2e_simple.py      # 简化版API测试
├── test_svg_final.py            # 最终版浏览器E2E测试
├── test_svg_debug_browser.py   # 调试测试
├── test_svg_complete.py         # 完整测试
└── test_regression_integration.py # 回归测试
```

### 测试截图位置
```
test_screenshots/
├── svg_e2e/
├── svg_final/
├── svg_debug/
├── svg_debug2/
└── svg_complete/
```

### 已验证的转换功能 (v1.0.1)
| 转换类型 | 状态 | 测试 |
|----------|------|------|
| PDF → Word | ✅ | test_regression_integration.py |
| PDF → 图片 | ✅ | test_regression_integration.py |
| Word → PDF | ✅ | test_regression_integration.py |
| Excel → PDF | ✅ | test_regression_integration.py |
| PPTX → PDF | ✅ | test_regression_integration.py |
| Markdown → PDF | ✅ | test_regression_integration.py |
| SVG → PDF | ✅ | test_svg_final.py |
| SVG → PNG | ✅ | test_svg_final.py |

---

## 技术细节

### 后端修改
- `backend/app/services/converter.py`: SVG转换改用Gotenberg

### 测试工具
- **Playwright**: 浏览器自动化测试
- **Requests**: API测试

### 运行测试
```bash
# 激活虚拟环境
source .venv/bin/activate

# 运行SVG转换测试
python tests/e2e/test_svg_final.py

# 运行回归测试
python tests/e2e/test_regression_integration.py
```

---

## 已知问题

1. **API容器稳定性**: 需要确保API容器稳定运行，否则会出现504超时
2. **前端错误处理**: 转换失败时前端显示"转换中...0%"，需要优化用户体验

---

## 下一步计划

- [ ] 优化前端错误处理显示
- [ ] 添加更多文件格式支持
- [ ] 完善批量转换功能
- [ ] 增加单元测试覆盖率

---

## 版本历史

- **v1.0.0** (2026-03-11): 初始版本，包含核心转换功能
- **v1.0.1** (2026-03-12): 新增SVG转换支持，修复SVG转换bug
