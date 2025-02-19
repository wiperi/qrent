from flask import Flask, jsonify, request, session, render_template
from flask_cors import CORS
import mysql.connector
import logging
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv, find_dotenv
import os
# from flask_limiter import Limiter
# from flask_limiter.util import get_remote_address
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import json
import re

# 新增引入的包
import jwt
from functools import wraps
import bcrypt

# ---------------------------
# 1. 加载环境变量
# ---------------------------
dotenv_path = find_dotenv()
if not dotenv_path:
    raise RuntimeError("Failed to load .env file")

if not load_dotenv(dotenv_path):
    raise RuntimeError(f"Failed to load .env file from {dotenv_path}")

# 检查环境变量是否加载成功
if not os.getenv('DB_HOST') or not os.getenv('DB_USER') or not os.getenv('ALIYUN_API_KEY'):
    raise RuntimeError("Missing critical environment variables in .env")

# ---------------------------
# 2. Flask 应用与 CORS 配置
# ---------------------------
app = Flask(__name__, 
    template_folder='templates',
    static_folder='static',
    static_url_path=''
)
# 使用固定的 secret_key
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your-secret-key-here')

# 配置 CORS
CORS(app, resources={
    r"/*": {  # 允许所有路由
        "origins": [
            "http://localhost:2781",
            "http://localhost:5000",
            "http://134.175.168.147:2781",
            "http://134.175.168.147:5000",
            "http://134.175.168.147",
            "http://www.qrent.com.cn",
            "*"  # 允许所有来源，仅在开发环境使用
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True
    }
})

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# 初始化 Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# ---------------------------
# 数据库配置
# ---------------------------
db_config = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'pool_name': 'mypool',
    'pool_size': 5,
    'connect_timeout': 10
}

# 用户模型
class User(UserMixin):
    def __init__(self, id, username, email):
        self.id = id
        self.username = username
        self.email = email

@login_manager.user_loader
def load_user(user_id):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if user_data:
            return User(user_data['id'], user_data['username'], user_data['email'])
        return None
    except Exception as e:
        logger.error(f"Error loading user: {str(e)}")
        return None

# 创建用户表
def create_users_table():
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(80) UNIQUE NOT NULL,
                    email VARCHAR(120) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            logger.info("Users table created successfully")
            return True
        except Exception as e:
            logger.error(f"Error creating users table (attempt {retry_count + 1}): {str(e)}")
            retry_count += 1
            if retry_count == max_retries:
                logger.error("Failed to create users table after maximum retries")
                return False
    
    return False

# 在应用启动时创建用户表
if not create_users_table():
    logger.error("Failed to create users table, but continuing startup...")

# ---------------------------
# 3. 日志配置
# ---------------------------
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# # ---------------------------
# # 4. 请求频率限制 (如有需要启用)
# # ---------------------------
# limiter = Limiter(
#     app=app,
#     key_func=get_remote_address,
#     default_limits=["3000 per day", "500 per hour"]  # 可根据需要调整
# )

# ---------------------------
# 5. 从环境变量获取数据库及 API 配置
# ---------------------------
db_config = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'port': int(os.getenv('DB_PORT', 3306))
}

API_KEY = os.getenv('ALIYUN_API_KEY')
if not API_KEY:
    logger.error("API key not found in environment variables")
    raise ValueError("API key is required")

# ---------------------------
# 6. 测试数据库连接函数
# ---------------------------
def test_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {str(e)}")
        return False

# ---------------------------
# 7. 首页路由
# ---------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api')
def api_index():
    return jsonify({
        "status": "success",
        "message": "Welcome to Qrent API",
        "version": "1.0.0",
        "endpoints": {
            "data": "/api/data",
            "chat": "/api/chat",
            "register": "/api/register",
            "login": "/api/login",
            "logout": "/api/logout",
            "user": "/api/user"
        }
    })

# ---------------------------
# 8. 数据库测试路由
# ---------------------------
@app.route('/api/test-db', methods=['GET'])
def test_db():
    if test_db_connection():
        return jsonify({"status": "success", "message": "数据库连接成功"})
    else:
        return jsonify({"status": "error", "message": "数据库连接失败"}), 500

