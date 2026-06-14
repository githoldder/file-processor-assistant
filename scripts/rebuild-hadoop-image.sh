#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/docker/hadoop-repro"
TMP_CONTEXT="$(mktemp -d /tmp/hadoop-repro-build.XXXXXX)"
IMAGE="${1:-chaoliu123/myubuntu:hadoop-mapreduce-lab-topn}"
LOCAL_ALIAS="${LOCAL_ALIAS:-myubuntu:hadoop-mapreduce-lab-topn}"
HADOOP_VERSION="${HADOOP_VERSION:-3.3.6}"
HADOOP_URL="${HADOOP_URL:-https://mirrors.tuna.tsinghua.edu.cn/apache/hadoop/common/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz}"
HADOOP_FALLBACK_URL="${HADOOP_FALLBACK_URL:-https://archive.apache.org/dist/hadoop/common/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz}"

cleanup() {
  rm -rf "${TMP_CONTEXT}"
}
trap cleanup EXIT

mkdir -p "${TMP_CONTEXT}/resources" "${TMP_CONTEXT}/topn-flow"

cp -R "${BUILD_DIR}/." "${TMP_CONTEXT}/"
cp -R "/Users/caolei/Desktop/308-大数据与云计算/topn-flow/." "${TMP_CONTEXT}/topn-flow/"
cp "/Users/caolei/Desktop/308-大数据与云计算/TopN.txt" "${TMP_CONTEXT}/resources/TopN.txt"
cp "/Users/caolei/Desktop/308-大数据与云计算/01-resources/exam6/apache-hive-3.1.3-bin.tar.gz" "${TMP_CONTEXT}/resources/apache-hive-3.1.3-bin.tar.gz"
cp "/Users/caolei/Desktop/308-大数据与云计算/01-resources/exam6/mysql-connector-java-8.0.21.jar" "${TMP_CONTEXT}/resources/mysql-connector-java-8.0.21.jar"
cp "/Users/caolei/Desktop/308-大数据与云计算/01-resources/exam6/commons-collections-3.2.2.jar" "${TMP_CONTEXT}/resources/commons-collections-3.2.2.jar"

docker build \
  --build-arg "HADOOP_VERSION=${HADOOP_VERSION}" \
  --build-arg "HADOOP_URL=${HADOOP_URL}" \
  --build-arg "HADOOP_FALLBACK_URL=${HADOOP_FALLBACK_URL}" \
  -t "${IMAGE}" \
  -t "${LOCAL_ALIAS}" \
  "${TMP_CONTEXT}"

echo "Built images:"
docker image ls "${IMAGE}"
docker image ls "${LOCAL_ALIAS}"
