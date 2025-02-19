document.addEventListener('DOMContentLoaded', function() {
    // 在全局作用域声明currentSchool
    window.currentSchool = 'unsw';

    // 初始化日期选择器
    flatpickr("#availableDate", {
        dateFormat: "Y-m-d",
        minDate: "today"
    });

    // 更新房屋评分显示和监听
    const scoreSlider = document.getElementById('minScore');
    const scoreValue = document.getElementById('scoreValue');
    if (scoreSlider) {
        // 更新显示
        scoreSlider.addEventListener('input', function() {
            scoreValue.textContent = this.value;
            // 触发筛选
            loadHouses();
        });
    }

    // 获取今日日期
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    // 更新统计信息
    updateStatsBanner();

    // 初始加载房源
    loadHouses();

    // 区域选择监听
    const allSuburbsCheckbox = document.querySelector('input[name="suburb"][value="all"]');
    const suburbCheckboxes = document.querySelectorAll('input[name="suburb"]:not([value="all"])');

    // "不限"选项的点击处理
    if (allSuburbsCheckbox) {
        allSuburbsCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                // 如果选中"不限"，取消其他所有选项
                suburbCheckboxes.forEach(cb => {
                    cb.checked = false;
                });
            }
            loadHouses();
        });
    }

    // 其他区域选项的点击处理
    suburbCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async () => {
            console.log('区域选择变化：', checkbox.value, checkbox.checked);
            
            // 如果选中任何具体区域，取消"不限"选项
            if (checkbox.checked) {
                allSuburbsCheckbox.checked = false;
            } 
            // 如果没有任何区域被选中，自动选中"不限"
            else if (!Array.from(suburbCheckboxes).some(cb => cb.checked)) {
                allSuburbsCheckbox.checked = true;
            }

            try {
                await loadHouses();
                console.log('房源加载完成');
            } catch (error) {
                console.error('房源加载失败:', error);
            }
        });
    });

    // 其他输入框的监听
    ['priceMin', 'priceMax', 'bedroomsMin', 'bedroomsMax'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', loadHouses);
        }
    });

    // 下拉框监听
    const bathrooms = document.getElementById('bathrooms');
    if (bathrooms) {
        bathrooms.addEventListener('change', loadHouses);
    }

    // 房屋类型监听
    document.querySelectorAll('input[name="house_type"]').forEach(checkbox => {
        checkbox.addEventListener('change', loadHouses);
    });

    // 通勤时间监听
    ['commuteMin', 'commuteMax'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', loadHouses);
        }
    });

    // 关键词搜索使用防抖
    const keywords = document.getElementById('keywords');
    if (keywords) {
        keywords.addEventListener('input', debounce(loadHouses, 500));
    }

    // 监听学校选择变化
    document.getElementById('targetSchool').addEventListener('change', function(e) {
        window.currentSchool = e.target.value;
        console.log('切换学校至:', window.currentSchool);
        initSuburbOptions();
        currentPage = 1;
        loadHouses();
    });

    // 检查登录状态
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 更新订阅按钮状态
    const updateSubscriptionUI = () => {
        const subContent = document.querySelector('.subscription-content');
        const subLocked = document.querySelector('.subscription-locked');
        
        if (token && user) {
            subContent && subContent.classList.remove('hidden');
            subLocked && subLocked.classList.add('hidden');
        } else {
            subContent && subContent.classList.add('hidden');
            subLocked && subLocked.classList.remove('hidden');
        }
    };
    
    updateSubscriptionUI();
    
    // 监听storage变化
    window.addEventListener('storage', updateSubscriptionUI);

    // 新增：检查订阅状态
    checkSubscription();
});

