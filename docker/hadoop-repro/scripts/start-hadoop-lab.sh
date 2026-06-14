#!/usr/bin/env bash
set -euo pipefail

export HDFS_NAMENODE_USER=root
export HDFS_DATANODE_USER=root
export HDFS_SECONDARYNAMENODE_USER=root
export YARN_RESOURCEMANAGER_USER=root
export YARN_NODEMANAGER_USER=root

service ssh start >/dev/null 2>&1 || true

if [ ! -d /tmp/hadoop-root/dfs/name/current ]; then
  hdfs namenode -format -force -nonInteractive >/tmp/hadoop-format.log 2>&1
fi

start-dfs.sh >/tmp/hadoop-start-dfs.log 2>&1 || true
start-yarn.sh >/tmp/hadoop-start-yarn.log 2>&1 || true

mkdir -p /tmp/hive
hdfs dfs -mkdir -p /tmp/hive /user/hive/warehouse /input >/dev/null 2>&1 || true
hdfs dfs -chmod 777 /tmp/hive /user/hive/warehouse >/dev/null 2>&1 || true

echo "Hadoop lab is running."
jps || true
tail -f /dev/null
