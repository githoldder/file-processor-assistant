"""
Analytics Service — 课程设计数据分析核心

读取 PySpark 管线预处理结果 JSON，提供前端 API 数据。
数据源：data/spark-output/ 下的 ub_*.json 和 sales_*.json
"""

import os
import json
import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    """课程设计数据分析服务（用户行为 + 销售数据）"""

    def __init__(self, spark_output_dir):
        self.spark_output_dir = spark_output_dir

    def _read_json(self, name):
        """读取 PySpark 预处理结果 JSON"""
        path = os.path.join(self.spark_output_dir, f"{name}.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        logger.warning(f"spark output not found: {path}")
        return None

    # ==================== 用户行为数据 API ====================

    def get_ub_overview(self):
        """用户行为总览"""
        return self._read_json("ub_overview")

    def get_ub_event_types(self):
        """事件类型分布（柱状图）"""
        return self._read_json("ub_event_type_distribution")

    def get_ub_daily_trend(self):
        """按日访问趋势（折线图）"""
        return self._read_json("ub_daily_trend")

    def get_ub_time_period(self):
        """时段分布（饼图）"""
        return self._read_json("ub_time_period_distribution")

    def get_ub_device(self):
        """设备分布（饼图）"""
        return self._read_json("ub_device_distribution")

    def get_ub_top_pages(self):
        """页面排名（柱状图 Top 20）"""
        return self._read_json("ub_top_pages")

    def get_ub_heatmap(self):
        """时段×星期热力图"""
        return self._read_json("ub_heatmap_data")

    def get_ub_referrer(self):
        """来源渠道分布"""
        return self._read_json("ub_referrer_distribution")

    def get_ub_conversion(self):
        """新老用户转化率"""
        return self._read_json("ub_conversion_by_new_user")

    def get_ub_duration_buckets(self):
        """时长分桶分布"""
        return self._read_json("ub_duration_bucket_distribution")

    def get_ub_sample(self):
        """清洗后数据样例"""
        return self._read_json("ub_sample_cleaned")

    # ==================== 销售数据 API ====================

    def get_sales_overview(self):
        """销售总览"""
        return self._read_json("sales_overview")

    def get_sales_category(self):
        """品类销售额（柱状图）"""
        return self._read_json("sales_category_sales")

    def get_sales_monthly_trend(self):
        """月度销售趋势（折线图）"""
        return self._read_json("sales_monthly_trend")

    def get_sales_payment(self):
        """支付方式分布（饼图）"""
        return self._read_json("sales_payment_distribution")

    def get_sales_order_status(self):
        """订单状态分布（饼图）"""
        return self._read_json("sales_order_status_distribution")

    def get_sales_regional(self):
        """地域销售分布（柱状图）"""
        return self._read_json("sales_regional_sales")

    def get_sales_price_buckets(self):
        """价格区间分布"""
        return self._read_json("sales_price_bucket_distribution")

    def get_sales_gender(self):
        """客户性别分布"""
        return self._read_json("sales_gender_distribution")

    def get_sales_top_products(self):
        """热销商品 Top 10"""
        return self._read_json("sales_top_products")

    def get_sales_quarterly(self):
        """季度销售汇总"""
        return self._read_json("sales_quarterly_sales")

    def get_sales_sample(self):
        """清洗后数据样例"""
        return self._read_json("sales_sample_cleaned")

    def get_data_quality_report(self):
        """数据质量报告"""
        return self._read_json("data_quality_report")

    # ==================== 组合视图 API ====================

    def get_dashboard(self, dataset="ub"):
        """一键获取看板所需全部数据"""
        if dataset == "ub":
            return {
                "overview": self.get_ub_overview(),
                "event_types": self.get_ub_event_types(),
                "daily_trend": self.get_ub_daily_trend(),
                "time_periods": self.get_ub_time_period(),
                "devices": self.get_ub_device(),
                "top_pages": self.get_ub_top_pages(),
                "referrers": self.get_ub_referrer(),
                "conversion": self.get_ub_conversion(),
                "duration_buckets": self.get_ub_duration_buckets(),
                "heatmap": self.get_ub_heatmap(),
                "sample": self.get_ub_sample(),
            }
        elif dataset == "sales":
            return {
                "overview": self.get_sales_overview(),
                "categories": self.get_sales_category(),
                "monthly_trend": self.get_sales_monthly_trend(),
                "payments": self.get_sales_payment(),
                "order_status": self.get_sales_order_status(),
                "regions": self.get_sales_regional(),
                "price_buckets": self.get_sales_price_buckets(),
                "gender": self.get_sales_gender(),
                "top_products": self.get_sales_top_products(),
                "quarterly": self.get_sales_quarterly(),
                "sample": self.get_sales_sample(),
            }
        return None
