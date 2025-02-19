// 全局配置
const config = {
    apiHost: '134.175.168.147', // 默认值，应该从后端获取或通过环境变量注入
    apiPort: '5000'
};

// 在全局作用域声明currentSchool
window.currentSchool = 'unsw';

// 初始化日期选择器
flatpickr("#availableDate", {
    dateFormat: "Y-m-d",
    minDate: "today",
    locale: "zh-CN",
    onChange: function(selectedDates, dateStr) {
        // 验证日期格式
        if (dateStr) {
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    console.error('无效的日期格式');
                    return;
                }
            } catch (e) {
                console.error('日期解析错误:', e);
                return;
            }
        }
        // 触发筛选
        currentPage = 1;
        fetchHouses();
    }
});

// 当页面加载完成时获取房源数据
document.addEventListener('DOMContentLoaded', () => {
    initializeFilters();
    initializeSuburbFilters();
    initScoreSlider();
    fetchHouses();
});

// 当前页码和每页显示数量
let currentPage = 1;
const pageSize = 10;

// 同样添加映射（保持代码一致性）
const SUBURB_MAPPING = {
    'City': 'Sydney',
    'WolliCreek': 'Wolli',
    'Wollicreek': 'Wolli',
};

// 获取筛选条件
function getFilterValues() {
    // 获取区域筛选值
    const allSuburbsSelected = document.querySelector('input[name="suburb"][value="all"]')?.checked;
    let selectedSuburbs = allSuburbsSelected 
        ? [] 
        : Array.from(document.querySelectorAll('input[name="suburb"]:checked:not([value="all"])'))
            .map(cb => cb.value);

    // 进行区域名称映射
    selectedSuburbs = selectedSuburbs.map(suburb => {
        return SUBURB_MAPPING[suburb] || suburb;
    });

    const filters = {
        price_min: document.getElementById('priceMin')?.value || null,
        price_max: document.getElementById('priceMax')?.value || null,
        bedrooms_min: document.getElementById('bedroomsMin')?.value || null,
        bedrooms_max: document.getElementById('bedroomsMax')?.value || null,
        bathrooms: document.getElementById('bathrooms')?.value || null,
        house_type: Array.from(document.querySelectorAll('input[name="house_type"]:checked'))
            .map(cb => cb.value)
            .join(',') || null,
        min_score: document.getElementById('minScore')?.value || null,
        commute_time_min: document.getElementById('commuteMin')?.value || null,
        commute_time_max: document.getElementById('commuteMax')?.value || null,
        keywords: document.getElementById('keywords')?.value || null,
        page: currentPage,
        page_size: pageSize,
    };

    // 只有在选择了具体区域时才添加区域参数
    if (selectedSuburbs.length > 0) {
        filters['Address Line 2'] = selectedSuburbs;
    }

    // 特殊处理入住日期
    const availableDateValue = document.getElementById('availableDate')?.value;
    if (availableDateValue) {
        try {
            const dateObj = new Date(availableDateValue);
            if (!isNaN(dateObj.getTime())) {
                filters.available_date = availableDateValue;
            }
        } catch (e) {
            console.error('日期转换错误:', e);
        }
    }

    return filters;
}

// 获取当前环境的API基础URL
async function getApiBaseUrl() {
    // 直接返回云服务器地址
    return 'http://134.175.168.147:5000';
}

// 监听学校选择变化
document.getElementById('targetSchool').addEventListener('change', function(e) {
    window.currentSchool = e.target.value;
    console.log('切换学校至:', window.currentSchool);
    currentPage = 1;
    fetchHouses();
});

// 修改API请求路径生成逻辑
async function buildApiUrl(filters) {
    const baseUrl = await getApiBaseUrl();
    const endpoint = window.currentSchool === 'unsw' 
        ? '/api/data' 
        : '/api/data/usyd';
    
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            // 处理数组参数
            if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, v));
            } else {
                queryParams.append(key, value);
            }
        }
    });
    
    return `${baseUrl}${endpoint}?${queryParams.toString()}`;
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
            return dateStr; // 如果无法解析，返回原始字符串
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error('日期格式化错误:', e);
        return dateStr;
    }
}