// 修改API基础地址获取方式
async function getApiBaseUrl() {
    // 从环境配置获取或写死生产环境地址
    return 'http://134.175.168.147:5000';
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 修改统计信息请求
async function updateStatsBanner(filteredCount = null) {
    try {
        const baseUrl = await getApiBaseUrl();
        const endpoint = window.currentSchool === 'unsw' 
            ? '/api/daily-houses/stats' 
            : '/api/daily-houses/usyd/stats';
        
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        const countElement = document.getElementById('todayUpdateCount');
        const unitElement = document.querySelector('.stats-unit');
        
        if (filteredCount !== null) {
            // 显示筛选后的数量
            countElement.textContent = filteredCount;
            unitElement.textContent = `套房源符合条件（共${data.todayCount}套）`;
        } else {
            // 显示总数量
            countElement.textContent = data.todayCount || 0;
            unitElement.textContent = '套房源今日更新';
        }
    } catch (error) {
        console.error('获取统计信息失败:', error);
        document.getElementById('todayUpdateCount').textContent = '0';
    }
}

// 添加区域名称映射
const SUBURB_MAPPING = {
    'City': 'Sydney',
    'WolliCreek': 'Wolli',
    'Wollicreek': 'Wolli',
    // 可以继续添加其他需要映射的区域
};

// 修改房源列表请求
async function loadHouses() {
    const housingList = document.getElementById('housingList');
    
    // 获取筛选条件
    const allSuburbsSelected = document.querySelector('input[name="suburb"][value="all"]')?.checked;
    let selectedSuburbs = allSuburbsSelected 
        ? [] 
        : Array.from(document.querySelectorAll('input[name="suburb"]:checked:not([value="all"])'))
            .map(cb => cb.value);

    // 进行区域名称映射
    selectedSuburbs = selectedSuburbs.map(suburb => {
        return SUBURB_MAPPING[suburb] || suburb; // 优先使用映射值，没有映射则保持原值
    });

    const filters = {
        price_min: document.getElementById('priceMin')?.value || null,
        price_max: document.getElementById('priceMax')?.value || null,
        bedrooms_min: document.getElementById('bedroomsMin')?.value || null,
        bedrooms_max: document.getElementById('bedroomsMax')?.value || null,
        bathrooms: document.getElementById('bathrooms')?.value || null,
        suburbs: selectedSuburbs.length > 0 ? selectedSuburbs : null,
        house_type: Array.from(document.querySelectorAll('input[name="house_type"]:checked'))
            .map(cb => cb.value)
            .join(',') || null,
        min_score: document.getElementById('minScore')?.value || null,
        commute_time_min: document.getElementById('commuteMin')?.value || null,
        commute_time_max: document.getElementById('commuteMax')?.value || null,
        keywords: document.getElementById('keywords')?.value || null,
        available_date: document.getElementById('availableDate')?.value || null,
    };

    // 添加区域参数的条件判断
    if (selectedSuburbs.length > 0) {
        filters['Address Line 2'] = selectedSuburbs;
    }

    // 添加详细的调试日志
    console.log('选中的区域：', selectedSuburbs);
    console.log('发送的筛选条件：', filters);

    const endpoint = window.currentSchool === 'unsw' 
        ? '/api/daily-houses/list' 
        : '/api/daily-houses/usyd/list';
    
    try {
        const baseUrl = await getApiBaseUrl();
        const url = new URL(`${baseUrl}${endpoint}`);
        
        // 手动构建查询参数
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(v => url.searchParams.append(key, v));
                } else {
                    url.searchParams.append(key, value);
                }
            }
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(url.searchParams))
        });

        // 添加响应调试日志
        console.log('API响应状态：', response.status);
        
        if (!response.ok) {
            throw new Error('Failed to fetch houses');
        }

        const houses = await response.json();
        console.log('收到的房源数据：', houses);

        // 如果选择了具体区域，手动筛选房源
        const filteredHouses = selectedSuburbs.length > 0 
            ? houses.filter(house => selectedSuburbs.includes(house['Address Line 2']))
            : houses;

        // 清空现有列表
        housingList.innerHTML = '';
        
        if (!filteredHouses || filteredHouses.length === 0) {
            console.log('没有找到符合条件的房源');
            housingList.innerHTML = '<div class="no-results">没有找到符合条件的房源</div>';
            updateStatsBanner(0);
            return;
        }

        // 添加新的房源卡片
        filteredHouses.forEach(house => {
            const houseCard = createHouseCard(house);
            housingList.appendChild(houseCard);
        });

        // 更新统计信息
        updateStatsBanner(filteredHouses.length);
        
    } catch (error) {
        console.error('加载房源失败:', error);
        console.error('错误详情:', error.stack);
        housingList.innerHTML = '<div class="error-message">加载房源失败，请稍后重试</div>';
    }
}

