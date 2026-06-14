#!/usr/bin/env bash
set -euo pipefail

hdfs dfs -mkdir -p /input
hdfs dfs -put -f /opt/TopN.txt /input/TopN.txt
hdfs dfs -rm -r -f /output/topn >/dev/null 2>&1 || true

hadoop jar /opt/topn-flow/target/topn-flow-1.0.jar \
  com.exam5.TopTenDriver \
  /input/TopN.txt \
  /output/topn

hdfs dfs -cat /output/topn/part-r-00000
