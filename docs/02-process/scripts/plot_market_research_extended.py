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

    fig, axes = plt.subplots(1, 2, figsize=(12.2, 5.2), gridspec_kw={"width_ratios": [1.05, 1.2]})
    fig.patch.set_facecolor("#ffffff")

    # Left: Market Size - Bar Chart (with customized styling)
    ax = axes[0]
    bars = ax.bar(
        size["year"].astype(str),
        size["market_size_usd_billion"],
        color=["#4f46e5", "#10b981", "#f59e0b"],
        width=0.52,
        edgecolor="#374151",
        linewidth=0.8
    )
    ax.set_title("全球 PDF 编辑软件市场规模趋势", fontsize=15, pad=14, fontweight="bold")
    ax.set_ylabel("十亿美元")
    ax.set_ylim(0, 13.0)
    ax.grid(axis="y", linestyle="--", linewidth=0.8, alpha=0.28)
    ax.spines[["top", "right"]].set_visible(False)
    for bar in bars:
        height = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            height + 0.25,
            f"{height:.2f}B",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold"
        )
    ax.text(
        0.02,
        0.92,
        "2026-2034 CAGR: 9.80%",
        transform=ax.transAxes,
        fontsize=10,
        color="#344054",
        bbox={"facecolor": "#eef6ff", "edgecolor": "#b7d8ff", "boxstyle": "round,pad=0.35"},
    )

    # Right: Feature Coverage - Lollipop Chart (棒棒糖图)
    ax = axes[1]
    features_sorted = features.sort_values("competitor_count", ascending=True)
    y_pos = range(len(features_sorted))
    
    # Draw horizontal stems
    ax.hlines(
        y_pos,
        xmin=0,
        xmax=features_sorted["competitor_count"],
        colors="#93c5fd",
        linewidth=2.8
    )
    # Draw lollipop heads (markers)
    ax.plot(
        features_sorted["competitor_count"],
        y_pos,
        "o",
        color="#1d4ed8",
        markersize=10,
        markeredgecolor="#1e3a8a",
        markeredgewidth=1.2
    )
    
    ax.set_yticks(y_pos)
    ax.set_yticklabels(features_sorted["feature"], fontsize=11, fontweight="bold")
    ax.set_title("主流在线 PDF 工具核心功能覆盖对比", fontsize=15, pad=14, fontweight="bold")
    ax.set_xlabel("支持该功能的竞品数量（家/共5家调查对象）")
    ax.set_xlim(0, 5.8)
    ax.grid(axis="x", linestyle="--", linewidth=0.8, alpha=0.28)
    ax.spines[["top", "right"]].set_visible(False)
    
    for idx, (count, pct) in enumerate(zip(features_sorted["competitor_count"], features_sorted["percent_share"])):
        ax.text(
            count + 0.15,
            idx,
            f"{int(count)}家 ({pct:.0f}%)",
            va="center",
            fontsize=10,
            fontweight="bold",
            color="#1e293b"
        )

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
