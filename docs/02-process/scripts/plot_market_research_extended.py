from __future__ import annotations

import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parents[1] / ".matplotlib-cache"))

import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
MARKET_DIR = ROOT / "data" / "market-research"
OUT_DIR = ROOT / "document" / "latex" / "cit-template" / "figures-png"


def configure_fonts() -> None:
    plt.rcParams["font.sans-serif"] = [
        "PingFang SC",
        "Arial Unicode MS",
        "Heiti TC",
        "SimHei",
        "DejaVu Sans",
    ]
    plt.rcParams["axes.unicode_minus"] = False
    plt.rcParams["figure.dpi"] = 140
    plt.rcParams["savefig.dpi"] = 220


def plot_file_conversion() -> None:
    size = pd.read_csv(MARKET_DIR / "file-conversion-market-size.csv")
    formats = pd.read_csv(MARKET_DIR / "file-conversion-format-share.csv")

    fig, axes = plt.subplots(1, 2, figsize=(12.2, 5.2), gridspec_kw={"width_ratios": [1.05, 1.2]})
    fig.patch.set_facecolor("#ffffff")

    # Left: Market Size - Area Chart (Line + Filled Area)
    ax = axes[0]
    years_str = size["year"].astype(str)
    values = size["market_size_usd_billion"]
    
    # Plot line & markers
    ax.plot(years_str, values, color="#2563eb", linewidth=2.5, marker="o", markersize=8, label="市场规模")
    # Fill area under the line
    ax.fill_between(years_str, values, color="#2563eb", alpha=0.12)
    
    ax.set_title("全球文件转换软件市场规模趋势", fontsize=15, pad=14, fontweight="bold")
    ax.set_ylabel("十亿美元")
    ax.set_ylim(0, 7.5)
    ax.grid(axis="y", linestyle="--", linewidth=0.8, alpha=0.28)
    ax.spines[["top", "right"]].set_visible(False)
    
    for x, y in zip(years_str, values):
        ax.text(
            x,
            y + 0.22,
            f"{y:.2f}B",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold",
            color="#1e3a8a"
        )
    ax.text(
        0.02,
        0.92,
        "2026-2034 CAGR: 8.00%",
        transform=ax.transAxes,
        fontsize=10,
        color="#344054",
        bbox={"facecolor": "#eef6ff", "edgecolor": "#b7d8ff", "boxstyle": "round,pad=0.35"},
    )

    # Right: Format Share - Donut Chart (环形图)
    ax = axes[1]
    format_labels = {
        "Video": "视频文件",
        "Image": "图像文件",
        "Document": "文档文件 (PDF/Office)",
        "Audio": "音频文件",
        "Others": "其他格式",
    }
    formats = formats.assign(format_cn=formats["format_type"].map(format_labels))
    
    # Sort for beautiful donut slices ordering
    formats_sorted = formats.sort_values("share_percent", ascending=False)
    labels = [f"{row['format_cn']} ({row['share_percent']:.1f}%)" for _, row in formats_sorted.iterrows()]
    shares = formats_sorted["share_percent"]
    colors = ["#2563eb", "#38bdf8", "#22c55e", "#a78bfa", "#9ca3af"]
    
    wedges, texts = ax.pie(
        shares,
        labels=labels,
        colors=colors,
        startangle=140,
        wedgeprops=dict(width=0.36, edgecolor="#ffffff", linewidth=2),
        textprops=dict(fontsize=10)
    )
    ax.set_title("文件转换需求格式类型分布", fontsize=15, pad=14, fontweight="bold")
    ax.axis("equal")

    fig.suptitle("多格式文件在线转换市场的规模与构成", fontsize=17, fontweight="bold", y=1.02)
    fig.text(
        0.5,
        0.01,
        "数据来源：DataIntelo File Converter Software Market 公开摘要。数据仅用于学术趋势分析说明。",
        ha="center",
        fontsize=9,
        color="#667085",
    )
    fig.tight_layout(rect=[0.02, 0.06, 0.98, 0.96])
    out_path = OUT_DIR / "fig03-file-conversion-market.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, bbox_inches="tight")
    print(f"Generated: {out_path}")
    plt.close(fig)


