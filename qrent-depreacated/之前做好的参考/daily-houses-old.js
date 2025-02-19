function setupAuthInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch(...args);
        if (response.status === 401) {
            window.location.href = '/login.html';
        }
        return response;
    };
}

document.addEventListener('DOMContentLoaded', function() {
    setupAuthInterceptor();
    // 确保模态框初始状态为隐藏
    const saveModal = document.getElementById('saveModal');
    if (saveModal) {
        saveModal.classList.add('hidden');
    }

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
        scoreSlider.addEventListener('input', () => {
            scoreValue.textContent = scoreSlider.value;
            onFilterChange();
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

    document.getElementById('subscriptionSelect').addEventListener('change', async function() {
        const subscriptionId = this.value;
        if (!subscriptionId) return;

        try {
            const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (!response.ok) throw new Error('加载失败');
            
            const subscription = await response.json();
            applyFilters(subscription.filters);
            currentSubscriptionId = subscriptionId;
            originalFilters = subscription.filters;
            document.getElementById('changesAlert').classList.add('hidden');
        } catch (error) {
            console.error('加载订阅失败:', error);
        }
    });

    // 在初始化时绑定监听
    attachFilterListeners();

    // 获取模态框元素
    const modal = document.getElementById('saveModal');
    
    // 点击模态框外部区域时关闭
    modal.addEventListener('click', function(event) {
        // 如果点击的是模态框本身（而不是其内容）
        if (event.target === modal) {
            closeSaveModal();
        }
    });

    // 检查登录状态并更新UI
    checkLoginStatus();
});

// 获取API基础URL
async function getApiBaseUrl() {
    // 直接返回云服务器地址
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

// 更新统计信息横幅
async function updateStatsBanner(filteredCount = null) {
    try {
        const baseUrl = await getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/daily-houses/stats`, {
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

// 加载房源列表
async function loadHouses() {
    const housingList = document.getElementById('housingList');
    
    // 获取筛选条件
    const allSuburbsSelected = document.querySelector('input[name="suburb"][value="all"]').checked;
    const selectedSuburbs = allSuburbsSelected 
        ? [] 
        : Array.from(document.querySelectorAll('input[name="suburb"]:checked:not([value="all"])'))
            .map(cb => cb.value);
    
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
        available_date: document.getElementById('availableDate')?.value || null
    };

    // 添加详细的调试日志
    console.log('选中的区域：', selectedSuburbs);
    console.log('发送的筛选条件：', filters);

    try {
        const baseUrl = await getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/daily-houses/list`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            mode: 'cors',
            body: JSON.stringify(filters)
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

// 订阅相关状态
let currentSubscriptionId = null;
let originalFilters = {};

// 初始化订阅功能
async function initSubscription() {
    await loadSubscriptions();
    attachFilterListeners();
}

// 加载用户订阅
async function loadSubscriptions() {
    try {
        // 添加登录状态检查
        if (!localStorage.getItem('token')) {
            console.log('用户未登录，跳过加载订阅');
            return;
        }
        
        const baseUrl = await getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/subscriptions?page_type=daily`, {
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            mode: 'cors'
        });
        
        if (!response.ok) throw new Error('加载失败');
        
        const subscriptions = await response.json();
        const select = document.getElementById('subscriptionSelect');
        
        select.innerHTML = '<option value="">选择订阅...</option>';
        subscriptions.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('加载订阅失败:', error);
        
        // 处理网络错误
        if (error.name === 'TypeError') {
            alert('网络连接失败，请检查网络');
            return;
        }

        // 处理HTTP错误
        if (error instanceof Response) {
            try {
                const errData = await error.json();
                if (error.status === 401) {
                    window.location.href = '/login.html';
                } else {
                    alert(`加载失败：${errData.message || '服务器错误'}`);
                }
            } catch (parseError) {
                alert('服务器返回异常响应');
            }
            return;
        }

        alert('发生未知错误');
    }
}

// 保存订阅
async function saveSubscription() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    const name = document.getElementById('subscriptionName').value.trim();
    if (!name) return alert('请输入订阅名称');
    
    try {
        const response = await fetch('/api/subscriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                name,
                page_type: 'daily',
                filters: getCurrentFilters()
            })
        });

        const result = await response.json();
        if (response.ok) {
            closeSaveModal();
            await loadSubscriptions();
            alert('保存成功');
        } else {
            alert(result.error || '保存失败');
        }
    } catch (error) {
        console.error('保存失败:', error);
        alert('网络错误，请稍后重试');
    }
}

// 当筛选条件变化时
function onFilterChange() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    if (!currentSubscriptionId) return;
    
    const currentFilters = getCurrentFilters();
    const hasChanges = !deepEqual(currentFilters, originalFilters);
    
    document.getElementById('changesAlert').classList.toggle('hidden', !hasChanges);
}

// 辅助函数：深度比较对象
function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

// 在页面初始化时调用
initSubscription();

// 添加模态框控制函数
function showSaveModal() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('saveModal').classList.remove('hidden');
}

function closeSaveModal() {
    document.getElementById('saveModal').classList.add('hidden');
    document.getElementById('subscriptionName').value = '';
}

// 在页面加载时初始化隐藏模态框
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saveModal').classList.add('hidden');
});

function getCurrentFilters() {
    const allSuburbsSelected = document.querySelector('input[name="suburb"][value="all"]').checked;
    const selectedSuburbs = allSuburbsSelected 
        ? []
        : Array.from(document.querySelectorAll('input[name="suburb"]:checked:not([value="all"])'))
            .map(cb => cb.value);

    return {
        priceMin: document.getElementById('priceMin').value,
        priceMax: document.getElementById('priceMax').value,
        bedroomsMin: document.getElementById('bedroomsMin').value,
        bedroomsMax: document.getElementById('bedroomsMax').value,
        bathrooms: document.getElementById('bathrooms').value,
        suburbs: selectedSuburbs,
        houseType: Array.from(document.querySelectorAll('input[name="house_type"]:checked'))
            .map(cb => cb.value),
        minScore: document.getElementById('minScore').value,
        commuteMin: document.getElementById('commuteMin').value,
        commuteMax: document.getElementById('commuteMax').value,
        availableDate: document.getElementById('availableDate').value,
        keywords: document.getElementById('keywords').value
    };
}

// 在初始化时绑定监听
function attachFilterListeners() {
    const filterElements = [
        '#priceMin', '#priceMax', 
        '#bedroomsMin', '#bedroomsMax',
        '#bathrooms', '#commuteMin', 
        '#commuteMax', '#keywords',
        '#availableDate', 
        '[name="suburb"]', 
        '[name="house_type"]'
    ];

    filterElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            element.addEventListener('change', onFilterChange);
        });
    });
}

function restoreSubscription() {
    if (confirm('确定要恢复原始筛选条件吗？')) {
        applyFilters(originalFilters);
        document.getElementById('changesAlert').classList.add('hidden');
    }
}

async function saveChanges() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    if (!currentSubscriptionId) return;
    
    try {
        const response = await fetch(`/api/subscriptions/${currentSubscriptionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                filters: getCurrentFilters()
            })
        });

        if (response.ok) {
            originalFilters = getCurrentFilters();
            document.getElementById('changesAlert').classList.add('hidden');
            alert('修改已保存');
        }
    } catch (error) {
        console.error('保存修改失败:', error);
    }
}

// 检查登录状态并更新UI
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const subscriptionLocked = document.querySelector('.subscription-locked');
    const subscriptionContent = document.querySelector('.subscription-content');
    
    if (token) {
        // 已登录状态
        subscriptionLocked.classList.add('hidden');
        subscriptionContent.classList.remove('hidden');
    } else {
        // 未登录状态
        subscriptionLocked.classList.remove('hidden');
        subscriptionContent.classList.add('hidden');
        
        // 添加点击事件跳转到登录页
        subscriptionLocked.onclick = function() {
            window.location.href = 'login.html';
        }
    }
}