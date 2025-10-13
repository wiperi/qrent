#!/bin/bash
# QRent Scraper 独立部署测试脚本

set -e

echo "🧪 测试QRent Scraper独立部署..."
echo "=================================="

# 切换到scraper目录
cd "$(dirname "$0")"

# 测试1: 检查必要的文件
echo "📁 测试1: 检查必要文件..."
required_files=(
    "Dockerfile"
    "docker-compose.yml"
    "deploy.sh"
    ".env.example"
    "property.py"
    "requirements.txt"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file 存在"
    else
        echo "  ❌ $file 缺失"
        exit 1
    fi
done

# 测试2: 验证deploy.sh脚本
echo ""
echo "🔧 测试2: 验证部署脚本..."
if [ -x "deploy.sh" ]; then
    echo "  ✅ deploy.sh 有执行权限"
else
    echo "  ❌ deploy.sh 无执行权限"
    chmod +x deploy.sh
    echo "  🔧 已修复执行权限"
fi

# 测试3: 验证Docker配置
echo ""
echo "🐳 测试3: 验证Docker配置..."
if docker-compose config >/dev/null 2>&1; then
    echo "  ✅ docker-compose.yml 配置有效"
else
    echo "  ❌ docker-compose.yml 配置无效"
    exit 1
fi

# 测试4: 检查Python导入
echo ""
echo "🐍 测试4: 检查Python模块导入..."
python3 -c "
import sys
sys.path.append('.')
try:
    from target_areas import postcodes_unsw, postcodes_usyd, postcodes_uts
    print('  ✅ target_areas 模块导入成功')
    print(f'  📍 UNSW区域: {len(postcodes_unsw)}个')
    print(f'  📍 USYD区域: {len(postcodes_usyd)}个')
    print(f'  📍 UTS区域: {len(postcodes_uts)}个')
except ImportError as e:
    print(f'  ❌ 导入失败: {e}')
    sys.exit(1)
"

# 测试5: 验证环境变量模板
echo ""
echo "⚙️ 测试5: 验证环境变量模板..."
required_vars=(
    "DB_HOST"
    "DB_USER"
    "DB_PASSWORD"
    "DB_DATABASE"
    "GOOGLE_MAPS_API_KEY"
    "PROPERTY_RATING_API_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if grep -q "^${var}=" .env.example; then
        echo "  ✅ $var 在模板中存在"
    else
        echo "  ⚠️ $var 在模板中缺失"
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "  ✅ 所有必需变量都在模板中"
else
    echo "  ⚠️ 建议在.env.example中添加缺失的变量"
fi

# 测试6: 检查Docker build
echo ""
echo "🔨 测试6: 测试Docker镜像构建..."
if docker build -t qrent-scraper-test . >/dev/null 2>&1; then
    echo "  ✅ Docker镜像构建成功"
    docker rmi qrent-scraper-test >/dev/null 2>&1
else
    echo "  ❌ Docker镜像构建失败"
    exit 1
fi

echo ""
echo "🎉 所有测试通过！"
echo ""
echo "📝 下一步操作："
echo "1. 初始化环境: ./deploy.sh init"
echo "2. 配置API密钥: nano .env"
echo "3. 构建镜像: ./deploy.sh build"
echo "4. 启动服务: ./deploy.sh start"
echo "5. 查看状态: ./deploy.sh status"
echo ""
echo "🔗 独立部署已就绪！"
