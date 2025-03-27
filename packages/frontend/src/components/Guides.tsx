'use client';
import React, { useState } from 'react';
import image1 from '@/public/GuideDocImg/1741930956444.jpg';
import image2 from '@/public/GuideDocImg/1741931031543.jpg';
import image3 from '@/public/GuideDocImg/1741931526590.jpg';
import image4 from '@/public/GuideDocImg/image.jpg';
import image5 from '@/public/GuideDocImg/image (1).jpg';
import image6 from '@/public/GuideDocImg/image (2).jpg';
import image7 from '@/public/GuideDocImg/image (3).jpg';
import image8 from '@/public/GuideDocImg/image (4).jpg';
import image9 from '@/public/GuideDocImg/image (5).jpg';
import image10 from '@/public/GuideDocImg/image (6).jpg';
import image11 from '@/public/GuideDocImg/image (7).jpg';
import image12 from '@/public/GuideDocImg/image (8).jpg';
import image13 from '@/public/GuideDocImg/image (9).jpg';
import image14 from '@/public/GuideDocImg/image (10).jpg';
import image15 from '@/public/GuideDocImg/image (11).jpg';
import image16 from '@/public/GuideDocImg/image (12).jpg';
import image17 from '@/public/GuideDocImg/image (13).jpg';
import image18 from '@/public/GuideDocImg/image (14).jpg';
import image19 from '@/public/GuideDocImg/image (15).jpg';
import image20 from '@/public/GuideDocImg/image (16).jpg';
import image21 from '@/public/GuideDocImg/image (17).jpg';
import image22 from '@/public/GuideDocImg/image (18).jpg';
import image23 from '@/public/GuideDocImg/image (19).jpg';
import image24 from '@/public/GuideDocImg/image (20).jpg';
import image25 from '@/public/GuideDocImg/image (21).jpg';
import image26 from '@/public/GuideDocImg/image (22).jpg';
import qrent from '@/public/qrent.jpg';

// Guides data:
//      tag
//      title
//      author
//      image
//      url

