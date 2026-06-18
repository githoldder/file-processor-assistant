-- ==========================================
-- 实验七：电商数据分析 - MySQL 持久化建表脚本
-- ==========================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS culcloud_data CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE culcloud_data;

-- ==========================================
-- 1. 回头客/转化率预测结果表 (由 Spark MLlib 写入)
-- ==========================================
DROP TABLE IF EXISTS ml_user_predictions;
CREATE TABLE ml_user_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL COMMENT '用户唯一ID',
    actual_label INT COMMENT '真实转化标签 (1=转化, 0=未转化)',
    predicted_label INT COMMENT '模型预测标签 (1=转化, 0=未转化)',
    prediction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '预测执行时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户回头客转化率预测结果表';

-- ==========================================
-- 2. 电商基础统计聚合表 (模拟从 Hive/Spark 计算后导入)
-- ==========================================
DROP TABLE IF EXISTS sales_monthly_summary;
CREATE TABLE sales_monthly_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_month VARCHAR(7) NOT NULL COMMENT '统计月份 (YYYY-MM)',
    total_revenue DECIMAL(15, 2) DEFAULT 0.00 COMMENT '月度总营收',
    total_orders INT DEFAULT 0 COMMENT '月度总订单数',
    avg_order_value DECIMAL(10, 2) DEFAULT 0.00 COMMENT '客单价',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录写入时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='电商月度销售聚合报表';

-- 插入几条模拟的聚合数据供前端大屏/MySQL截图展示
INSERT INTO sales_monthly_summary (report_month, total_revenue, total_orders, avg_order_value) VALUES 
('2024-01', 1450000.50, 480, 3020.83),
('2024-02', 1620300.00, 520, 3115.96),
('2024-03', 1580000.75, 510, 3098.04);

-- 验证查询语句（报告截图用）
-- SELECT * FROM ml_user_predictions LIMIT 10;
-- SELECT * FROM sales_monthly_summary ORDER BY report_month DESC;