def plot_pdf_editing() -> None:
    size = pd.read_csv(MARKET_DIR / "pdf-editor-market-size.csv")
    features = pd.read_csv(MARKET_DIR / "pdf-competitor-feature-coverage.csv")

    fig = plt.figure(figsize=(12.2, 5.2))
    gs = fig.add_gridspec(1, 2, width_ratios=[1.0, 1.15])
    axes = [fig.add_subplot(gs[0, 0]), fig.add_subplot(gs[0, 1], polar=True)]
    fig.patch.set_facecolor("#ffffff")

    # Left: Market Size - warm growth curve, visually separated from fig03.
    ax = axes[0]
    years = size["year"].astype(str).tolist()
    values = size["market_size_usd_billion"].tolist()
    x_pos = list(range(len(years)))
    ax.plot(x_pos, values, color="#0f766e", linewidth=3.0, marker="o", markersize=9)
    ax.fill_between(x_pos, values, [0] * len(values), color="#14b8a6", alpha=0.16)
    ax.scatter(x_pos, values, s=[120, 150, 210], color=["#fb7185", "#f97316", "#0f766e"], zorder=3, edgecolor="#ffffff", linewidth=1.8)
    ax.set_title("全球 PDF 编辑软件市场规模趋势", fontsize=15, pad=14, fontweight="bold")
    ax.set_xticks(x_pos)
    ax.set_xticklabels(years)
    ax.set_ylabel("十亿美元")
    ax.set_ylim(0, 13.0)
    ax.grid(axis="y", linestyle="--", linewidth=0.8, alpha=0.28)
    ax.spines[["top", "right"]].set_visible(False)
    for x, y in zip(x_pos, values):
        ax.text(
            x,
            y + 0.28,
            f"{y:.2f}B",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold",
            color="#134e4a",
        )
    ax.text(
        0.02,
        0.92,
        "2026-2034 CAGR: 9.80%",
        transform=ax.transAxes,
        fontsize=10,
        color="#344054",
        bbox={"facecolor": "#fff7ed", "edgecolor": "#fed7aa", "boxstyle": "round,pad=0.35"},
    )

    # Right: Feature Coverage - radar chart for a clearly different visual rhythm.
    ax = axes[1]
    features_sorted = features.sort_values("percent_share", ascending=False)
    labels = features_sorted["feature"].tolist()
    values = (features_sorted["percent_share"] / 100.0).tolist()
    angles = [n / float(len(labels)) * 2 * 3.141592653589793 for n in range(len(labels))]
    values_closed = values + values[:1]
    angles_closed = angles + angles[:1]
    ax.plot(angles_closed, values_closed, color="#e11d48", linewidth=2.5)
    ax.fill(angles_closed, values_closed, color="#fb7185", alpha=0.18)
    ax.scatter(angles, values, s=80, color="#f97316", edgecolor="#ffffff", linewidth=1.5, zorder=4)
    ax.set_theta_offset(3.141592653589793 / 2)
    ax.set_theta_direction(-1)
    ax.set_xticks(angles)
    ax.set_xticklabels(labels, fontsize=10, fontweight="bold")
    ax.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_yticklabels(["20%", "40%", "60%", "80%", "100%"], fontsize=8, color="#64748b")
    ax.set_ylim(0, 1.05)
    ax.grid(color="#cbd5e1", linewidth=0.8, alpha=0.75)
    ax.spines["polar"].set_color("#cbd5e1")
    ax.set_title("主流在线 PDF 工具核心功能覆盖对比", fontsize=15, pad=14, fontweight="bold")
    for angle, value, count in zip(angles, values, features_sorted["competitor_count"]):
        ax.text(angle, min(value + 0.10, 1.08), f"{int(count)}/5", ha="center", va="center", fontsize=9, color="#7f1d1d", fontweight="bold")

    fig.suptitle("全球 PDF 编辑软件市场规模与在线核心工具需求特征", fontsize=17, fontweight="bold", y=1.02)
    fig.text(
        0.5,
        0.01,
        "数据来源：DataIntelo PDF Editor Market 及主流在线工具（Adobe/Smallpdf/iLovePDF/PDF24/PDFescape）横向调研。",
        ha="center",
        fontsize=9,
        color="#667085",
    )
    fig.tight_layout(rect=[0.02, 0.06, 0.98, 0.96])
    out_path = OUT_DIR / "fig04-pdf-editing-demand.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, bbox_inches="tight")
    print(f"Generated: {out_path}")
    plt.close(fig)


def main() -> None:
    configure_fonts()
    plot_file_conversion()
    plot_pdf_editing()


if __name__ == "__main__":
    main()
