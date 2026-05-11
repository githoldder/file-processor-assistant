FROM myubuntu:hadoop-yarn-lean

ENV HADOOP_HOME=/usr/local/hadoop
ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-arm64
ENV MAVEN_HOME=/opt/maven
ENV PATH=/usr/lib/jvm/java-8-openjdk-arm64/bin:/opt/maven/bin:/usr/local/hadoop/bin:/usr/local/hadoop/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

ARG MAVEN_VERSION=3.9.11
ARG MAVEN_ARCHIVE=apache-maven-${MAVEN_VERSION}-bin.tar.gz
ARG MAVEN_URL=https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/${MAVEN_ARCHIVE}

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl ca-certificates tar openssh-server; \
    curl -fsSL "${MAVEN_URL}" -o "/tmp/${MAVEN_ARCHIVE}"; \
    mkdir -p /opt; \
    tar -xzf "/tmp/${MAVEN_ARCHIVE}" -C /opt; \
    ln -s "/opt/apache-maven-${MAVEN_VERSION}" "${MAVEN_HOME}"; \
    rm -f "/tmp/${MAVEN_ARCHIVE}"; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

COPY settings.xml /opt/maven/conf/settings.xml
COPY pom.xml /root/mapreduce-lab/pom.xml
COPY src /root/mapreduce-lab/src
COPY run-lab.sh /usr/local/bin/run-mapreduce-lab.sh

RUN chmod +x /usr/local/bin/run-mapreduce-lab.sh; \
    cd /root/mapreduce-lab; \
    mvn -q -DskipTests package

WORKDIR /root/mapreduce-lab

CMD ["bash", "/usr/local/bin/run-mapreduce-lab.sh"]