// 创建房源卡片
function createHouseCard(house) {
    try {
        const card = document.createElement('div');
        card.className = 'house-card';
        card.onclick = () => {
            if (house.website) {
                window.open(house.website, '_blank');
            }
        };
        
        // 检查是否是今天更新的房源
        const isToday = new Date(house.update_time).toDateString() === new Date().toDateString();
        
        const scoreValue = house['Average Score'] !== null && house['Average Score'] !== undefined 
            ? Number(house['Average Score']).toFixed(1) 
            : 'N/A';

        // 根据评分确定标签类型和文本
        let scoreTagClass = 'house-score-tag';
        let scoreText = `评分：${scoreValue}`;
        if (scoreValue !== 'N/A') {
            const numScore = Number(scoreValue);
            if (numScore >= 18.3) {
                scoreTagClass += ' top-score';
                scoreText = `顶级好房 ${scoreValue}分`;
            } else if (numScore >= 18.0) {
                scoreTagClass += ' high-score';
                scoreText = `高分好房 ${scoreValue}分`;
            }
        }
        
        card.innerHTML = `
            <div class="house-header">
                <div class="house-header-left">
                    <h3 class="house-price">$${house.Price || 0}/周</h3>
                    <div class="house-type-tag">${house['House Type'] || '未知类型'}</div>
                </div>
                <div class="${scoreTagClass}">${scoreText}</div>
            </div>
            <div class="house-info">
                <div class="house-main-info">
                    <p class="house-address">${house['Address Line 1'] || ''}, ${house['Address Line 2'] || ''}</p>
                    <div class="house-key-details">
                        <span class="detail-item"><i class="fas fa-bed"></i> ${house['Number of Bedrooms'] || 0}</span>
                        <span class="detail-item"><i class="fas fa-bath"></i> ${house['Number of Bathrooms'] || 0}</span>
                        <span class="detail-item"><i class="fas fa-car"></i> ${house['Number of Parkings'] || 0}</span>
                        <span class="detail-item"><i class="fas fa-clock"></i> ${house['Commute Time'] || '未知'}分钟</span>
                        <span class="detail-item"><i class="fas fa-calendar"></i> ${formatDate(house['Available Date'])}</span>
                    </div>
                </div>
                ${house['Keywords'] ? `<div class="house-keywords">${house['Keywords']}</div>` : ''}
            </div>
        `;
        
        if (isToday) {
            const newTag = document.createElement('div');
            newTag.className = 'new-house-tag';
            newTag.textContent = '今日更新';
            card.insertBefore(newTag, card.firstChild);
        }
        
        return card;
    } catch (error) {
        console.error('创建房源卡片失败:', error, house);
        const errorCard = document.createElement('div');
        errorCard.className = 'house-card error';
        errorCard.textContent = '加载房源信息失败';
        return errorCard;
    }
}

// 格式化日期显示
function formatDate(dateStr) {
    if (!dateStr) return '未指定';
    try {
        // 处理YYMMDD格式的输入
        if (dateStr.length === 6) {
            const year = '20' + dateStr.slice(0, 2);
            const month = dateStr.slice(2, 4);
            const day = dateStr.slice(4, 6);
            return `${year}-${month}-${day}`;
        }
        // 处理其他格式的日期
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return dateStr;
        }
        return date.toLocaleDateString('zh-CN');
    } catch (e) {
        console.error('日期格式化错误:', e);
        return dateStr;
    }
}