# ---------------------------
# 9. 查询数据库的路由 (/api/data)
# ---------------------------
@app.route('/api/data', methods=['GET'])
def get_data():
    try:
        # 获取 URL 参数
        price_min = request.args.get('price_min', type=float)
        price_max = request.args.get('price_max', type=float)
        bedrooms_min = request.args.get('bedrooms_min', type=float)
        bedrooms_max = request.args.get('bedrooms_max', type=float)
        min_bathrooms = request.args.get('bathrooms', type=float)
        min_parkings = request.args.get('parkings', type=float)
        house_type = request.args.get('house_type', type=str)
        commute_time_min = request.args.get('commute_time_min', type=float)
        commute_time_max = request.args.get('commute_time_max', type=float)
        available_date = request.args.get('available_date', type=str)
        keywords = request.args.get('keywords', type=str)
        
        suburbs = request.args.getlist('Address Line 2')
        logger.info(f"Received suburbs parameter: {suburbs}")
        
        # 动态构建 SQL 查询
        query = """
            SELECT SQL_CALC_FOUND_ROWS 
                   `Price`,
                   `Address Line 1`,
                   `Address Line 2`,
                   `Number of Bedrooms`,
                   `Number of Bathrooms`,
                   `Number of Parkings`,
                   `House Type`,
                   `Commute Time`,
                   `Available Date`,
                   `Keywords`,
                   `Average Score`,
                   `website`
            FROM Q_rent_cleaned_with_commute
            WHERE 1=1
        """
        params = []

        # 修改包含空格的字段名的条件判断
        if suburbs:
            placeholders = ','.join(['%s'] * len(suburbs))
            query += f" AND `Address Line 2` IN ({placeholders})"
            params.extend(suburbs)
            logger.info(f"Adding suburb filter: {suburbs}")
        if price_min:
            query += " AND `Price` >= %s"
            params.append(price_min)
        if price_max:
            query += " AND `Price` <= %s"
            params.append(price_max)
        if bedrooms_min:
            query += " AND `Number of Bedrooms` >= %s"
            params.append(bedrooms_min)
        if bedrooms_max:
            query += " AND `Number of Bedrooms` <= %s"
            params.append(bedrooms_max)
        if min_bathrooms:
            query += " AND `Number of Bathrooms` >= %s"
            params.append(min_bathrooms)
        if min_parkings:
            query += " AND `Number of Parkings` >= %s"
            params.append(min_parkings)
        if house_type:
            house_types = house_type.split(',')
            placeholders = ','.join(['%s'] * len(house_types))
            query += f" AND `House Type` IN ({placeholders})"
            params.extend(house_types)
        if commute_time_min:
            query += " AND `Commute Time` >= %s"
            params.append(commute_time_min)
        if commute_time_max:
            query += " AND `Commute Time` <= %s"
            params.append(commute_time_max)
        if keywords:
            query += " AND (`Keywords` LIKE %s)"
            params.append(f"%{keywords}%")

        # 添加入住日期筛选
        if available_date:
            query += " AND DATE(`Available Date`) >= DATE(%s)"
            params.append(available_date)

        # 添加排序条件
        query += " ORDER BY `Average Score` DESC"
        
        # 添加分页
        page = request.args.get('page', default=1, type=int)
        page_size = request.args.get('page_size', default=10, type=int)
        offset = (page - 1) * page_size
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])

        logger.info(f"Final SQL query: {query}")
        logger.info(f"Query parameters: {params}")
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(query, params)
        houses = cursor.fetchall()
        
        cursor.execute("SELECT FOUND_ROWS() as total")
        total_records = cursor.fetchone()['total']
        
        total_pages = (total_records + page_size - 1) // page_size

        for house in houses:
            if house.get('Available Date'):
                house['Available Date'] = str(house['Available Date'])

        cursor.close()
        conn.close()

        return jsonify({
            'data': houses,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'total_records': total_records
        })

    except Exception as e:
        logger.error(f"Error getting data: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

# ---------------------------
# 10. 调用阿里云 Chat API 的路由 (/api/chat)
# ---------------------------
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        message = request.json.get('message')
        if not message:
            return jsonify({"error": "No message provided"}), 400

        logger.info(f"Chat request from {request.remote_addr}")

        # 调用阿里云API
        response = requests.post(
            'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {API_KEY}'
            },
            json={
                'model': 'qwen-plus',
                'messages': [
                    {
                        'role': 'system',
                        'content': '你是一个专业的租房助手，可以帮助用户解答关于租房的各种问题。'
                    },
                    {
                        'role': 'user',
                        'content': message
                    }
                ]
            }
        )

        if response.status_code != 200:
            logger.error(f"API request failed with status {response.status_code}")
            return jsonify({"error": "API request failed"}), response.status_code

        return jsonify(response.json())

    except Exception as e:
        logger.error(f"Chat API Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ---------------------------
# 11. 应用配置
# ---------------------------
def create_app():
    if test_db_connection():
        logger.info("Database connection test successful")
        return app
    else:
        logger.error("Database connection test failed")
        return app

app = create_app()

# 注册路由：注册
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({"error": "所有字段都是必填的"}), 400
        
        # 使用bcrypt加密（需要安装pip install bcrypt）
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
                (username, email, hashed_password.decode('utf-8'))  # 存储为字符串
            )
            conn.commit()
            
            user_id = cursor.lastrowid
            user = User(user_id, username, email)
            login_user(user)  # 同时使用 Flask-Login 登录

            return jsonify({
                "message": "注册成功",
                "user": {
                    "id": user_id,
                    "username": username,
                    "email": email
                }
            }), 201
            
        except mysql.connector.IntegrityError:
            return jsonify({"error": "用户名或邮箱已存在"}), 409
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({"error": "注册失败"}), 500

