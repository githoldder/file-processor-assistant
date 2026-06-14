#!/bin/bash
# CIT LaTeX Clean Script — 课程大作业说明书
set -e

cd "$(dirname "$0")/.."
echo "==> Invoking Makefile to clean up CIT course report workspace..."
make -C scripts clean
echo "==> Workspace cleaned!"
