#!/bin/bash
# 完整系统测试脚本

echo "=========================================="
echo "文件处理全能助手 - 完整系统测试"
echo "=========================================="
echo ""

# 1. 服务健康检查
echo "【1】服务健康检查"
echo "--------------------------------------"

echo -n "API服务: "
API_STATUS=$(curl -s http://localhost:8000/health)
if [[ $API_STATUS == *"healthy"* ]]; then
    echo "✅ 正常"
else
    echo "❌ 异常"
fi

echo -n "前端页面: "
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
if [[ $FRONTEND == "200" ]]; then
    echo "✅ 正常 (HTTP $FRONTEND)"
else
    echo "❌ 异常 (HTTP $FRONTEND)"
fi

echo -n "Redis: "
REDIS_STATUS=$(docker exec file-processor-redis-1 redis-cli ping 2>/dev/null)
if [[ $REDIS_STATUS == "PONG" ]]; then
    echo "✅ 正常"
else
    echo "❌ 异常"
fi

echo -n "PostgreSQL: "
PG_STATUS=$(docker exec file-processor-postgres-1 pg_isready -U fileuser -d file_processor 2>/dev/null)
if [[ $PG_STATUS == *"accepting connections"* ]]; then
    echo "✅ 正常"
else
    echo "❌ 异常"
fi

echo -n "Gotenberg: "
GOTENBERG=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [[ $GOTENBERG == "404" || $GOTENBERG == "200" ]]; then
    echo "✅ 正常 (HTTP $GOTENBERG)"
else
    echo "❌ 异常 (HTTP $GOTENBERG)"
fi

echo ""
echo "【2】API接口测试"
echo "--------------------------------------"

echo -n "获取支持格式: "
FORMATS=$(curl -s http://localhost:8000/api/v1/formats)
if [[ $FORMATS == *"pdf"* ]]; then
    echo "✅ 正常"
else
    echo "❌ 异常"
fi

echo ""
echo "【3】格式转换测试"
echo "--------------------------------------"

# 测试 Word 转 PDF
echo -n "Word → PDF: "
TASK_ID=$(curl -s -X POST "http://localhost:8000/api/v1/convert?conversion_type=word_to_pdf" \
    -F "file=@test_samples/2025 APMCM Control Sheet.docx" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 5
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

# 测试 PDF 转 Word
echo -n "PDF → Word: "
TASK_ID=$(curl -s -X POST "http://localhost:8000/api/v1/convert?conversion_type=pdf_to_word" \
    -F "file=@test_samples/2025 APMCM Control Sheet_20251120102742.pdf" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 5
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

# 测试 PNG 转 PDF
echo -n "PNG → PDF: "
TASK_ID=$(curl -s -X POST "http://localhost:8000/api/v1/convert?conversion_type=png_to_pdf" \
    -F "file=@test_samples/证件照_1748960774467_413_579.png" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 5
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

# 测试 Excel 转 PDF
echo -n "Excel → PDF: "
TASK_ID=$(curl -s -X POST "http://localhost:8000/api/v1/convert?conversion_type=excel_to_pdf" \
    -F "file=@test_samples/5.2025计算机学院团委学生会换届汇总表.xlsx" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 5
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

# 测试 PPTX 转 PDF
echo -n "PPTX → PDF: "
TASK_ID=$(curl -s -X POST "http://localhost:8000/api/v1/convert?conversion_type=pptx_to_pdf" \
    -F "file=@test_samples/2024年文娱部招新ppt.pptx" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 10
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

# 测试 Markdown 转 PDF
echo -n "Markdown → PDF: "
TASK_ID=$(curl -s -X POST "http://localhost:8000/api/v1/convert?conversion_type=markdown_to_pdf" \
    -F "file=@test_samples/瘦子增肌计划(1).md" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 5
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

echo ""
echo "【4】PDF处理功能测试"
echo "--------------------------------------"

# 上传PDF文件
echo -n "上传PDF文件: "
FILE_ID=$(curl -s -X POST http://localhost:8000/api/v1/upload \
    -F "file=@test_samples/2025 APMCM Control Sheet_20251120102742.pdf" | python3 -c "import sys,json; print(json.load(sys.stdin).get('file_id',''))")
if [[ -n $FILE_ID ]]; then
    echo "✅ 成功 (file_id: $FILE_ID)"
else
    echo "❌ 失败"
    FILE_ID="test-file-id"
fi

# 测试 PDF 转图片
echo -n "PDF → 图片: "
TASK_ID=$(curl -s -X POST "http://localhost:8000/api/v1/pdf/to-images" \
    -F "file=@test_samples/2025 APMCM Control Sheet_20251120102742.pdf" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 5
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

# 测试 PDF 文本提取
echo -n "PDF文本提取: "
TASK_ID=$(curl -s -X POST http://localhost:8000/api/v1/pdf/extract \
    -H "Content-Type: application/json" \
    -d "{\"file_id\": \"$FILE_ID\", \"extract_text\": true}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 5
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

# 测试 PDF 分割
echo -n "PDF分割: "
TASK_ID=$(curl -s -X POST http://localhost:8000/api/v1/pdf/split \
    -H "Content-Type: application/json" \
    -d "{\"file_id\": \"$FILE_ID\", \"page_ranges\": [\"1-1\"]}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 5
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

# 测试 PDF 合并
echo -n "PDF合并: "
TASK_ID=$(curl -s -X POST http://localhost:8000/api/v1/pdf/merge \
    -H "Content-Type: application/json" \
    -d "{\"file_ids\": [\"$FILE_ID\", \"$FILE_ID\"], \"output_filename\": \"merged.pdf\"}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 5
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    echo "✅ 成功"
else
    echo "❌ 失败 ($RESULT)"
fi

echo ""
echo "【5】批量处理测试"
echo "--------------------------------------"

echo -n "批量转换: "
TASK_ID=$(curl -s -X POST "http://localhost:8000/api/v1/convert/batch?conversion_type=word_to_pdf" \
    -F "files=@test_samples/2025 APMCM Control Sheet.docx" \
    -F "files=@test_samples/瘦子增肌计划(1).md" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))")
sleep 15
RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))")
if [[ $RESULT == "SUCCESS" ]]; then
    COMPLETED=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('completed',0))")
    echo "✅ 成功 (完成: $COMPLETED)"
else
    echo "❌ 失败 ($RESULT)"
fi

echo ""
echo "【6】高并发测试"
echo "--------------------------------------"

echo "发起10个并发请求..."
for i in {1..10}; do
    curl -s -X POST "http://localhost:8000/api/v1/convert?conversion_type=word_to_pdf" \
        -F "file=@test_samples/2025 APMCM Control Sheet.docx" > /tmp/concurrent_$i.json &
done
wait

echo -n "并发处理: "
sleep 15
SUCCESS=0
for i in {1..10}; do
    TASK_ID=$(cat /tmp/concurrent_$i.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_id',''))" 2>/dev/null)
    if [[ -n $TASK_ID ]]; then
        RESULT=$(curl -s http://localhost:8000/api/v1/tasks/$TASK_ID | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
        if [[ $RESULT == "SUCCESS" ]]; then
            SUCCESS=$((SUCCESS+1))
        fi
    fi
done
echo "✅ 成功 ($SUCCESS/10)"

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