// 优化折叠切换函数
function toggleSuburbs() {
    const header = document.querySelector('.filter-header');
    const checkboxGroup = document.getElementById('suburbsGroup');
    
    header.classList.toggle('collapsed');
    checkboxGroup.classList.toggle('collapsed');
}

function validateHouseData(houses) {
    if (!Array.isArray(houses)) {
        console.error('返回的数据不是数组格式:', houses);
        return false;
    }
    return true;
}

// 添加与housing-filter.js相同的区域数据定义
const SUBURB_OPTIONS = {
    unsw: [
        'Alexandria', 'Bondi', 'Botany', 'Coogee', 'Eastgardens', 
        'Eastlakes', 'Hillsdale', 'Kensington', 'Kingsford', 'Maroubra',
        'Mascot', 'Matraville', 'Paddington', 'Randwick', 'Redfern',
        'Rosebery', 'Waterloo', 'WolliCreek', 'Zetland'
    ],
    usyd: [
        'Burwood', 'Chippendale', 'City', 'Glebe', 'Haymarket',
        'Hurstville', 'Mascot', 'Newtown', 'Ultimo', 'Waterloo',
        'WolliCreek', 'Zetland'
    ].sort((a, b) => a.localeCompare(b))
};

// 添加区域筛选事件绑定
function initializeSuburbFilters() {
    const allSuburbsCheckbox = document.querySelector('input[name="suburb"][value="all"]');
    const suburbCheckboxes = document.querySelectorAll('input[name="suburb"]:not([value="all"])');

    if (allSuburbsCheckbox) {
        allSuburbsCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                suburbCheckboxes.forEach(cb => cb.checked = false);
            }
            loadHouses();
        });
    }

    suburbCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                allSuburbsCheckbox.checked = false;
            } else if (!Array.from(suburbCheckboxes).some(cb => cb.checked)) {
                allSuburbsCheckbox.checked = true;
            }
            loadHouses();
        });
    });
}