# 登录路由
@app.route('/api/login', methods=['POST'])
def login():
    try:
        # 强制检查JSON格式
        if not request.is_json:
            return jsonify({"error": "请求必须是JSON格式"}), 400
            
        data = request.get_json(force=True)  # 强制解析JSON
        
        print("[Flask] 收到登录请求，请求头:", request.headers)
        print("[Flask] 请求体原始数据:", request.get_data())
        print("[Flask] 解析后的JSON数据:", data)
        
        # 明确接收username字段（允许用户名或邮箱）
        login_id = data.get('username')  # 前端发送的是username字段
        password = data.get('password')
        
        if not login_id or not password:
            print(f"[Flask] 缺少字段: username={login_id}, password={password}")
            return jsonify({"error": "用户名/邮箱和密码都是必填的"}), 400

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # 同时查询用户名和邮箱
        query = """
            SELECT * FROM users 
            WHERE username = %s OR email = %s
        """
        cursor.execute(query, (login_id, login_id))
        user_data = cursor.fetchone()

        cursor.close()
        conn.close()

        if user_data and bcrypt.checkpw(password.encode('utf-8'), user_data['password'].encode('utf-8')):
            # 生成包含必要字段的payload
            payload = {
                'user_id': user_data['id'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)  # 添加有效期
            }
            # 使用更安全的签名方式
            token = jwt.encode(payload, app.secret_key, algorithm='HS256')
            
            return jsonify({
                "message": "登录成功",
                "token": token,
                "user": {
                    "id": user_data['id'],
                    "username": user_data['username'],
                    "email": user_data['email']
                }
            })

        return jsonify({"error": "用户名/邮箱或密码错误"}), 401

    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)  # 添加exc_info=True显示完整堆栈
        return jsonify({"error": "登录失败，请稍后重试"}), 500

# 登出路由
@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "已成功登出"})

# 获取当前用户信息
@app.route('/api/user', methods=['GET'])
@login_required
def get_user():
    return jsonify({
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email
        }
    })

@app.route('/api/config')
def get_config():
    return jsonify({
        "apiHost": os.getenv('API_HOST', '134.175.168.147'),
        "apiPort": int(os.getenv('API_PORT', '5000')),
        "dbHost": os.getenv('DB_HOST'),
        "dbPort": os.getenv('DB_PORT')
    })

