#!/usr/bin/env bash
set -euo pipefail

export HADOOP_HOME="${HADOOP_HOME:-/usr/local/hadoop}"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-8-openjdk-arm64}"
export PATH="${JAVA_HOME}/bin:/opt/maven/bin:${HADOOP_HOME}/bin:${HADOOP_HOME}/sbin:${PATH}"

cd /root/mapreduce-lab

echo "=== Environment ==="
java -version 2>&1 | head -3
mvn -v | head -2
hadoop version | head -3

echo "=== Start Hadoop services ==="
service ssh start >/dev/null 2>&1 || true
if [ ! -d /tmp/hadoop-root/dfs/name/current ]; then
  hdfs namenode -format -force -nonInteractive >/tmp/hadoop-format.log 2>&1
fi
start-dfs.sh >/tmp/hadoop-start-dfs.log 2>&1 || true
start-yarn.sh >/tmp/hadoop-start-yarn.log 2>&1 || true
sleep 5
jps

echo "=== Build MapReduce jar ==="
mvn -q -DskipTests package
JAR=/root/mapreduce-lab/target/mapreduce-lab-1.0.0.jar
ls -lh "${JAR}"

echo "=== Prepare WordCount input ==="
cat >/tmp/wordcount-test.txt <<'DATA'
hello hadoop
hello mapreduce
hadoop mapreduce
DATA
hdfs dfs -rm -r -f /wordcount >/dev/null 2>&1 || true
hdfs dfs -mkdir -p /wordcount/input
hdfs dfs -put /tmp/wordcount-test.txt /wordcount/input/test.txt
hadoop jar "${JAR}" WordCount /wordcount/input /wordcount/output
echo "--- WordCount output ---"
hdfs dfs -cat /wordcount/output/part-r-00000 | sort

echo "=== Prepare SalesCount input ==="
cat >/tmp/sales.txt <<'DATA'
1001,apple,5,3.5,2025-01-01
1002,banana,10,2.0,2025-01-01
1003,apple,3,3.5,2025-01-01
1004,orange,8,4.0,2025-01-01
1005,banana,5,2.0,2025-01-01
DATA
hdfs dfs -rm -r -f /sales >/dev/null 2>&1 || true
hdfs dfs -mkdir -p /sales/input
hdfs dfs -put /tmp/sales.txt /sales/input/sales.txt
hadoop jar "${JAR}" SalesCount /sales/input /sales/output
echo "--- SalesCount output ---"
hdfs dfs -cat /sales/output/part-r-00000 | sort

echo "=== HDFS tree ==="
hdfs dfs -ls -R /wordcount /sales

echo "=== Lab completed ==="