// 创建房源卡片HTML
function createHouseCard(house) {
    // 确保评分是数字并保留一位小数
    const score = house['Average Score'] !== null && house['Average Score'] !== undefined 
        ? Number(house['Average Score']).toFixed(1) 
        : 'N/A';

    // 根据评分确定标签类型和文本
    let scoreTagClass = 'house-score-tag';
    let scoreText = `评分：${score}`;
    if (score !== 'N/A') {
        const numScore = Number(score);
        if (numScore >= 18.3) {
            scoreTagClass += ' top-score';
            scoreText = `顶级好房 ${score}分`;
        } else if (numScore >= 18.0) {
            scoreTagClass += ' high-score';
            scoreText = `高分好房 ${score}分`;
        }
    }

    // 确保网站链接有效
    const websiteUrl = house.website || '#';

    return `
        <div class="house-card" onclick="window.open('${websiteUrl}', '_blank')">
            <div class="house-header">
                <div class="house-header-left">
                    <h3 class="house-price">$${house.Price}/周</h3>
                    <div class="house-type-tag">${house['House Type'] || '未指定'}</div>
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
        </div>
    `;
}

// 创建分页控件
function createPagination(totalPages) {
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    // 上一页按钮
    const prevButton = document.createElement('button');
    prevButton.textContent = '上一页';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            fetchHouses();
        }
    };
    
    // 页码显示
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    
    // 下一页按钮
    const nextButton = document.createElement('button');
    nextButton.textContent = '下一页';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchHouses();
        }
    };
    
    pagination.appendChild(prevButton);
    pagination.appendChild(pageInfo);
    pagination.appendChild(nextButton);
    
    return pagination;
}

// 显示错误信息
function showError(message, retryCallback = null) {
    const housingList = document.getElementById('housingList');
    housingList.innerHTML = `
        <div class="error">
            <p>${message}</p>
            ${retryCallback ? '<button onclick="retryFetch()" class="retry-button">重试</button>' : ''}
        </div>
    `;
}

// 重试获取数据
function retryFetch() {
    fetchHouses();
}

// 获取并显示房源数据
async function fetchHouses() {
    const filters = getFilterValues();
    console.log('发送的筛选条件:', filters);
    
    try {
        const baseUrl = await getApiBaseUrl();
        const queryParams = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        queryParams.append(key, v);
                    });
                } else {
                    queryParams.append(key, value);
                }
            }
        });

        const requestUrl = await buildApiUrl(filters);
        console.log('实际请求URL:', requestUrl);
        
        const response = await fetch(requestUrl);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API错误详情:', errorData);
            throw new Error(errorData.error || '服务器响应错误');
        }
        
        const data = await response.json();
        console.log('服务器返回数据:', data);
        
        const housingList = document.getElementById('housingList');
        housingList.innerHTML = '';
        
        if (!data.data || data.data.length === 0) {
            housingList.innerHTML = '<div class="no-results">没有找到符合条件的房源</div>';
            return;
        }

        // 直接使用 API 返回的数据
        const housesHtml = data.data.map(createHouseCard).join('');
        housingList.innerHTML = housesHtml;

        // 更新分页控件
        if (data.total_pages > 1) {
            housingList.appendChild(createPagination(data.total_pages));
        }
    } catch (error) {
        console.error('获取房源数据失败:', error);
        console.error('完整错误信息:', error.stack);
        showError(error.message);
    }
}

