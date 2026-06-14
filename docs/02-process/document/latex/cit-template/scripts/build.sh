#!/bin/bash
# CIT LaTeX Build Script — 课程大作业说明书
set -e

cd "$(dirname "$0")/.."
echo "==> Invoking Makefile to build CIT course report..."
make -C scripts clean
make -C scripts
echo "==> Build successfully completed!"