const guidesData = [
  {
    tag: '预算&需求',
    title: '🇦🇺干货（六）终于有人把悉尼租房讲清楚了😭',
    image: image1.src,
    author: '清晏之歌(悉尼留学版',
    url: 'http://xhslink.com/a/LL2vopzx2zO7',
  },
  {
    tag: '预算&需求',
    title: '澳洲留学之人在国内如何租房看这一篇就够了',
    image: image3.src,
    author: '小少椰🥥',
    url: 'http://xhslink.com/a/OqC7NWi7TyO7',
  },
  {
    tag: '预算&需求',
    title: '关于我在悉尼是如何租到200🔪房之整租篇',
    image: image4.src,
    author: '十元梨妹',
    url: 'http://xhslink.com/a/rStoAV8g5SO7',
    recommended: true,
  },
  {
    tag: '预算&需求',
    title: '关于我在悉尼是如何租到200🔪房之整租篇1',
    image: image5.src,
    author: '十元梨妹',
    url: 'http://xhslink.com/a/c7ulq5lTqTO7',
    recommended: true,
  },
  {
    tag: '预算&需求',
    title: '土澳留子🇦🇺学生公寓踩过的坑 悉大附近',
    image: image6.src,
    author: 'Kat琳',
    url: 'http://xhslink.com/a/cynavE8a4ZO7',
  },
  {
    tag: '了解房源&准备材料',
    title: '申请材料',
    image: qrent.src,
    url: '/prepareDocuments',
    admin: true,
  },
  {
    tag: '预算&需求',
    title: 'Scape Darling Square入住体验',
    image: image7.src,
    author: '梦想是吃很多土豆',
    url: 'http://xhslink.com/a/yOnXK8G9c0O7',
  },
  {
    tag: '区域&平台',
    title: '澳洲租房小攻略（以realestate为例',
    image: image8.src,
    author: 'Jessie.S',
    url: 'http://xhslink.com/a/lqnHoF4l4yO7',
  },
  {
    tag: '区域&平台',
    title: '新南热门租房区域分析导图——租哪的房',
    image: image9.src,
    author: '我不是闲狗',
    url: 'http://xhslink.com/a/9exdzBU94QO7',
  },
  {
    tag: '区域&平台',
    title: '悉尼大学租房攻略 | 纯干货无广✅',
    image: image10.src,
    author: '红薯🍠',
    url: 'http://xhslink.com/a/FtzgRq9ofRO7',
  },
  {
    tag: '区域&平台',
    title: 'USYD附近租房攻略（下期出UNSW）',
    image: image11.src,
    author: 'Jake在澳洲',
    url: 'http://xhslink.com/a/OofrJU22SRO7',
  },
  {
    tag: '区域&平台',
    title: '澳洲留学一个月生活费参考',
    image: image12.src,
    author: '我不吃豆角',
    url: 'http://xhslink.com/a/Q7JVZwL1u3O7',
  },
  {
    tag: '区域&平台',
    title: '2k字干货 | 🇦🇺UNSW附近租房区域介绍',
    image: image13.src,
    author: 'Sherri悉尼日记',
    url: 'http://xhslink.com/a/GUzbDPtUZaP7',
  },
  {
    tag: '区域&平台',
    title: '快速筛房',
    image: qrent.src,
    url: '/findAHome',
    admin: true,
  },
  {
    tag: '了解房源&准备材料',
    title: '国内0租房经验澳洲留学租房经验分享',
    image: image14.src,
    author: '猫冰果',
    url: 'http://xhslink.com/a/6t3mOofT7yO7',
  },
  {
    tag: '了解房源&准备材料',
    title: '🏠澳洲租房代看房保姆级清单！+申请技巧',
    image: image15.src,
    author: '我不是闲狗',
    url: 'http://xhslink.com/a/9yzyD68GpQO7',
  },

  {
    tag: '了解房源&准备材料',
    title: '被澳洲房东夸赞的cover letter长什么样',
    image: image16.src,
    author: '我不吃豆角',
    url: 'http://xhslink.com/a/pDTA9IbAH5O7',
  },
  {
    tag: '了解房源&准备材料',
    title: 'realestate 租房心得',
    image: image17.src,
    author: '好好拉屎',
    url: 'http://xhslink.com/a/2hqYoxWjx6O7',
  },
  {
    tag: '推进看房',
    title: '和四十个人抢房源当天收到offer的经验分享',
    image: image18.src,
    author: '勾勾勾大姐',
    url: 'http://xhslink.com/a/lrZcrRZ7mzO7',
  },
  {
    tag: '推进看房',
    title: '是谁在realestate上租房 申的全中👏',
    image: image19.src,
    author: '留子小麦努力中（essay版）',
    url: 'http://xhslink.com/a/BmuiuL7rN4O7',
  },
  {
    tag: '推进看房',
    title: '近期悉尼租房问题回答（申请房子必备文件）',
    image: image20.src,
    author: '十元梨妹',
    url: 'http://xhslink.com/a/lbnEck6Eo5O7',
  },
  {
    tag: '预算&需求',
    title: '🇦🇺生存指南｜全网唯一保姆级租房教程',
    image: image2.src,
    author: '唐喵喵issa',
    url: 'http://xhslink.com/a/GTOiN6YcKzO7',
  },
  {
    tag: '签约&押金',
    title: '悉尼租房的小朋友，不允许你不知道这些事',
    image: image21.src,
    author: '山顶见',
    url: 'http://xhslink.com/a/llqFvPYdwOO7',
  },
  {
    tag: '签约&押金',
    title: '科普：澳洲租房如何正规交Bond 附真实截图',
    image: image22.src,
    author: '靠谱PM Lance',
    url: 'http://xhslink.com/a/h5p9bYA4NOO7',
  },
  {
    tag: '签约&押金',
    title: '2024悉尼租房合同攻略❗再也不担心黑心房东',
    image: image23.src,
    author: '悉尼租房',
    url: 'http://xhslink.com/a/4GbWQRCm85O7',
  },
  {
    tag: '租后事项',
    title: '澳洲租房如何维权以及免费维权途径1',
    image: image24.src,
    author: 'Momo（法师养成版）',
    url: 'http://xhslink.com/a/oZ8ThHgVVOO7',
  },
  {
    tag: '租后事项',
    title: '澳洲租房前检查攻略❗️condition report',
    image: image25.src,
    author: '译文儿',
    url: 'http://xhslink.com/a/Jq32BAOFN7O7',
  },
  {
    tag: '租后事项',
    title: '澳洲留学生必看❗租🏠如何开通水电煤网？',
    image: image26.src,
    author: 'Livia',
    url: 'http://xhslink.com/a/Fhgm06kbnaP7',
  },
];

