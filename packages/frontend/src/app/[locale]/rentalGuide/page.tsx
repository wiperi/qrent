import CheckList from '@/src/components/CheckList';
import Guides from '@/src/components/Guides';
import React from 'react';

const stepsData = [
  {
    title: '1. 确定租房预算与需求（提前5-7周）',
    subtasks: [
      '了解住宿的基本类型',
      '了解整租与分租的优缺点',
      '确定个人租房预算范围',
      '确定个人对房源的其他要求',
    ],
  },
  {
    title: '2. 了解学校附近区域与租房平台',
    subtasks: [
      '研究学校周边各区域特点',
      '确定目标区域范围',
      '了解相关租房网站的使用',
      '了解房源价格水平',
    ],
  },
  {
    title: '3. 了解具体房源与准备申请材料（提前3-4周）',
    subtasks: [
      '了解预算内的房源市场情况',
      '准备租房申请相关材料',
      '了解看房/代看房注意事项',
      '了解租房申请相关流程',
    ],
  },
  {
    title: '4. 积极看房联系（提前两周）',
    subtasks: [
      '确定起租日期合适的相关房源',
      '预约安排看房行程',
      '持续与中介保持沟通，及时跟进申请状态',
    ],
  },
  {
    title: '5. 完成签约与押金支付等（成功签约！）',
    subtasks: [
      '了解标准租房合同',
      '了解押金、定金支付与相关规则',
      '支付押金、定金，完成合同签订等',
    ],
  },
  {
    title: '6. 租后事项处理',
    subtasks: ['提交房屋检查报告', '办理水电网络', '了解维修流程'],
  },
];

const page = () => {
  return (
    <div className="flex flex-col lg:flex-row">
      {/* Main Content */}

      <div className="flex flex-col lg:flex-row">
        <section className="flex-[2] bg-gray-50 rounded-lg p-5 shadow-md h-[700px] overflow-y-auto">
          <CheckList title="租房流程" stepsData={stepsData} />
        </section>

        {/* Guides Section */}
        <section className="flex-[8] col-span-2 bg-white shadow-lg rounded-lg p-6 h-[700px]">
          <Guides />
        </section>
      </div>
    </div>
  );
};

export default page;
