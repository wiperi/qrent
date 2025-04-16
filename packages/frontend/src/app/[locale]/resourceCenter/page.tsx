'use client';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Download, Lock, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// 创建一个临时的userStore，因为找不到正确的导入路径
const useUserStore = () => {
  return {
    userInfo: null // 默认用户未登录
  };
};

// 定义资源类型接口
interface Resource {
  id: number;
  titleKey: string;
  descriptionKey: string;
  fileName: string;
}

export default function ResourceCenter() {
  const { userInfo } = useUserStore();
  const router = useRouter();
  const [showLoginMessage, setShowLoginMessage] = useState(false);
  const t = useTranslations('ResourceCenter');
  
  // 资源列表
  const resources: Resource[] = [
    {
      id: 1,
      titleKey: 'rental-process-chart',
      descriptionKey: 'rental-process-desc',
      fileName: 'rental-application-process-chart.pdf',
    },
    {
      id: 2,
      titleKey: 'rental-vocabulary',
      descriptionKey: 'rental-vocabulary-desc',
      fileName: 'rental-vocabulary.pdf',
    },
    {
      id: 3,
      titleKey: 'inspection-checklist',
      descriptionKey: 'inspection-checklist-desc',
      fileName: 'property-inspection-checklist.pdf',
    },
  ];

  const handleDownload = () => {
    if (!userInfo) {
      setShowLoginMessage(true);
      return;
    }
    
    // 执行下载操作
    const link = document.createElement('a');
    link.href = `/resources/rental-guide.pdf`;
    link.download = "澳洲租房最全全流程攻略.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="max-w-screen-lg mx-auto my-12 px-6 min-h-[80vh]">
      <h1 className="text-3xl font-bold mb-8 text-center">{t('title')}</h1>
      
      {showLoginMessage && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded mb-6 flex items-center">
          <Lock className="w-5 h-5 mr-2" />
          <div>
            <p className="font-medium">{t('login-required')}</p>
            <p className="text-sm">{t('please-login')}</p>
          </div>
          <div className="ml-auto space-x-2">
            <button 
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleGoToLogin}
            >
              {t('go-to-login')}
            </button>
            <button 
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
              onClick={() => setShowLoginMessage(false)}
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 左侧 - 微信群二维码 */}
        <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-5">Qrent租房交流群</h2>
          <div className="relative w-full h-96 mb-6">
            <Image 
              src="/resources/wechat-group.png" 
              alt="Qrent租房交流群" 
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-center text-gray-700 mb-3">扫码加入种子用户租房交流群</p>
          <p className="text-center text-gray-500 text-sm">该二维码7天内有效，重新进入将更新</p>
        </div>

        {/* 右侧 - PDF下载 */}
        <div className="bg-white p-8 rounded-lg shadow-md flex flex-col">
          <div className="flex items-start mb-5">
            <div className="text-blue-primary mr-4">
              <FileText className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold">澳洲租房最全全流程攻略</h3>
              <p className="text-gray-600 mt-2">为留学生精心准备的澳洲租房完整指南，从选区到签约全程覆盖</p>
            </div>
          </div>
          
          <div className="flex-grow mb-6">
            <div className="relative w-full h-80 bg-gray-100 rounded-md overflow-hidden">
              <Image 
                src="/resources/first-page.jpg" 
                alt="PDF预览" 
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={handleDownload}
              className={`w-full flex items-center justify-center gap-2 px-4 py-4 rounded-md mb-3 ${
                !userInfo
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-blue-primary text-white hover:bg-blue-700'
              }`}
            >
              {!userInfo ? (
                <><Lock className="w-5 h-5" /> {t('login-to-download')}</>
              ) : (
                <><Download className="w-5 h-5" /> {t('download-pdf')}</>
              )}
            </button>
            
            {userInfo && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 text-sm flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  PDF文档密码: <span className="font-bold ml-2">www.qrent.rent</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-12 p-6 bg-blue-50 rounded-lg text-center">
        <h3 className="text-xl font-semibold mb-3 text-blue-800">更多澳洲租房资源即将上线</h3>
        <p className="text-gray-700">我们正在准备更多实用的澳洲租房资源，敬请期待！</p>
      </div>
    </div>
  );
} 