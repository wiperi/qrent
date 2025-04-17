'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Download, ExternalLink } from 'lucide-react';
import Image from 'next/image';

// 定义资源类型接口
interface Resource {
  id: number;
  titleKey: string;
  descriptionKey: string;
  fileName: string;
}

export default function ResourceCenter() {
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
    // 执行下载操作
    const link = document.createElement('a');
    link.href = `/resources/rental-guide.pdf`;
    link.download = "澳洲租房最全全流程攻略.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-screen-lg mx-auto my-12 px-6 min-h-[80vh]">
      <h1 className="text-3xl font-bold mb-8 text-center">{t('title')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 左侧 - 微信群二维码 */}
        <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-5">Qrent租房交流群</h2>
          <div className="relative w-full h-[400px] mb-6">
            <Image 
              src="/resources/wechat-group.png" 
              alt="Qrent租房交流群" 
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-center text-gray-800 text-lg mb-3 font-medium">扫码加入种子用户租房交流群</p>
          <p className="text-center text-gray-600 text-base">租房问题全解答！</p>
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
              className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-md mb-3 bg-blue-primary text-white hover:bg-blue-700"
            >
              <Download className="w-5 h-5" /> {t('download-pdf')}
            </button>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-lg flex items-center justify-center font-medium">
                <ExternalLink className="w-5 h-5 mr-2" />
                PDF文档密码: <span className="font-bold ml-2 text-lg">www.qrent.rent</span>
              </p>
            </div>
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