const Guides = () => {
  const [selectedTag, setSelectedTag] = useState('All');

  // Filter articles based on selected tag
  const filteredArticles =
    selectedTag === 'All' ? guidesData : guidesData.filter(article => article.tag === selectedTag);

  return (
    <>
      <div className="flex justify-between mb-3 ">
        {/* Tags */}
        <div className="flex justify-between mb-6">
          <div className="flex flex-wrap gap-4">
            {[
              'All',
              '预算&需求',
              '区域&平台',
              '了解房源&准备材料',
              '推进看房',
              '签约&押金',
              '租后事项',
            ].map(tag => (
              <span
                key={tag}
                className={`px-4 py-1 rounded-full text-sm cursor-pointer ${
                  selectedTag === tag ? 'bg-blue-primary text-white' : 'bg-gray-200 text-gray-600'
                } hover:bg-blue-primary hover:text-white`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Guides (Articles Grid) */}
      <div className="h-[580px] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1 */}
          <div className="flex flex-col gap-8">
            {filteredArticles
              .slice(0, Math.ceil(filteredArticles.length / 4))
              .map((guide, index) => (
                <a
                  key={index}
                  href={guide.url}
                  className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col relative"
                >
                  {guide.recommended && (
                    <div className="absolute bottom-3 right-3 bg-[#FF9800] text-right text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                      推荐
                    </div>
                  )}
                  {guide.admin && (
                    <div className="absolute bottom-3 left-3 bg-[#FF9800] text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                      官方
                    </div>
                  )}
                  <img src={guide.image} alt={guide.title} className="w-full object-cover" />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{guide.title}</h3>
                    <p className="text-sm text-gray-600">{guide.author}</p>
                  </div>
                </a>
              ))}
          </div>
          {/* Column 2 */}
          <div className="flex flex-col gap-8">
            {filteredArticles
              .slice(
                Math.ceil(filteredArticles.length / 4),
                Math.ceil(filteredArticles.length / 4) * 2
              )
              .map((guide, index) => (
                <a
                  key={index}
                  href={guide.url}
                  className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col relative"
                >
                  {guide.recommended && (
                    <div className="absolute bottom-3 right-3 bg-[#FF9800] text-right text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                      推荐
                    </div>
                  )}
                  {guide.admin && (
                    <div className="absolute bottom-3 left-3 bg-[#FF9800] text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                      官方
                    </div>
                  )}
                  <img src={guide.image} alt={guide.title} className="w-full object-cover" />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{guide.title}</h3>
                    <p className="text-sm text-gray-600">{guide.author}</p>
                  </div>
                </a>
              ))}
          </div>
          {/* Column 3 */}
          <div className="flex flex-col gap-8">
            {filteredArticles
              .slice(
                Math.ceil(filteredArticles.length / 4) * 2,
                Math.ceil(filteredArticles.length / 4) * 3
              )
              .map((guide, index) => (
                <a
                  key={index}
                  href={guide.url}
                  className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col relative"
                >
                  {guide.recommended && (
                    <div className="absolute bottom-3 right-3 bg-[#FF9800] text-right text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                      推荐
                    </div>
                  )}
                  {guide.admin && (
                    <div className="absolute bottom-3 left-3 bg-[#FF9800] text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                      官方
                    </div>
                  )}
                  <img src={guide.image} alt={guide.title} className="w-full object-cover" />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{guide.title}</h3>
                    <p className="text-sm text-gray-600">{guide.author}</p>
                  </div>
                </a>
              ))}
          </div>
          {/* Column 4 */}
          <div className="flex flex-col gap-8">
            {filteredArticles
              .slice(
                Math.ceil(filteredArticles.length / 4) * 3,
                Math.ceil(filteredArticles.length / 4) * 4
              )
              .map((guide, index) => (
                <a
                  key={index}
                  href={guide.url}
                  className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col relative"
                >
                  {guide.recommended && (
                    <div className="absolute bottom-3 right-3 bg-[#FF9800] text-right text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                      推荐
                    </div>
                  )}
                  {guide.admin && (
                    <div className="absolute bottom-3 left-3 bg-[#FF9800] text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                      官方
                    </div>
                  )}
                  <img src={guide.image} alt={guide.title} className="w-full object-cover" />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{guide.title}</h3>
                    <p className="text-sm text-gray-600">{guide.author}</p>
                  </div>
                </a>
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Guides;
