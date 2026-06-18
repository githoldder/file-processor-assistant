import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, when, rand
from pyspark.ml.feature import VectorAssembler, StringIndexer, StandardScaler
from pyspark.ml.classification import RandomForestClassifier
from pyspark.ml.evaluation import BinaryClassificationEvaluator, MulticlassClassificationEvaluator

# ==========================================
# 实验七：电商用户回头客预测与 MySQL 持久化
# ==========================================

def main():
    # 1. 初始化 SparkSession
    spark = SparkSession.builder \
        .appName("Exp7_Ecommerce_ML_Prediction") \
        .master("local[*]") \
        .config("spark.driver.memory", "2g") \
        .config("spark.jars.packages", "mysql:mysql-connector-java:8.0.33") \
        .getOrCreate()
        
    spark.sparkContext.setLogLevel("ERROR")
    print("="*50)
    print("🚀 [Step 1] Spark Session 已启动...")
    
    # 2. 生成/加载模拟电商用户行为特征数据
    # 为了实验独立运行，这里生成一万条测试数据。在真实报告中可以将其替换为读取 HDFS 的 Hive 表。
    print("📊 [Step 2] 加载并预处理电商用户特征数据...")
    df = spark.range(0, 10000).select(
        col("id").alias("user_id"),
        (rand() * 1000).cast("int").alias("total_duration_sec"),
        (rand() * 50).cast("int").alias("page_views"),
        (rand() * 10).cast("int").alias("add_to_cart_count"),
        when(rand() > 0.6, "mobile").otherwise("desktop").alias("device_type"),
        when(rand() > 0.8, 1).otherwise(0).alias("is_new_user"),
        # label: 设定一些规则让它具有可预测性
        when((col("page_views") > 25) & (col("add_to_cart_count") > 3), 1)
        .otherwise(when(rand() > 0.85, 1).otherwise(0)).alias("is_converted")
    )
    
    print("--- 样本数据展示 (前 5 行) ---")
    df.show(5)
    
    # 3. 特征工程 (Feature Engineering)
    print("🛠️ [Step 3] 执行特征工程 (StringIndexer, VectorAssembler, Scaler)...")
    
    # 类别特征编码
    indexer = StringIndexer(inputCol="device_type", outputCol="device_index")
    df_indexed = indexer.fit(df).transform(df)
    
    # 特征向量组装
    feature_cols = ["total_duration_sec", "page_views", "add_to_cart_count", "device_index", "is_new_user"]
    assembler = VectorAssembler(inputCols=feature_cols, outputCol="raw_features")
    df_assembled = assembler.transform(df_indexed)
    
    # 特征标准化 (提升模型收敛)
    scaler = StandardScaler(inputCol="raw_features", outputCol="features", withStd=True, withMean=False)
    scaler_model = scaler.fit(df_assembled)
    df_final = scaler_model.transform(df_assembled)
    
    # 4. 拆分训练集与测试集
    train_df, test_df = df_final.randomSplit([0.8, 0.2], seed=42)
    print(f"--- 数据集拆分：训练集 {train_df.count()} 条, 测试集 {test_df.count()} 条 ---")
    
    # 5. 构建与训练随机森林分类模型
    print("🤖 [Step 4] 训练 Random Forest 分类器预测回头客 (is_converted)...")
    rf = RandomForestClassifier(featuresCol="features", labelCol="is_converted", numTrees=50, maxDepth=5, seed=42)
    rf_model = rf.fit(train_df)
    
    # 6. 模型预测与评估
    print("📈 [Step 5] 执行预测并评估模型性能...")
    predictions = rf_model.transform(test_df)
    
    evaluator_acc = MulticlassClassificationEvaluator(labelCol="is_converted", predictionCol="prediction", metricName="accuracy")
    evaluator_auc = BinaryClassificationEvaluator(labelCol="is_converted", rawPredictionCol="rawPrediction", metricName="areaUnderROC")
    
    accuracy = evaluator_acc.evaluate(predictions)
    auc = evaluator_auc.evaluate(predictions)
    
    print("="*50)
    print(f"🏆 模型评估结果：")
    print(f"   ➤ 准确率 (Accuracy) : {accuracy:.4f}")
    print(f"   ➤ ROC 曲线下面积 (AUC): {auc:.4f}")
    print("="*50)
    
    print("--- 预测结果对比展示 (真实 vs 预测概率) ---")
    predictions.select("user_id", "is_converted", "prediction", "probability").show(10, truncate=False)
    
    # ==============================
    # 实验要求：将结果持久化到 MySQL
    # ==============================
    # 提取有价值的预测数据准备写入
    write_df = predictions.select(
        col("user_id"),
        col("is_converted").alias("actual_label"),
        col("prediction").alias("predicted_label")
    )
    
    print("💾 [Step 6] 准备将预测结果持久化至 MySQL...")
    # 注意：此处需要您本地/Docker 有运行的 MySQL 数据库。如果无法连接，请截图终端上面的 Accuracy 后即可。
    mysql_url = "jdbc:mysql://localhost:33067/culcloud_data?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
    mysql_prop = {
        "user": "root",
        "password": "rootpassword",  # 请根据实际环境修改
        "driver": "com.mysql.cj.jdbc.Driver"
    }
    
    try:
        # 将 DataFrame 写入 MySQL
        write_df.write.jdbc(url=mysql_url, table="ml_user_predictions", mode="overwrite", properties=mysql_prop)
        print("✅ 成功！分析预测结果已持久化至 MySQL 表: ml_user_predictions。")
    except Exception as e:
        print("⚠️ 无法连接至 MySQL（可忽略，仅做演示）。如需完整测试，请启动 MySQL 服务并创建 culcloud_data 库。")
        print(f"错误详情: {str(e)[:100]}...")

    spark.stop()
    print("🎉 实验脚本执行完毕！请对上述指标和结果表格进行截图，放入实验报告中。")

if __name__ == "__main__":
    main()
