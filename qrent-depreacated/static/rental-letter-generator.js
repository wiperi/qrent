// rental-letter-generator.js

// 直接使用常量定义 API 地址
const API_BASE_URL = 'http://134.175.168.147:5000';

document.addEventListener('DOMContentLoaded', function() {
    // 初始化日期选择器
    flatpickr(".datepicker", {
        dateFormat: "Y-m-d",
        locale: "zh" // 中文支持
    });

    // 初始化 Select2
    $(document).ready(function() {
        $('#university').select2({
            theme: 'bootstrap-5',
            tags: true,
            placeholder: '请选择或输入大学',
            language: {
                noResults: () => "没有找到匹配的学校，可以直接输入"
            }
        });

        $('#roommateRelation').select2({
            theme: 'bootstrap-5',
            tags: true,
            placeholder: '请选择或输入关系',
            language: {
                noResults: () => "没有找到匹配的选项，可以直接输入"
            }
        });
    });

    // 财务证明选项切换
    const toggleVisibility = (checkbox, targetElement) => {
        checkbox.addEventListener('change', () => {
            targetElement.classList.toggle('d-none', !checkbox.checked);
        });
    };

    toggleVisibility(document.getElementById('fundBank'), document.getElementById('bankAmount'));
    toggleVisibility(document.getElementById('fundIncome'), document.getElementById('incomeAmount'));
    toggleVisibility(document.getElementById('fundScholarship'), document.getElementById('scholarshipInfo'));

    // 合租人信息切换
    document.getElementById('hasRoommate').addEventListener('change', function() {
        document.getElementById('roommateInfo').classList.toggle('d-none', !this.checked);
    });

    // 租房历史管理
    const rentalHistoryManager = {
        init() {
            this.recordCount = 0;
            this.rentalRecordList = document.getElementById('rentalRecordList');
            this.template = document.getElementById('rentalRecordTemplate');
            
            document.getElementById('firstTimeRenter').addEventListener('change', e => {
                document.getElementById('rentalHistory').classList.toggle('d-none', e.target.checked);
            });

            document.getElementById('addRentalRecord').addEventListener('click', () => this.addRecord());
        },

        addRecord() {
            const newRecord = this.template.cloneNode(true);
            newRecord.id = `rentalRecord_${this.recordCount++}`;
            newRecord.classList.remove('d-none');

            newRecord.querySelector('.delete-record').addEventListener('click', () => {
                newRecord.remove();
            });

            this.rentalRecordList.appendChild(newRecord);
        }
    };
    rentalHistoryManager.init();

    // 生成申请信功能
    const generateLetter = {
        requiredFields: {
            // 'nameZh': '中文姓名',
            // 'nameEn': '英文姓名',
            // 'phone': '联系电话',
            // 'university': '所在大学'
        },

        async handleGenerate() {
            try {
                this.validateForm();
                this.toggleLoading(true);

                const formData = this.collectFormData();
                const response = await this.sendRequest(formData);
                this.handleResponse(response);
            } catch (error) {
                this.handleError(error);
            } finally {
                this.toggleLoading(false);
            }
        },

        validateForm() {
            let isValid = true;
            Object.entries(this.requiredFields).forEach(([fieldId, fieldName]) => {
                const element = document.getElementById(fieldId);
                if (!element?.value?.trim()) {
                    element?.classList.add('is-invalid');
                    alert(`请填写${fieldName}`);
                    isValid = false;
                } else {
                    element?.classList.remove('is-invalid');
                }
            });
            
            if (!isValid) {
                throw new Error('请填写必要信息');
            }
        },

        collectFormData() {
            return {
                basicInfo: {
                    nameZh: document.getElementById('nameZh')?.value || '',
                    nameEn: document.getElementById('nameEn')?.value || '',
                    birthDate: document.getElementById('birthDate')?.value || '',
                    phone: document.getElementById('phone')?.value || '',
                    university: document.getElementById('university')?.value || '',
                    major: document.getElementById('major')?.value || '',
                    studyStart: document.getElementById('studyStart')?.value || '',
                    studyEnd: document.getElementById('studyEnd')?.value || '',
                    nationality: document.getElementById('nationality')?.value || 'China'
                },
                livingPlan: {
                    moveInDate: document.getElementById('moveInDate')?.value || '',
                    leaseTerm: document.getElementById('leaseTerm')?.value || '',
                    rentBudget: document.getElementById('rentBudget')?.value || '',
                    specialRequests: document.getElementById('additionalDetails')?.value || ''
                },
                background: {
                    traits: {
                        nonSmoker: document.getElementById('traitNonSmoker')?.checked || false,
                        noPets: document.getElementById('traitNoPets')?.checked || false,
                        quiet: document.getElementById('traitQuiet')?.checked || false,
                        neat: document.getElementById('traitNeat')?.checked || false,
                        noParties: document.getElementById('traitNoParties')?.checked || false,
                        regularSchedule: document.getElementById('traitSchedule')?.checked || false
                    },
                    rentalHistory: this.getRentalHistory(),
                    coTenants: this.getCoTenants()
                },
                financial: {
                    parentalSupport: document.getElementById('fundParent')?.checked ? 
                        document.getElementById('parentSupportAmount')?.value || '0' : '0',
                    scholarship: document.getElementById('fundScholarship')?.checked ? 
                        document.getElementById('scholarshipDetails')?.value || '0' : '0',
                    partTimeIncome: document.getElementById('fundIncome')?.checked ? 
                        document.getElementById('incomeDetails')?.value || '0' : '0',
                    depositType: document.getElementById('fundBank')?.checked ? 'Bank Statement' : '',
                    depositAmount: document.getElementById('bankDetails')?.value || '0',
                    hasParentalLetter: document.getElementById('fundParent')?.checked || false
                }
            };
        },

        async sendRequest(formData) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                console.log('开始发送请求到:', `${API_BASE_URL}/api/generate-rental-letter`);
                const response = await fetch(`${API_BASE_URL}/api/generate-rental-letter`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': window.location.origin
                    },
                    body: JSON.stringify(formData),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    // 添加更详细的错误处理
                    if (response.status === 500) {
                        throw new Error('服务器内部错误，请稍后重试');
                    } else if (response.status === 404) {
                        throw new Error('API 端点不存在，请检查配置');
                    } else if (response.status === 403) {
                        throw new Error('访问被拒绝，请检查权限');
                    }
                    const error = await response.json();
                    throw new Error(error.message || `请求失败 (${response.status})`);
                }

                const result = await response.json();
                return result;
            } catch (error) {
                console.error('请求错误:', error);
                if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                    // 如果是连接错误，尝试使用备用 API
                    console.log('尝试使用备用 API...');
                    return this.sendFallbackRequest(formData);
                }
                throw error;
            } finally {
                clearTimeout(timeoutId);
            }
        },

        async sendFallbackRequest(formData) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': window.location.origin
                    },
                    body: JSON.stringify({
                        message: "请根据以下信息生成租房申请信：" + JSON.stringify(formData)
                    }),
                });

                if (!response.ok) {
                    throw new Error(`备用 API 请求失败 (${response.status})`);
                }

                const data = await response.json();
                
                // 转换 AI 助手的响应格式为租房申请信格式
                return {
                    letter: data.choices ? data.choices[0].message.content : 
                           data.output ? data.output.text : 
                           typeof data === 'string' ? data : 
                           '无法生成申请信'
                };
            } catch (error) {
                console.error('备用 API 请求错误:', error);
                throw new Error('所有可用的 API 都无法连接，请稍后重试');
            }
        },

        handleResponse(data) {
            let content = '';
            if (data.letter) {
                content = data.letter;
            } else if (data.choices && data.choices[0]) {
                content = data.choices[0].message.content;
            } else if (data.output && data.output.text) {
                content = data.output.text;
            } else if (typeof data === 'string') {
                content = data;
            } else {
                throw new Error('无效的响应数据格式');
            }
            
            const preview = document.getElementById('letterPreview');
            preview.innerHTML = this.sanitizeContent(content);
            
            // 添加成功提示
            alert('申请信生成成功！');
        },

        sanitizeContent(content) {
            return content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\*\*(AUD \d+)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
        },

        handleError(error) {
            console.error('生成失败:', error);
            
            const messages = {
                'AbortError': '请求超时，请检查网络连接并重试',
                'Failed to fetch': '无法连接服务器，请检查网络设置或服务器是否在线',
                'NetworkError': '网络错误，请检查网络连接'
            };

            const errorMessage = messages[error.name] || error.message || '生成失败，请稍后重试';
            alert(errorMessage);
        },

        toggleLoading(loading) {
            const btn = document.getElementById('generateBtn');
            btn.disabled = loading;
            btn.innerHTML = loading 
                ? '<i class="bi bi-hourglass-split"></i> 生成中...（大约需要30秒）'
                : '<i class="bi bi-magic"></i> 生成申请信';
        },

        getRentalHistory() {
            return Array.from(document.querySelectorAll('.rental-record:not(#rentalRecordTemplate)'))
                .map(record => ({
                    address: record.querySelector('.rental-address').value,
                    duration: record.querySelector('.rental-duration').value,
                    rent: record.querySelector('.rental-rent').value,
                    reference: record.querySelector('.rental-reference').checked,
                    notes: record.querySelector('.rental-notes').value
                }));
        },

        getCoTenants() {
            if (!document.getElementById('hasRoommate').checked) return [];
            
            return [{
                nameEn: document.getElementById('roommateName').value,
                relationship: document.getElementById('roommateRelation').value,
                university: document.getElementById('roommateUniversity')?.value || '',
                email: document.getElementById('roommateEmail')?.value || '',
                supportAmount: document.getElementById('roommateSupport')?.value || '0'
            }];
        }
    };

    // 绑定生成按钮
    document.getElementById('generateBtn').addEventListener('click', () => generateLetter.handleGenerate());

    // 只保留复制功能
    document.getElementById('copyBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(
            document.querySelector('.generated-content').innerText
        ).then(() => alert('已复制到剪贴板'));
    });

    // 删除下载按钮相关代码
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.remove();
    }
});