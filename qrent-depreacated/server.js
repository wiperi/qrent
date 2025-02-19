const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: [
        'http://localhost:2781',
        'http://localhost:5000',
        'http://134.175.168.147:2781',
        'http://134.175.168.147:5000',
        'http://134.175.168.147',
        'http://www.qrent.com.cn'  // 添加新域名
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// 添加静态文件服务
app.use(express.static(path.join(__dirname)));

// 使用环境变量进行数据库配置
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT)
};

const pool = mysql.createPool(dbConfig);

// 在创建连接池后添加测试代码
pool.getConnection()
    .then(connection => {
        console.log('数据库连接成功');
        connection.release();
    })
    .catch(err => {
        console.error('数据库连接失败:', err);
    });

// 验证Token的中间件
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: '未提供认证token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const connection = await pool.getConnection();

        try {
            // 检查token是否在有效会话中
            const [sessions] = await connection.execute(
                'SELECT * FROM user_sessions WHERE user_id = ? AND token = ? AND expires_at > NOW()',
                [decoded.userId, token]
            );

            if (sessions.length === 0) {
                return res.status(401).json({ error: '会话已过期，请重新登录' });
            }

            req.user = decoded;
            next();
        } finally {
            connection.release();
        }
    } catch (error) {
        return res.status(403).json({ error: '无效的token' });
    }
};

// 主页路由
app.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

// AI聊天路由
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "No message provided" });
        }

        console.log('Received chat request with message:', message);
        console.log('Using API key:', process.env.ALIYUN_API_KEY ? 'Present' : 'Missing');

        if (!process.env.ALIYUN_API_KEY) {
            throw new Error('ALIYUN_API_KEY is not configured');
        }

        // 调用阿里云API
        console.log('Sending request to Aliyun API...');
        const response = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
            {
                model: 'qwen-plus',
                input: {
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个专业的租房助手，可以帮助用户解答关于租房的各种问题。'
                        },
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.ALIYUN_API_KEY}`
                }
            }
        );

        console.log('Received response from Aliyun API:', response.data);

        // 格式化响应
        const formatted_response = {
            choices: [
                {
                    message: {
                        content: response.data.output.text || response.data.text || '抱歉，我暂时无法回答您的问题。'
                    }
                }
            ]
        };

        console.log('Sending formatted response:', formatted_response);
        res.json(formatted_response);
    } catch (error) {
        console.error('Chat API Error Details:');
        if (error.response) {
            // 请求已发出，但服务器响应状态码不在 2xx 范围内
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            // 请求已发出，但没有收到响应
            console.error('No response received:', error.request);
        } else {
            // 设置请求时发生的错误
            console.error('Error setting up request:', error.message);
        }
        console.error('Error config:', error.config);
        console.error('Full error:', error);

        res.status(500).json({
            error: "Internal Server Error",
            message: error.response?.data?.message || error.message,
            details: error.response?.data || 'No additional details available'
        });
    }
});

// 记录访问接口
app.post('/api/record-visit', async (req, res) => {
    try {
        const { page_url, referrer, user_agent } = req.body;
        const ip_address = req.ip;

        const connection = await pool.getConnection();
        
        await connection.execute(
            'INSERT INTO visit_logs (ip_address, user_agent, page_url, referrer) VALUES (?, ?, ?, ?)',
            [ip_address, user_agent, page_url, referrer]
        );

        connection.release();
        res.status(200).json({ message: '访问记录成功' });
    } catch (error) {
        console.error('记录访问失败:', error);
        res.status(500).json({ error: '记录访问失败' });
    }
});

// 获取访问统计接口
app.get('/api/visit-stats', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        // 获取总访问量
        const [totalRows] = await connection.execute(
            'SELECT COUNT(*) as total FROM visit_logs'
        );
        
        // 获取今日访问量
        const [todayRows] = await connection.execute(
            'SELECT COUNT(*) as today FROM visit_logs WHERE visit_date = CURDATE()'
        );

        connection.release();

        res.json({
            total: totalRows[0].total,
            today: todayRows[0].today
        });
    } catch (error) {
        console.error('数据库错误:', error);
        res.status(500).json({ 
            error: '获取统计数据失败',
            details: error.message
        });
    }
});

// 用户注册接口
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证必填字段
        if (!username || !email || !password) {
            return res.status(400).json({ error: '用户名、邮箱和密码都是必填的' });
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: '邮箱格式不正确' });
        }

        // 验证密码强度
        if (password.length < 6) {
            return res.status(400).json({ error: '密码长度至少为6位' });
        }

        const connection = await pool.getConnection();

        try {
            // 检查邮箱和用户名是否已存在
            const [existingUsers] = await connection.execute(
                'SELECT id FROM users WHERE email = ? OR username = ?',
                [email, username]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ error: '该邮箱或用户名已被注册' });
            }

            // 密码加密
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // 插入用户数据，确保包含 username
            const [result] = await connection.execute(
                'INSERT INTO users (username, email, password, created_at, updated_at, status) VALUES (?, ?, ?, NOW(), NOW(), ?)',
                [username, email, hashedPassword, 'active']
            );

            // 生成JWT token
            const token = jwt.sign(
                { userId: result.insertId, email, username },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            // 记录用户会话
            await connection.execute(
                'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
                [result.insertId, token]
            );

            res.status(201).json({
                message: '注册成功',
                token,
                user: {
                    id: result.insertId,
                    username,
                    email
                }
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ error: '注册失败，请稍后重试' });
    }
});

// 用户登录接口
app.post('/api/login', async (req, res) => {
    try {
        console.log('登录请求body:', req.body);
        console.log('请求头:', req.headers);
        const { username, password } = req.body;
        
        // 修改验证逻辑，允许username字段包含邮箱
        if ((!username || !password) || (typeof username !== 'string' || typeof password !== 'string')) {
            return res.status(400).json({ error: "用户名/邮箱和密码都是必填的" });
        }

        const connection = await pool.getConnection();
        
        try {
            // 修改查询语句的字段名
            const [users] = await connection.execute(
                `SELECT * FROM users 
                WHERE username = ? OR email = ?`,
                [username, username]
            );

            if (users.length === 0) {
                return res.status(401).json({ error: "用户名/邮箱或密码错误" });
            }

            const user = users[0];
            
            // 验证密码
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: "用户名/邮箱或密码错误" });
            }

            // 生成JWT token
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // 保存会话到数据库
            await connection.execute(
                'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
                [user.id, token]
            );

            res.json({
                message: '登录成功',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ error: '登录失败，请稍后重试' });
    }
});

// 用户登出接口
app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        try {
            // 清除用户的会话
            await connection.execute(
                'DELETE FROM user_sessions WHERE user_id = ? AND token = ?',
                [req.user.userId, req.headers['authorization'].split(' ')[1]]
            );

            res.json({ message: '登出成功' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('登出失败:', error);
        res.status(500).json({ error: '登出失败，请稍后重试' });
    }
});

// 获取用户信息接口
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        try {
            const [users] = await connection.execute(
                'SELECT id, email, created_at, status FROM users WHERE id = ?',
                [req.user.userId]
            );

            if (users.length === 0) {
                return res.status(404).json({ error: '用户不存在' });
            }

            res.json(users[0]);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

// 添加保存租赁信件的路由
app.post('/save-rental-letter', (req, res) => {
  try {
    const letterData = req.body;
    // 这里添加保存信件的逻辑
    // 例如保存到数据库或文件系统
    
    res.json({ success: true, message: '信件保存成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '保存失败：' + error.message });
  }
});

// 修改 DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";  // 更新 API URL

// 增强版系统提示词
const SYSTEM_PROMPT = `作为专业租房申请信生成器，你需要：
1. 生成自然流畅的中英双语信件，遵循以下结构：
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
   - 使用主动语态（I will.../I have...）`;

// 增强版用户提示词构建函数
function buildUserPrompt(formData) {
    const { basicInfo, livingPlan, background, financial } = formData;
    
    return `Generate a rental application letter including:
[Personal Story]
- ${basicInfo.nameEn} from ${basicInfo.nationality || 'China'}
- ${basicInfo.university} student majoring in ${basicInfo.major}
- Study period: ${basicInfo.studyStart} to ${basicInfo.studyEnd}

[Rental History]
${(background?.rentalHistory || []).map((item, index) => 
`${index + 1}. ${item.startDate} - ${item.endDate}: ${item.address}
   (${item.duration} months, ${item.reference ? 'Reference available' : 'No reference'})`
).join('\n')}

[Financial Capacity]
- Weekly budget: AUD ${livingPlan.rentBudget}
- Funds breakdown:
  * Parental support: AUD ${financial?.parentalSupport || '0'}
  * Scholarship: AUD ${financial?.scholarship || '0'} 
  * Part-time income: AUD ${financial?.partTimeIncome || '0'}
- Deposit proof: 
  * ${financial?.depositType || 'Bank statement'} of AUD ${financial?.depositAmount}
  * Parental guarantee letter included: ${financial?.hasParentalLetter ? 'Yes' : 'No'}

[Lifestyle]
${Object.entries(background?.traits || {}).filter(([_,v]) => v).map(([k]) => 
`- ${k.replace(/([A-Z])/g, ' $1').trim()}`).join('\n')}

[Co-tenant Info]
${background?.coTenants?.map(t => 
`- ${t.nameEn} (${t.relationship}), ${t.university} student
  Contact: ${t.email} | Support: AUD ${t.supportAmount}/week`
).join('\n') || 'None'}

[Special Requests]
${livingPlan.specialRequests || 'No special requirements'}

请生成使用真实数据、展现申请人独特优势的申请信。使用自然口语化的商务英语（生成中英双语，分开生成），避免模板化表达。`;
}

// 修改 generate-rental-letter 路由处理
app.post('/api/generate-rental-letter', async (req, res) => {
    try {
        const response = await axios.post(
            'http://134.175.168.147:5000/api/generate-rental-letter',
            req.body,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('代理请求失败:', error);
        res.status(500).json({
            error: "代理请求失败",
            message: error.response?.data?.message || error.message
        });
    }
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// 启动服务器
const PORT = process.env.PORT || 2781;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