// 为所有筛选条件添加事件监听器
function initializeFilters() {
    const filterElements = [
        'priceMin', 'priceMax',
        'bedroomsMin', 'bedroomsMax',
        'bathrooms',  // 移除 'suburb'
        'commuteMin', 'commuteMax',
        'availableDate', 'keywords'
    ];
    
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                currentPage = 1; // 重置页码
                fetchHouses();
            });
            // 添加输入事件监听
            if (element.type === 'text' || element.type === 'number') {
                element.addEventListener('input', debounce(() => {
                    currentPage = 1;
                    fetchHouses();
                }, 500));
            }
        }
    });
    
    // 为复选框添加事件监听
    document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            currentPage = 1;
            fetchHouses();
        });
    });
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

// 初始化评分滑动条
function initScoreSlider() {
    const slider = document.getElementById('minScore');
    const scoreValue = document.getElementById('scoreValue');
    
    // 更新显示的值
    function updateScoreValue() {
        scoreValue.textContent = slider.value;
    }
    
    // 添加事件监听
    slider.addEventListener('input', () => {
        updateScoreValue();
        currentPage = 1;
        fetchHouses();
    });
}

// 修改区域选择的事件监听逻辑
function initializeSuburbFilters() {
    const allSuburbsCheckbox = document.querySelector('input[name="suburb"][value="all"]');
    const suburbCheckboxes = document.querySelectorAll('input[name="suburb"]:not([value="all"])');

    if (allSuburbsCheckbox) {
        allSuburbsCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                suburbCheckboxes.forEach(cb => {
                    cb.checked = false;
                });
            }
            currentPage = 1;
            fetchHouses();
        });
    }

    suburbCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', debounce(async () => {
            console.log('区域选择变化：', checkbox.value, checkbox.checked);
            
            if (checkbox.checked) {
                allSuburbsCheckbox.checked = false;
            } else if (!Array.from(suburbCheckboxes).some(cb => cb.checked)) {
                allSuburbsCheckbox.checked = true;
            }

            currentPage = 1;
            try {
                await fetchHouses();
                console.log('房源加载完成');
            } catch (error) {
                console.error('房源加载失败:', error);
            }
        }, 300));
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeFilters();
    initializeSuburbFilters();
    initScoreSlider();
    fetchHouses();
});

// 可以添加一个统一的错误处理函数
function handleApiError(error) {
    if (error.response) {
        // 服务器返回了错误状态码
        console.error('服务器错误:', error.response.status);
    } else if (error.request) {
        // 请求发送失败
        console.error('网络请求失败');
    } else {
        // 其他错误
        console.error('发生错误:', error.message);
    }
    
    // 可以在UI上显示错误信息
    // 例如:
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = '获取房源数据失败，请稍后重试';
        errorMessage.style.display = 'block';
    }
}

// 添加折叠切换函数
function toggleSuburbs() {
    const header = document.querySelector('.filter-header');
    const checkboxGroup = document.getElementById('suburbsGroup');
    
    header.classList.toggle('collapsed');
    checkboxGroup.classList.toggle('collapsed');
} 

// 在全局定义区域数据
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
    ].sort((a, b) => a.localeCompare(b)) // 按字母排序
};

// 初始化区域选项
function initSuburbOptions() {
    const container = document.getElementById('suburbsGroup');
    
    // 清空现有选项
    container.innerHTML = '<label><input type="checkbox" name="suburb" value="all" checked> 不限</label>';
    
    // 获取当前学校的区域列表
    const suburbs = SUBURB_OPTIONS[window.currentSchool] || [];
    
    // 添加新选项
    suburbs.forEach(suburb => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" name="suburb" value="${suburb}">
            ${suburb}
        `;
        container.appendChild(label);
    });
    
    // 重新绑定事件
    initializeSuburbFilters();
}

// 修改学校切换监听
document.getElementById('targetSchool').addEventListener('change', function(e) {
    window.currentSchool = e.target.value;
    console.log('切换学校至:', window.currentSchool);
    
    // 重置区域选项
    initSuburbOptions();
    
    currentPage = 1;
    fetchHouses();
});

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initSuburbOptions(); // 新增初始化
    // 其他初始化代码...
});