# 登录、注册页面
@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

# 收藏相关接口
@app.route('/favorites/<int:id>', methods=['DELETE'])
def delete_favorite(id):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM favorites WHERE id = %s", (id,))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({'message': '取消收藏成功'}), 200

    except mysql.connector.Error as e:
        logger.error(f"MySQL Error: {str(e)}")
        return jsonify({'error': '数据库错误'}), 500
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({'error': '服务器错误'}), 500

@app.route('/favorites/<int:user_id>', methods=['GET'])
def get_favorites(user_id):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM favorites WHERE user_id = %s", (user_id,))
        favorites = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(favorites), 200

    except mysql.connector.Error as e:
        logger.error(f"MySQL Error: {str(e)}")
        return jsonify({'error': '数据库错误'}), 500
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({'error': '服务器错误'}), 500

@app.route('/favorites', methods=['POST'])
def add_favorite():
    try:
        data = request.json
        if not data:
            return jsonify({'error': '请求体不能为空'}), 400
        
        user_id = data.get('user_id')
        house_id = data.get('house_id')

        if not user_id or not house_id:
            return jsonify({'error': 'user_id 和 house_id 是必填项'}), 400
        
        if not isinstance(user_id, int) or not isinstance(house_id, int):
            return jsonify({'error': 'user_id 和 house_id 必须是整数'}), 400

        with mysql.connector.connect(**db_config) as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(
                    "SELECT id FROM favorites WHERE user_id = %s AND house_id = %s",
                    (user_id, house_id)
                )
                existing = cursor.fetchone()
                if existing:
                    return jsonify({'error': '该收藏已存在'}), 400

                cursor.execute(
                    "INSERT INTO favorites (user_id, house_id) VALUES (%s, %s)",
                    (user_id, house_id)
                )
                conn.commit()
        
        return jsonify({'message': '收藏成功'}), 201

    except mysql.connector.Error as e:
        logger.error(f"MySQL Error: {str(e)}")
        return jsonify({'error': '数据库错误'}), 500
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({'error': '服务器错误'}), 500

@app.route('/routes', methods=['GET'])
def list_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        methods = ', '.join(rule.methods)
        routes.append(f"{rule} -> {methods}")
    return "<br>".join(routes)

@app.route('/api/daily-houses/stats', methods=['GET'])
def get_daily_houses_stats():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT COUNT(*) as total_count FROM daily_new"
        cursor.execute(query)
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'todayCount': result['total_count'] if result else 0,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error getting daily houses stats: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/daily-houses/list', methods=['POST'])
def get_daily_houses_list():
    try:
        filters = request.json
        logger.info(f"Received filters for daily houses: {filters}")
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        query = """
        SELECT 
            `Price`,
            `House Type`,
            `Number of Bedrooms`,
            `Number of Bathrooms`,
            `Number of Parkings`,
            `Address Line 1`,
            `Address Line 2`,
            `Average Score`,
            `Commute Time`,
            `Available Date`,
            `website`,
            `Keywords`
        FROM daily_new 
        WHERE 1=1
        """
        params = []
        
        if filters.get('price_min'):
            query += " AND `Price` >= %s"
            params.append(float(filters['price_min']))
        if filters.get('price_max'):
            query += " AND `Price` <= %s"
            params.append(float(filters['price_max']))
        
        if filters.get('bedrooms_min'):
            query += " AND `Number of Bedrooms` >= %s"
            params.append(int(filters['bedrooms_min']))
        if filters.get('bedrooms_max'):
            query += " AND `Number of Bedrooms` <= %s"
            params.append(int(filters['bedrooms_max']))
        
        if filters.get('bathrooms'):
            query += " AND `Number of Bathrooms` >= %s"
            params.append(int(filters['bathrooms']))
        
        if filters.get('address2'):
            query += " AND `Address Line 2` = %s"
            params.append(filters['address2'])
        
        if filters.get('house_type'):
            house_types = filters['house_type'].split(',')
            placeholders = ','.join(['%s'] * len(house_types))
            query += f" AND `House Type` IN ({placeholders})"
            params.extend(house_types)
        
        if filters.get('min_score'):
            query += " AND `Average Score` >= %s"
            params.append(float(filters['min_score']))
        
        if filters.get('commute_time_min'):
            query += " AND `Commute Time` >= %s"
            params.append(int(filters['commute_time_min']))
        if filters.get('commute_time_max'):
            query += " AND `Commute Time` <= %s"
            params.append(int(filters['commute_time_max']))
        
        if filters.get('keywords'):
            query += " AND (`Keywords` LIKE %s)"
            params.append(f"%{filters['keywords']}%")
            
        if filters.get('available_date'):
            query += " AND DATE(`Available Date`) >= DATE(%s)"
            params.append(filters['available_date'])
        
        query += " ORDER BY `Average Score` DESC"
        
        logger.info(f"Executing query: {query}")
        logger.info(f"Query params: {params}")
        
        cursor.execute(query, params)
        houses = cursor.fetchall()
        
        for house in houses:
            if house.get('Available Date'):
                house['Available Date'] = str(house['Available Date'])
        
        cursor.close()
        conn.close()
        
        logger.info(f"Found {len(houses)} houses")
        return jsonify(houses)
        
    except Exception as e:
        logger.error(f"Error getting daily houses list: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False,
            'message': '获取房源列表失败'
        }), 500