// 初始化区域选项
function initSuburbOptions() {
    const container = document.getElementById('suburbsGroup');
    container.innerHTML = '<label><input type="checkbox" name="suburb" value="all" checked> 不限</label>';
    
    const suburbs = SUBURB_OPTIONS[window.currentSchool] || [];
    suburbs.forEach(suburb => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" name="suburb" value="${suburb}">
            ${suburb}
        `;
        container.appendChild(label);
    });
    
    initializeSuburbFilters();
}

// 修改保存订阅函数，添加错误处理
async function saveSubscription(event) {
    event.preventDefault(); // 阻止默认行为
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('请先登录以保存订阅');
            window.location.href = 'login.html';
            return;
        }

        // 收集所有筛选条件（添加更多必要字段）
        const filters = {
            school: document.getElementById('targetSchool').value,
            priceMin: document.getElementById('priceMin').value || null,
            priceMax: document.getElementById('priceMax').value || null,
            bedroomsMin: document.getElementById('bedroomsMin').value || null,
            bedroomsMax: document.getElementById('bedroomsMax').value || null,
            bathrooms: document.getElementById('bathrooms').value || null,
            suburbs: Array.from(document.querySelectorAll('input[name="suburb"]:checked:not([value="all"])')).map(cb => cb.value),
            houseType: Array.from(document.querySelectorAll('input[name="house_type"]:checked')).map(cb => cb.value),
            minScore: document.getElementById('minScore').value || 13,
            commuteMin: document.getElementById('commuteMin').value || null,
            commuteMax: document.getElementById('commuteMax').value || null,
            availableDate: document.getElementById('availableDate').value || null
        };

        // 添加请求超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const baseUrl = await getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/subscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(filters),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '保存失败');
        }

        // 显示更友好的提示
        showAlert('订阅成功！筛选条件已保存', 'success');
    } catch (error) {
        console.error('订阅保存失败:', error);
        showAlert(`保存失败: ${error.message}`, 'error');
    }
}

// 新增提示函数
function showAlert(message, type = 'info') {
    const alertBox = document.createElement('div');
    alertBox.className = `subscription-alert ${type}`;
    alertBox.textContent = message;
    
    document.body.appendChild(alertBox);
    
    setTimeout(() => {
        alertBox.remove();
    }, 3000);
}

// 修改检查登录状态的逻辑
function checkSubscriptionAuth() {
    const token = localStorage.getItem('token');
    const subscriptionContent = document.getElementById('subscriptionContent');
    const subscriptionLocked = document.getElementById('subscriptionLocked');
    
    // 添加token有效性检查
    if (token && validateToken(token)) { // 需要实现validateToken函数
        subscriptionContent.classList.remove('hidden');
        subscriptionLocked.classList.add('hidden');
        checkSubscription(); // 加载订阅时检查有效性
    } else {
        subscriptionContent.classList.add('hidden');
        subscriptionLocked.classList.remove('hidden');
        localStorage.removeItem('token'); // 清除无效token
    }
}

// 修改validateToken函数
function validateToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        
        // 添加必要字段检查
        if (!payload.user_id || !payload.exp) return false;
        
        // 添加1分钟缓冲时间
        return payload.exp > Date.now() / 1000 - 60;
    } catch (e) {
        console.error('Token解析失败:', e);
        return false;
    }
}

// 修改订阅检查函数
async function checkSubscription() {
    const token = localStorage.getItem('token');
    if (!token || !validateToken(token)) {
        console.log('Token无效或已过期');
        localStorage.removeItem('token');
        checkSubscriptionAuth();
        return;
    }

    try {
        const baseUrl = await getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/subscriptions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.log('用户尚未保存订阅');
                return;
            }
            throw new Error('获取订阅失败');
        }

        const data = await response.json();
        if (data.data) {
            applyFilters(data.data);
            loadHouses();
        }
    } catch (error) {
        console.error('加载订阅失败:', error);
    }
}

// 新增：应用筛选条件
function applyFilters(filters) {
    // 设置基础筛选条件
    document.getElementById('targetSchool').value = filters.school || 'unsw';
    document.getElementById('priceMin').value = filters.priceMin || '';
    document.getElementById('priceMax').value = filters.priceMax || '';
    document.getElementById('bedroomsMin').value = filters.bedroomsMin || '';
    document.getElementById('bedroomsMax').value = filters.bedroomsMax || '';
    document.getElementById('bathrooms').value = filters.bathrooms || '';
    document.getElementById('minScore').value = filters.minScore || '13';
    document.getElementById('commuteMin').value = filters.commuteMin || '';
    document.getElementById('commuteMax').value = filters.commuteMax || '';
    document.getElementById('availableDate').value = filters.availableDate || '';

    // 设置房屋类型
    document.querySelectorAll('input[name="house_type"]').forEach(checkbox => {
        checkbox.checked = filters.houseType?.includes(checkbox.value) || false;
    });

    // 设置区域选择（需要等待区域初始化完成）
    setTimeout(() => {
        const allSuburbsCheckbox = document.querySelector('input[name="suburb"][value="all"]');
        if (filters.suburbs?.length > 0) {
            allSuburbsCheckbox.checked = false;
            filters.suburbs.forEach(suburb => {
                const checkbox = document.querySelector(`input[name="suburb"][value="${suburb}"]`);
                if (checkbox) checkbox.checked = true;
            });
        } else {
            allSuburbsCheckbox.checked = true;
        }
    }, 100);
}

// 在DOM加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initSuburbOptions();
    // 其他初始化代码...
}); 