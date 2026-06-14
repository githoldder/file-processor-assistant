#!/usr/bin/env bash
set -euo pipefail

mkdir -p /tmp/hive
hdfs dfs -mkdir -p /tmp/hive /user/hive/warehouse >/dev/null 2>&1 || true
hdfs dfs -chmod 777 /tmp/hive /user/hive/warehouse >/dev/null 2>&1 || true

if [ ! -d /root/metastore_db ]; then
  schematool -dbType derby -initSchema >/tmp/hive-schema-init.log 2>&1
fi

cat >/root/user_data.csv <<'DATA'
1,zhangsan,22,2026-05-31
2,lisi,25,2026-05-31
3,wangwu,21,2026-05-31
4,zhaoliu,28,2026-05-31
5,qianqi,23,2026-05-31
6,sunba,26,2026-05-31
7,zhoujiu,24,2026-05-31
8,wushi,27,2026-05-31
DATA

hive -S <<'HQL'
CREATE DATABASE IF NOT EXISTS test_db;
USE test_db;
DROP TABLE IF EXISTS user_info;
CREATE TABLE user_info (
  id INT,
  name STRING,
  age INT,
  dt STRING
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
STORED AS TEXTFILE;
LOAD DATA LOCAL INPATH '/root/user_data.csv' INTO TABLE user_info;
SHOW DATABASES;
SHOW TABLES;
SELECT * FROM user_info;
SELECT name, age FROM user_info WHERE age > 24;
SELECT dt, COUNT(*) AS total_user FROM user_info GROUP BY dt;
HQL
