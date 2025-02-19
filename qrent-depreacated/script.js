// 工具切换功能
function openTool(toolId) {
    // 隐藏所有工具内容
    document.querySelectorAll('.tool-content').forEach(tool => {
        tool.classList.remove('active');
    });
    
    // 显示选中的工具内容
    document.getElementById(toolId + 'Tool').classList.add('active');
    
    // 更新按钮状态
    document.querySelectorAll('.process-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="openTool('${toolId}')"]`).classList.add('active');

    // 如果是预算计算器，自动计算
    if (toolId === 'budget') {
        simpleCalculate();
    }
}

// AI 助手相关函数
function askQuestion(question) {
    const chatInput = document.getElementById('chatInput');
    chatInput.value = question;
    sendMessage();
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    if (!message) return;

    const chatMessages = document.getElementById('chatMessages');
    
    // 添加用户消息
    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    userMessage.textContent = message;
    chatMessages.appendChild(userMessage);
    
    // 清空输入框并重置高度
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // 添加等待消息
    const waitingMessage = document.createElement('div');
    waitingMessage.className = 'message ai waiting';
    waitingMessage.textContent = '正在思考...';
    chatMessages.appendChild(waitingMessage);
    
    // 调用 AI API
    callAIAPI(message);
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 自动调整输入框高度
document.getElementById('chatInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// 添加回车发送功能
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// 格式化数字
function formatNumber(num) {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 预算计算器计算逻辑
function simpleCalculate(sourceInput) {
    const rentRatio = parseFloat(document.getElementById('rentRatio').value.replace(/,/g, '')) || 0;
    const exchangeRate = parseFloat(document.getElementById('exchangeRate').value.replace(/,/g, '')) || 0;
    const courseCount = 8; // 固定课程数量为8
    const courseFee = parseFloat(document.getElementById('courseFee').value.replace(/,/g, '')) || 0;
    const totalCostCNY = parseFloat(document.getElementById('totalCostCNY').value.replace(/,/g, '')) || 0;
    const weeklyRent = parseFloat(document.getElementById('weeklyRent').value.replace(/,/g, '')) || 0;
    const weeklyLiving = parseFloat(document.getElementById('weeklyLiving').value.replace(/,/g, '')) || 0;
    
    const totalTuition = courseCount * courseFee;
    const totalTuitionCNY = totalTuition * exchangeRate;

    if (sourceInput === 'weeklyLiving') {
        // 从每周生活费倒算房租和总支出
        const yearlyLiving = weeklyLiving * 52;
        const yearlyRent = yearlyLiving / ((1 - rentRatio / 100) / (rentRatio / 100));
        const newWeeklyRent = yearlyRent / 52;
        const totalLivingCostAUD = yearlyLiving + yearlyRent;
        const totalLivingCostCNY = totalLivingCostAUD * exchangeRate;
        const newTotalCostCNY = totalLivingCostCNY + totalTuitionCNY;

        document.getElementById('weeklyRent').value = formatNumber(newWeeklyRent);
        document.getElementById('totalCostCNY').value = formatNumber(newTotalCostCNY);

        updateResult(newTotalCostCNY, yearlyRent, totalLivingCostCNY, totalTuitionCNY, weeklyLiving, exchangeRate);
    } else if (sourceInput === 'weeklyRent') {
        // 从每周房租正算总支出和生活费
        const yearlyRent = weeklyRent * 52;
        const totalLivingCostAUD = yearlyRent / (rentRatio / 100);
        const newWeeklyLiving = (totalLivingCostAUD - yearlyRent) / 52;
        const totalLivingCostCNY = totalLivingCostAUD * exchangeRate;
        const newTotalCostCNY = totalLivingCostCNY + totalTuitionCNY;
        
        document.getElementById('weeklyLiving').value = formatNumber(newWeeklyLiving);
        document.getElementById('totalCostCNY').value = formatNumber(newTotalCostCNY);
        
        updateResult(newTotalCostCNY, yearlyRent, totalLivingCostCNY, totalTuitionCNY, newWeeklyLiving, exchangeRate);
    } else {
        // 从总支出倒算每周房租和生活费
        const totalLivingCostCNY = totalCostCNY - totalTuitionCNY;
        const totalLivingCostAUD = totalLivingCostCNY / exchangeRate;
        const yearlyRent = totalLivingCostAUD * (rentRatio / 100);
        const newWeeklyRent = yearlyRent / 52;
        const newWeeklyLiving = (totalLivingCostAUD - yearlyRent) / 52;
        
        document.getElementById('weeklyRent').value = formatNumber(newWeeklyRent);
        document.getElementById('weeklyLiving').value = formatNumber(newWeeklyLiving);
        
        updateResult(totalCostCNY, yearlyRent, totalLivingCostCNY, totalTuitionCNY, newWeeklyLiving, exchangeRate);
    }
}

function updateResult(totalCostCNY, yearlyRent, totalLivingCostCNY, totalTuitionCNY, weeklyLiving, exchangeRate) {
    document.getElementById('simpleResult').innerHTML = `
        <h4>预算结果</h4>
        <p>年度总支出：${formatNumber(totalCostCNY)} CNY</p>
        <p>其中：</p>
        <p>- 房租支出：${formatNumber(yearlyRent * exchangeRate)} CNY</p>
        <p>- 生活费支出：${formatNumber(totalLivingCostCNY - yearlyRent * exchangeRate)} CNY</p>
        <p>- 学费支出：${formatNumber(totalTuitionCNY)} CNY</p>
    `;
}

// 为所有输入框添加千分位格式化
document.querySelectorAll('.input-group input').forEach(input => {
    input.addEventListener('input', function(e) {
        // 只保留数字和逗号
        let value = this.value.replace(/[^\d,]/g, '');
        // 移除所有逗号后解析
        value = value.replace(/,/g, '');
        if (value) {
            // 限制输入长度
            if (value.length > 10) {
                value = value.slice(0, 10);
            }
            const formattedValue = formatNumber(parseInt(value));
            this.value = formattedValue;
        }
    });
});

// 页面加载时默认打开预算计算器
document.addEventListener('DOMContentLoaded', () => {
    openTool('budget');
}); 