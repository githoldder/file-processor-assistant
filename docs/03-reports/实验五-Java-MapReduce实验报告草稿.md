# 实验五 Java MapReduce 实验报告草稿

## 一、实验目的

本实验在已有 `myubuntu:hadoop-yarn-lean` Hadoop 镜像基础上继续扩展能力，补齐 Java MapReduce 开发环境。实验目标包括：安装 Maven，配置 Maven 镜像源，编写并打包 Java MapReduce 程序，分别完成 WordCount 单词统计和销售额汇总任务，并将实验过程沉淀为可复跑的 Docker 镜像与脚本。

## 二、实验环境

- 宿主机：macOS + Docker Desktop
- 基础镜像：`myubuntu:hadoop-yarn-lean`
- 赋能后镜像：`myubuntu:hadoop-mapreduce-lab`
- Hadoop：3.4.3
- Java：OpenJDK 8
- Maven：3.9.11
- 自动化脚本：`scripts/build-and-run-mapreduce-lab.sh`

## 三、实验过程

第一步，检查基础镜像。通过临时容器验证基础镜像中已经安装 Java 与 Hadoop，其中 `HADOOP_HOME=/usr/local/hadoop`，Java 版本为 OpenJDK 8，Hadoop 版本为 3.4.3，但镜像中尚未安装 Maven。

第二步，构建赋能镜像。新增 `docker/hadoop-mapreduce-lab/Dockerfile`，以 `myubuntu:hadoop-yarn-lean` 为基础镜像，安装 Maven 3.9.11，并将 Maven 的中央仓库镜像配置为阿里云 Maven 源，降低依赖下载失败概率。

第三步，编写 MapReduce 程序。新增 `WordCount.java` 和 `SalesCount.java` 两个 Java 程序。`WordCount` 按空白字符拆分文本并统计单词出现次数；`SalesCount` 解析销售数据中的商品、数量和单价字段，并按商品汇总销售额。

第四步，使用 Maven 打包。通过 `pom.xml` 引入 `hadoop-common` 与 `hadoop-mapreduce-client-core` 依赖，依赖版本与镜像中的 Hadoop 3.4.3 保持一致，最终生成 `target/mapreduce-lab-1.0.0.jar`。

第五步，运行实验脚本。容器启动后执行 `run-mapreduce-lab.sh`，自动启动 SSH、格式化 NameNode、启动 HDFS 与 YARN，向 HDFS 上传测试数据，并依次运行 WordCount 和 SalesCount 两个 MapReduce 作业。

## 四、预期实验结果

WordCount 输入数据：

```text
hello hadoop
hello mapreduce
hadoop mapreduce
```

预期输出：

```text
hadoop	2
hello	2
mapreduce	2
```

SalesCount 输入数据：

```text
1001,apple,5,3.5,2025-01-01
1002,banana,10,2.0,2025-01-01
1003,apple,3,3.5,2025-01-01
1004,orange,8,4.0,2025-01-01
1005,banana,5,2.0,2025-01-01
```

预期输出：

```text
apple	28.0
banana	30.0
orange	32.0
```

实际运行日志保存位置：

```text
docs/03-reports/mapreduce-lab-run.log
```

## 五、实际运行结果

实验已于 2026-05-11 在本机 Docker 中完成。构建产物如下：

- 赋能镜像：`myubuntu:hadoop-mapreduce-lab`，镜像大小约 4.52GB
- 实验快照镜像：`myubuntu:hadoop-mapreduce-lab-snapshot`，镜像大小约 4.53GB
- 运行容器：`hadoop-mapreduce-lab`
- Maven 打包结果：`/root/mapreduce-lab/target/mapreduce-lab-1.0.0.jar`

容器内关键环境验证结果：

```text
OpenJDK 8
Apache Maven 3.9.11
Hadoop 3.4.3
NameNode、DataNode、SecondaryNameNode、ResourceManager、NodeManager 均已启动
```

WordCount 实际输出：

```text
hadoop	2
hello	2
mapreduce	2
```

SalesCount 实际输出：

```text
apple	28.0
banana	30.0
orange	32.0
```

HDFS 中生成了 `/wordcount/output/_SUCCESS` 与 `/sales/output/_SUCCESS`，说明两个 MapReduce 作业均正常完成。

## 六、实验结论

本实验完成了 Hadoop 镜像的进一步能力叠加：基础镜像原本已具备 Java、Hadoop、YARN 能力，本次新增 Maven 构建能力与 Java MapReduce 示例工程，使镜像可以直接用于 MapReduce 编程实验。通过 Dockerfile 和一键脚本固化环境后，实验过程从手动配置转变为可复现流程，后续可以继续在该镜像上扩展更多 MapReduce、HDFS API 或数据处理案例。
