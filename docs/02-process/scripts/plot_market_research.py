from __future__ import annotations

import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parents[1] / ".matplotlib-cache"))

import matplotlib.pyplot as plt
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
MARKET_DIR = ROOT / "data" / "market-research"
OUT = ROOT / "document" / "latex" / "cit-template" / "figures-png" / "fig02-cloud-storage-market-demand.png"


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


def main() -> None:
    configure_fonts()
    size = pd.read_csv(MARKET_DIR / "cloud-storage-market-size.csv")
    region = pd.read_csv(MARKET_DIR / "cloud-storage-region-share-2025.csv")

    region_labels = {
        "North America": "北美",
        "Europe": "欧洲",
        "Asia Pacific": "亚太",
        "Middle East and Africa": "中东和非洲",
        "Latin America": "拉丁美洲",
    }
    region = region.assign(region_cn=region["region"].map(region_labels))

    fig, axes = plt.subplots(1, 2, figsize=(12.2, 5.2), gridspec_kw={"width_ratios": [1.05, 1.2]})
    fig.patch.set_facecolor("#ffffff")

    ax = axes[0]
    bars = ax.bar(
        size["year"].astype(str),
        size["market_size_usd_billion"],
        color=["#2f80ed", "#27ae60", "#f2994a"],
        width=0.56,
    )
    ax.plot(size["year"].astype(str), size["market_size_usd_billion"], color="#1f2937", linewidth=1.8, marker="o")
    ax.set_title("全球云存储市场规模趋势", fontsize=15, pad=14, fontweight="bold")
    ax.set_ylabel("十亿美元")
    ax.set_ylim(0, 880)
    ax.grid(axis="y", linestyle="--", linewidth=0.8, alpha=0.28)
    ax.spines[["top", "right"]].set_visible(False)
    for bar in bars:
        height = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            height + 18,
            f"{height:.2f}",
            ha="center",
            va="bottom",
            fontsize=10,
        )
    ax.text(
        0.02,
        0.92,
        "2026-2034 CAGR: 19.30%",
        transform=ax.transAxes,
        fontsize=10,
        color="#344054",
        bbox={"facecolor": "#eef6ff", "edgecolor": "#b7d8ff", "boxstyle": "round,pad=0.35"},
    )

    ax = axes[1]
    region_sorted = region.sort_values("share_percent", ascending=True)
    colors = ["#9ca3af", "#a78bfa", "#22c55e", "#38bdf8", "#2563eb"]
    ax.barh(region_sorted["region_cn"], region_sorted["share_percent"], color=colors, height=0.56)
    ax.set_title("2025 年区域市场份额", fontsize=15, pad=14, fontweight="bold")
    ax.set_xlabel("市场份额（%）")
    ax.set_xlim(0, 52)
    ax.grid(axis="x", linestyle="--", linewidth=0.8, alpha=0.28)
    ax.spines[["top", "right"]].set_visible(False)
    for y, share, amount in zip(
        region_sorted["region_cn"],
        region_sorted["share_percent"],
        region_sorted["market_size_usd_billion"],
    ):
        ax.text(share + 0.8, y, f"{share:.1f}% / {amount:.2f}B", va="center", fontsize=10)

    fig.suptitle("云端资料管理需求的市场背景", fontsize=17, fontweight="bold", y=1.02)
    fig.text(
        0.5,
        0.01,
        "数据来源：Fortune Business Insights 公开摘要，访问日期 2026-06-23。公开市场数据仅用于趋势背景说明。",
        ha="center",
        fontsize=9,
        color="#667085",
    )
    fig.tight_layout(rect=[0.02, 0.06, 0.98, 0.96])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, bbox_inches="tight")
    print(OUT)


if __name__ == "__main__":
    main()