# DeepSeek配置
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

SYSTEM_PROMPT = """作为专业租房申请信生成器，你需要：
1. 生成自然流畅的中英双语信件（分开生成），遵循以下结构：
   - 个人信息与租房意向
   - 租赁条款提议（租期、入住时间、租金）
   - 教育/职业背景-主要介绍学制等信息，表明能在澳洲停留多久，强调稳定性
   - 详细居住历史（时间、地址、租期）--如果没有外国租房历史，则选择性忽略
   - 财务证明（具体金额、存款证明类型，父母担保）
   - 合租人信息（关系、背景-这里需要强调稳定性）
   - 生活习性与房屋维护承诺
   - 文件清单（COE、签证、存款证明等）-添加材料增强可信度

2. 内容要求：
   - 使用真实数据替代占位符
   - 包含具体数值（金额、日期、租期）
   - 不要使用非提供的数据，不要编造信息，所有要素都需要基于用户提供的数据
   - 强调财务稳定性证明（父母担保+银行存款组合）

3. 语气规范：
   - 专业但亲切（避免刻板模板）
   - 突出责任感与长期居住意愿
   - 使用主动语态（I will.../I have...）"""

@app.route('/api/generate-rental-letter', methods=['POST'])
def generate_letter():
    try:
        data = request.json
        
        required_fields = ['basicInfo', 'livingPlan']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing {field} in request"}), 400

        user_prompt = build_user_prompt(data)
        
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 5000
        }

        response = requests.post(
            DEEPSEEK_URL, 
            json=payload, 
            headers=headers, 
            timeout=120
        )
        
        if response.status_code != 200:
            return jsonify({
                "success": False,
                "error": f"DeepSeek API错误: {response.text}"
            }), response.status_code
        
        content = response.json()['choices'][0]['message']['content']
        processed_content = re.sub(r'(AUD \d+)', r'**\1**', content)
        
        resp = jsonify({
            "success": True,
            "letter": processed_content,
            "usage": response.json().get('usage', {})
        })
        resp.headers.add('Access-Control-Allow-Origin', '*')
        resp.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return resp
        
    except requests.Timeout:
        return jsonify({
            "success": False,
            "error": "请求超时，请稍后重试"
        }), 504
    except requests.RequestException as e:
        return jsonify({
            "success": False,
            "error": f"网络请求错误: {str(e)}"
        }), 500
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}"
        }), 500

