FROM eclipse-temurin:8-jdk-jammy

ARG HADOOP_VERSION=3.3.6
ARG HIVE_VERSION=3.1.3
ARG HADOOP_URL=https://mirrors.tuna.tsinghua.edu.cn/apache/hadoop/common/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz
ARG HADOOP_FALLBACK_URL=https://archive.apache.org/dist/hadoop/common/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz

ENV JAVA_HOME=/opt/java/openjdk
ENV HADOOP_HOME=/usr/local/hadoop
ENV HIVE_HOME=/opt/hive
ENV HADOOP_CONF_DIR=/usr/local/hadoop/etc/hadoop
ENV PATH=/opt/maven/bin:/opt/hive/bin:/usr/local/hadoop/bin:/usr/local/hadoop/sbin:/opt/java/openjdk/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

WORKDIR /opt/build

RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates curl openssh-server procps net-tools iputils-ping maven tar gzip; \
    mkdir -p /run/sshd /opt /usr/local; \
    ssh-keygen -A; \
    mkdir -p /root/.ssh; \
    ssh-keygen -t rsa -P "" -f /root/.ssh/id_rsa; \
    cat /root/.ssh/id_rsa.pub >> /root/.ssh/authorized_keys; \
    chmod 600 /root/.ssh/authorized_keys; \
    curl -fL --retry 3 --connect-timeout 20 "${HADOOP_URL}" -o /tmp/hadoop.tar.gz || \
      curl -fL --retry 3 --connect-timeout 20 "${HADOOP_FALLBACK_URL}" -o /tmp/hadoop.tar.gz; \
    tar -xzf /tmp/hadoop.tar.gz -C /usr/local; \
    ln -s /usr/local/hadoop-${HADOOP_VERSION} "${HADOOP_HOME}"; \
    rm -f /tmp/hadoop.tar.gz; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

COPY resources/apache-hive-3.1.3-bin.tar.gz /tmp/apache-hive-3.1.3-bin.tar.gz
COPY resources/mysql-connector-java-8.0.21.jar /tmp/mysql-connector-java-8.0.21.jar
COPY resources/commons-collections-3.2.2.jar /tmp/commons-collections-3.2.2.jar
COPY resources/TopN.txt /opt/TopN.txt
COPY topn-flow /opt/topn-flow
COPY scripts/*.sh /usr/local/bin/
COPY conf/hadoop/*.xml ${HADOOP_CONF_DIR}/
COPY conf/hive/hive-site.xml /tmp/hive-site.xml

RUN set -eux; \
    tar -xzf /tmp/apache-hive-3.1.3-bin.tar.gz -C /opt; \
    rm -rf "${HIVE_HOME}"; \
    ln -s /opt/apache-hive-${HIVE_VERSION}-bin "${HIVE_HOME}"; \
    cp /tmp/hive-site.xml "${HIVE_HOME}/conf/hive-site.xml"; \
    cp /tmp/mysql-connector-java-8.0.21.jar "${HIVE_HOME}/lib/"; \
    cp /tmp/commons-collections-3.2.2.jar "${HIVE_HOME}/lib/"; \
    rm -f "${HIVE_HOME}"/lib/log4j-slf4j-impl-*.jar; \
    rm -f "${HIVE_HOME}"/lib/guava-*.jar; \
    cp "${HADOOP_HOME}"/share/hadoop/common/lib/guava-*.jar "${HIVE_HOME}/lib/"; \
    rm -f /tmp/apache-hive-3.1.3-bin.tar.gz /tmp/mysql-connector-java-8.0.21.jar /tmp/commons-collections-3.2.2.jar /tmp/hive-site.xml; \
    chmod +x /usr/local/bin/*.sh; \
    sed -i "s|^# export JAVA_HOME=.*|export JAVA_HOME=${JAVA_HOME}|" "${HADOOP_CONF_DIR}/hadoop-env.sh"; \
    cd /opt/topn-flow; \
    rm -rf build target; \
    mkdir -p build target; \
    javac -classpath "$(${HADOOP_HOME}/bin/hadoop classpath)" -d build src/main/java/com/exam5/*.java; \
    cd build; \
    jar cf /opt/topn-flow/target/topn-flow-1.0.jar com

WORKDIR /root

EXPOSE 8088 9870 9864 9866 10000 9083

CMD ["bash", "/usr/local/bin/start-hadoop-lab.sh"]
