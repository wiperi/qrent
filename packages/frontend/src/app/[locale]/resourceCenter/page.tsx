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
    // 确保源文件名与下载名一致，或使用Blob方式处理
    fetch(`/resources/rental-guide-0417.pdf`)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        link.href = url;

        link.download = "Qrent澳洲租房全流程攻略.pdf";

        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      });
  };

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* 左侧 - 二维码 */}
          <div className="md:w-1/2 flex flex-col items-center justify-center">
            <div className="w-full max-w-lg">
              <div className="mb-8 text-center">
                <Image 
                  src="/QrentLogo.jpg" 
                  alt="Qrent" 
                  width={180}
                  height={70}
                  className="object-contain mx-auto"
                />
              </div>
              
              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">加入租房社群</h2>
                <p className="text-center text-gray-600 text-base mb-8">有问题实时解答！</p>
                
                <div className="border-2 border-[#4D8BF8] rounded-xl px-5 py-6 w-96 flex flex-col items-center justify-center mb-6 relative bg-white">
                  <Image 
                    src="/resources/wechat-group-0417.jpg" 
                    alt="Qrent租房交流群" 
                    width={320}
                    height={320}
                    className="object-contain"
                    priority
                  />
                </div>
                
                <div className="bg-blue-50 rounded-full px-6 py-3">
                  <p className="text-center text-blue-600 text-base font-medium">扫码加入Qrent租房交流群</p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧 - 资源列表和PDF */}
          <div className="md:w-1/2 bg-[#4D8BF8] rounded-2xl text-white flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-6 left-6 bg-white bg-opacity-20 rounded-full px-4 py-1 z-10">
              <h1 className="text-sm font-medium text-white">下载中心</h1>
            </div>
            
            <div className="w-full px-6 pt-20 pb-2">
              <h2 className="text-xl font-semibold mb-2">01. 澳洲租房全流程攻略 (1w+ 字)</h2>
            </div>

            <div className="w-full px-4 mb-6">
              <div className="rounded-xl overflow-hidden shadow-md w-full">
                <div className="relative w-full aspect-[5/4]">
                  <Image 
                    src="/resources/first-page-new.png" 
                    alt="PDF预览" 
                    fill
                    className="object-cover object-top"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="w-full flex justify-center px-4 mt-auto mb-4">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-blue-600 hover:bg-gray-100 font-semibold"
              >
                <Download className="w-5 h-5" /> 下载PDF
              </button>
            </div>
            
            <div className="w-full px-4 mb-6">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg text-center">
                <p className="text-white flex items-center justify-center font-medium">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  PDF文档密码: <span className="font-bold ml-2">www.qrent.rent</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 