def build_user_prompt(data):
    try:
        basic_info = data.get('basicInfo', {})
        living_plan = data.get('livingPlan', {})
        background = data.get('background', {})
        financial = data.get('financial', {})
        
        prompt = f"""Generate a rental application letter including:
[Personal Story]
- {basic_info.get('nameEn')} from {basic_info.get('nationality', 'China')}
- {basic_info.get('university')} student majoring in {basic_info.get('major')}
- Study period: {basic_info.get('studyStart')} to {basic_info.get('studyEnd')}

[Rental History]
{format_rental_history(background.get('rentalHistory', []))}

[Financial Capacity]
- Weekly budget: AUD {living_plan.get('rentBudget')}
- Funds breakdown:
  * Parental support: AUD {financial.get('parentalSupport', '0')}
  * Scholarship: AUD {financial.get('scholarship', '0')}
  * Part-time income: AUD {financial.get('partTimeIncome', '0')}
- Deposit proof: 
  * {financial.get('depositType', 'Bank statement')} of AUD {financial.get('depositAmount', '0')}
  * Parental guarantee letter included: {'Yes' if financial.get('hasParentalLetter') else 'No'}

[Lifestyle]
{format_traits(background.get('traits', {}))}

[Co-tenant Info]
{format_cotenants(background.get('coTenants', []))}

[Special Requests]
{living_plan.get('specialRequests', 'No special requirements')}

请生成只使用真实数据（没有的话可以留白）、展现申请人独特优势的申请信。生成中英双语信件（分开来生成），避免模板化表达。"""
        
        return prompt
        
    except Exception as e:
        logger.error(f"Error building prompt: {str(e)}")
        raise ValueError("Failed to build prompt from provided data")

def format_rental_history(history):
    if not history:
        return "No previous rental history"
    return "\n".join([
        f"{i+1}. {item.get('address', '')}: {item.get('duration', '')} months"
        f"({'Reference available' if item.get('reference') else ''})"
        for i, item in enumerate(history)
    ])

def format_traits(traits):
    if not traits:
        return "No specific traits provided"
    trait_list = [k for k, v in traits.items() if v]
    return "\n".join([f"- {trait}" for trait in trait_list])

def format_cotenants(cotenants):
    if not cotenants:
        return "No co-tenants"
    return "\n".join([
        f"- {cotenant.get('nameEn')} ({cotenant.get('relationship')})"
        f"\n  {cotenant.get('university', 'No university')} student"
        f"\n  Contact: {cotenant.get('email', 'No email')}"
        f"\n  Support: AUD {cotenant.get('supportAmount', '0')}/week"
        for cotenant in cotenants
    ])

# ---------------------------
# 9.1 新增USYD附近房源查询接口
# ---------------------------
@app.route('/api/data/usyd', methods=['GET'])
def get_usyd_data():
    try:
        price_min = request.args.get('price_min', type=float)
        price_max = request.args.get('price_max', type=float)
        bedrooms_min = request.args.get('bedrooms_min', type=float)
        bedrooms_max = request.args.get('bedrooms_max', type=float)
        min_bathrooms = request.args.get('bathrooms', type=float)
        min_parkings = request.args.get('parkings', type=float)
        house_type = request.args.get('house_type', type=str)
        commute_time_min = request.args.get('commute_time_min', type=float)
        commute_time_max = request.args.get('commute_time_max', type=float)
        available_date = request.args.get('available_date', type=str)
        keywords = request.args.get('keywords', type=str)
        
        suburbs = request.args.getlist('Address Line 2')
        logger.info(f"[USYD接口] 接收到的区域参数: {suburbs}")
        
        query = """
            SELECT SQL_CALC_FOUND_ROWS 
                   Price,
                   Address Line 1,
                   Address Line 2,
                   Number of Bedrooms,
                   Number of Bathrooms,
                   Number of Parkings,
                   House Type,
                   Commute Time,
                   Available Date,
                   Keywords,
                   Average Score,
                   website
            FROM Q_rent_cleaned_with_commute_usyd
            WHERE 1=1
        """
        params = []

        if suburbs:
            placeholders = ','.join(['%s'] * len(suburbs))
            query += f" AND Address Line 2 IN ({placeholders})"
            params.extend(suburbs)
            logger.info(f"Adding suburb filter: {suburbs}")
        if price_min:
            query += " AND Price >= %s"
            params.append(price_min)
        if price_max:
            query += " AND Price <= %s"
            params.append(price_max)
        if bedrooms_min:
            query += " AND Number of Bedrooms >= %s"
            params.append(bedrooms_min)
        if bedrooms_max:
            query += " AND Number of Bedrooms <= %s"
            params.append(bedrooms_max)
        if min_bathrooms:
            query += " AND Number of Bathrooms >= %s"
            params.append(min_bathrooms)
        if min_parkings:
            query += " AND Number of Parkings >= %s"
            params.append(min_parkings)
        if house_type:
            house_types = house_type.split(',')
            placeholders = ','.join(['%s'] * len(house_types))
            query += f" AND House Type IN ({placeholders})"
            params.extend(house_types)
        if commute_time_min:
            query += " AND Commute Time >= %s"
            params.append(commute_time_min)
        if commute_time_max:
            query += " AND Commute Time <= %s"
            params.append(commute_time_max)
        if keywords:
            query += " AND (Keywords LIKE %s)"
            params.append(f"%{keywords}%")

        if available_date:
            query += " AND DATE(Available Date) >= DATE(%s)"
            params.append(available_date)

        query += " ORDER BY Average Score DESC"
        
        page = request.args.get('page', default=1, type=int)
        page_size = request.args.get('page_size', default=10, type=int)
        offset = (page - 1) * page_size
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])

        logger.info(f"Final SQL query: {query}")
        logger.info(f"Query parameters: {params}")
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(query, params)
        houses = cursor.fetchall()
        
        cursor.execute("SELECT FOUND_ROWS() as total")
        total_records = cursor.fetchone()['total']
        
        total_pages = (total_records + page_size - 1) // page_size

        for house in houses:
            if house.get('Available Date'):
                house['Available Date'] = str(house['Available Date'])

        cursor.close()
        conn.close()

        return jsonify({
            'data': houses,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'total_records': total_records
        })

    except Exception as e:
        logger.error(f"[USYD接口] 数据获取错误: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/daily-houses/usyd/stats', methods=['GET'])
def get_usyd_daily_houses_stats():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT COUNT(*) as total_count FROM daily_new_usyd"
        cursor.execute(query)
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'todayCount': result['total_count'] if result else 0,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"[USYD接口] 获取每日新房统计错误: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/daily-houses/usyd/list', methods=['POST'])
def get_usyd_daily_houses_list():
    try:
        filters = request.json
        logger.info(f"[USYD接口] 接收到的每日新房筛选条件: {filters}")
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        query = """
        SELECT 
            `Price`,
            `House Type`,
            `Number of Bedrooms`,
            `Number of Bathrooms`,
            `Number of Parkings`,
            `Address Line 1`,
            `Address Line 2`,
            `Average Score`,
            `Commute Time`,
            `Available Date`,
            `website`,
            `Keywords`
        FROM daily_new_usyd
        WHERE 1=1
        """
        params = []
        
        if filters.get('price_min'):
            query += " AND `Price` >= %s"
            params.append(float(filters['price_min']))
        if filters.get('price_max'):
            query += " AND `Price` <= %s"
            params.append(float(filters['price_max']))
        
        if filters.get('bedrooms_min'):
            query += " AND `Number of Bedrooms` >= %s"
            params.append(int(filters['bedrooms_min']))
        if filters.get('bedrooms_max'):
            query += " AND `Number of Bedrooms` <= %s"
            params.append(int(filters['bedrooms_max']))
        
        if filters.get('bathrooms'):
            query += " AND `Number of Bathrooms` >= %s"
            params.append(int(filters['bathrooms']))
        
        if filters.get('address2'):
            query += " AND `Address Line 2` = %s"
            params.append(filters['address2'])
        
        if filters.get('house_type'):
            house_types = filters['house_type'].split(',')
            placeholders = ','.join(['%s'] * len(house_types))
            query += f" AND `House Type` IN ({placeholders})"
            params.extend(house_types)
        
        if filters.get('min_score'):
            query += " AND `Average Score` >= %s"
            params.append(float(filters['min_score']))
        
        if filters.get('commute_time_min'):
            query += " AND `Commute Time` >= %s"
            params.append(int(filters['commute_time_min']))
        if filters.get('commute_time_max'):
            query += " AND `Commute Time` <= %s"
            params.append(int(filters['commute_time_max']))
        
        if filters.get('keywords'):
            query += " AND (`Keywords` LIKE %s)"
            params.append(f"%{filters['keywords']}%")
            
        if filters.get('available_date'):
            query += " AND DATE(`Available Date`) >= DATE(%s)"
            params.append(filters['available_date'])
        
        query += " ORDER BY `Average Score` DESC"
        
        logger.info(f"[USYD接口] 执行查询: {query}")
        logger.info(f"[USYD接口] 查询参数: {params}")
        
        cursor.execute(query, params)
        houses = cursor.fetchall()
        
        for house in houses:
            if house.get('Available Date'):
                house['Available Date'] = str(house['Available Date'])
        
        cursor.close()
        conn.close()
        
        logger.info(f"[USYD接口] 找到 {len(houses)} 条新房数据")
        return jsonify(houses)
        
    except Exception as e:
        logger.error(f"[USYD接口] 获取每日新房列表错误: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False,
            'message': '获取房源列表失败'
        }), 500

# ---------------------------
# 以下为需要 JWT 验证的三个接口
# ---------------------------

# 1. 定义一个 jwt_required 装饰器
def jwt_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        # 从请求头中获取 Authorization: Bearer <token>
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"success": False, "error": "缺少JWT Token"}), 401

        try:
            # 在解码前打印接收到的token
            logger.info(f"Received token: {token}")
            decoded = jwt.decode(token, app.secret_key, algorithms=["HS256"])
            logger.info(f"Decoded payload: {decoded}")
            # 获取 JWT 中的 user_id
            current_user_id = decoded.get('user_id')
            if not current_user_id:
                return jsonify({"success": False, "error": "无效的 Token 信息"}), 401
        except jwt.ExpiredSignatureError as e:
            logger.error(f"Token已过期: {str(e)}")
        except Exception as e:
            logger.error(f"Token验证失败: {str(e)}")

        # 在调用被装饰的函数时，将 user_id 作为第一个参数传递
        return f(current_user_id, *args, **kwargs)
    return decorated_function

# 保存订阅设置（POST）
@app.route('/api/subscriptions', methods=['POST'])
@jwt_required
def save_subscription(user_id):
    try:
        print(f"收到订阅请求 from user {user_id}")
        print("请求数据:", request.json)
        data = request.json
        
        if not isinstance(data, dict):
            return jsonify({'success': False, 'error': '无效的 JSON 格式'}), 400
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO user_subscriptions (user_id, filter_conditions)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE filter_conditions = VALUES(filter_conditions);
        """, (user_id, json.dumps(data)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': '订阅设置已保存'})
        
    except Exception as e:
        logger.error(f"保存订阅设置失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# 获取订阅设置（GET）
@app.route('/api/subscriptions', methods=['GET'])
@jwt_required
def get_subscription(user_id):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT filter_conditions 
            FROM user_subscriptions 
            WHERE user_id = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': json.loads(result['filter_conditions']) if result else {}
        })
            
    except Exception as e:
        logger.error(f"获取订阅设置失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# 删除订阅设置（DELETE）
@app.route('/api/subscriptions', methods=['DELETE'])
@jwt_required
def delete_subscription(user_id):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM user_subscriptions 
            WHERE user_id = %s
        """, (user_id,))
        
        conn.commit()
        deleted_rows = cursor.rowcount
        
        cursor.close()
        conn.close()
        
        if deleted_rows == 0:
            return jsonify({'success': False, 'message': '未找到订阅记录'}), 404
        
        return jsonify({'success': True, 'message': '订阅设置已删除'})
        
    except Exception as e:
        logger.error(f"删除订阅设置失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ---------------------------
# 启动应用
# ---------------------------
if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('API_PORT', '5000')),
        debug=True
    )
