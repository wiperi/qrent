"""
房产评分服务
使用 AI 模型对房产进行评分和关键词提取
"""
import re
import time
import logging
from typing import List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

import dashscope
from tqdm import tqdm

from ..models import PropertyData
from ..config import settings, ScoringConfig

logger = logging.getLogger(__name__)


# 评分系统提示词
SCORING_SYSTEM_PROMPT = """你是一位专业的房屋居住质量评估员，需要对房屋进行"分项打分"和"总评分"，标准如下：
1. 房屋质量 (0~10 分)：
   - 如果房屋缺少翻新、老旧或有明显缺陷，可给 3 分以下。
   - 普通装修或信息不足，可给 4~6 分。
   - 有翻新、材料优质或描述明确，可给 7~9 分。
   - 高端精装修或全新房，给 10 分。
2. 居住体验 (0~10 分)：
   - 噪音、空间狭小、采光差，可给 3 分以下。
   - 一般居住条件或描述不清，可给 4~6 分。
   - 宽敞、通风良好、配有空调等，可给 7~9 分。
   - 特别舒适、配置高级，可给 10 分。
3. 房屋内部配套设施 (0~10 分)：
   - 若只具备基本设施或缺少描述，可给 3~5 分。
   - 普通现代设施（空调、洗衣机、厨房电器等）可给 6~8 分。
   - 特别齐全、高端智能家居，可给 9~10 分。

总评分 (0~20)：
   = (房屋质量 + 居住体验 + 房屋内部配套设施) / 30 * 20

请一次性给出4组【独立的】打分结果，每组包括：
   房屋质量:X, 居住体验:Y, 房屋内配套:Z, 总评分:W
仅输出以上格式，每组一行，不可包含除数字、小数点、逗号、冒号、换行以外的文本。
示例：
房屋质量:7, 居住体验:6, 房屋内配套:8, 总评分:14.0
房屋质量:8, 居住体验:7, 房屋内配套:7, 总评分:14.7
房屋质量:6, 居住体验:8, 房屋内配套:9, 总评分:15.3
房屋质量:9, 居住体验:6, 房屋内配套:7, 总评分:14.7
"""

# 关键词提取系统提示词（英文）
KEYWORDS_EN_SYSTEM_PROMPT = """从房源描述中提取简洁的关键词，包括以下10个维度：
1.安全性：门禁系统、安保设施等
2.重要家电：空调、烘干机等配置
3.厨房：有无灶台，灶台大小/类型，有无洗碗机、微波炉、烤箱等
4.装修状况：是否带家具，装修风格
5.储物空间：衣柜、储藏室，可容纳床尺寸评估等
6.洗手间：是否干湿分离、配备浴缸等
7.社区配套：健身房、游泳池等公共设施
8.购物：周边有无较大的买菜市场、药店等
9.户外空间：采光状态、景观特色，庭院或阳台私密性评估等
10.地理位置：临近商店、公园、餐厅等

用英文输出，描述中未提及的维度不要输出，关键词数量≤11个，不包含额外文字。
示例格式："large courtyard, built-in wardrobes, master suite bathroom, air conditioning, ample storage, open kitchen, SMEG appliances, NBN ready, indoor heated pool, gym, private landscaped courtyard"
"""

# 关键词提取系统提示词（中文）
KEYWORDS_CN_SYSTEM_PROMPT = """从给定的房屋描述中提取关键词，关键词请用中文输出。
要求关键词应包含房屋的位置、特征和可用设施。
只输出关键词，用逗号分隔，不要包含其他文字。"""


class ScoringService:
    """
    房产评分服务
    使用 DashScope API 进行评分和关键词提取
    """
    
    def __init__(self, config: Optional[ScoringConfig] = None):
        self.config = config or settings.scoring
        api_key = (
            self.config.api_key
            or getattr(settings, "env_property_rating_api_key", None)
            or getattr(settings, "env_dashscope_api_key", None)
        )
        if api_key:
            dashscope.api_key = api_key
    
    def _call_model(
        self, 
        system_prompt: str, 
        user_prompt: str,
        max_retries: int = 3
    ) -> Optional[str]:
        """调用模型 API"""
        for attempt in range(max_retries):
            try:
                messages = [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ]
                
                response = dashscope.Generation.call(
                    model=self.config.model_name,
                    messages=messages,
                    result_format='message',
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens,
                    top_p=0.9
                )
                
                if response.status_code == 200:
                    return response.output.choices[0]['message']['content']
                else:
                    logger.error(f"API 错误: {response.code} - {response.message}")
                    
            except Exception as e:
                logger.error(f"第 {attempt + 1} 次调用失败: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
        
        return None
    
    def _parse_scores(self, response_text: str) -> List[float]:
        """解析评分结果"""
        pattern = r'总评分\s*:\s*(\d+(?:\.\d+)?)'
        matches = re.findall(pattern, response_text, re.IGNORECASE)
        
        scores = []
        for match in matches:
            try:
                score = float(match)
                if 0 <= score <= 20:
                    scores.append(score)
            except:
                continue
        
        return scores
    
    def score_property(self, description: str) -> Tuple[float, List[float]]:
        """
        对单个房产进行评分
        
        Args:
            description: 房产描述
            
        Returns:
            (平均分, 所有分数列表)
        """
        if not description or not description.strip():
            return 0.0, []
        
        user_prompt = (
            f"根据以下房源描述，对房屋质量、居住体验、房屋内部配套设施三个维度分别打 0~10 分，"
            f"并给出总评分（0~20分）。\n"
            f"请参考系统提示中的具体扣分/加分建议。\n"
            f"房源描述：{description}\n"
            f"请严格按系统提示输出 4 组打分，每组一行，不要输出任何多余的文字。"
        )
        
        all_scores = []
        
        for _ in range(self.config.num_calls):
            response = self._call_model(SCORING_SYSTEM_PROMPT, user_prompt)
            if response:
                scores = self._parse_scores(response)
                all_scores.extend(scores)
            time.sleep(1)  # 避免 rate limit
        
        if all_scores:
            avg_score = sum(all_scores) / len(all_scores)
            return round(avg_score, 1), all_scores
        
        return 13.0, []  # 默认分数
    
    def extract_keywords_en(self, description: str) -> str:
        """提取英文关键词"""
        if not description or not description.strip():
            return ""
        
        response = self._call_model(KEYWORDS_EN_SYSTEM_PROMPT, description)
        if response:
            # 清理响应
            keywords = response.strip()
            if keywords.lower().startswith("keywords:"):
                keywords = keywords[len("keywords:"):].strip()
            return keywords
        
        return ""
    
    def extract_keywords_cn(self, description: str) -> str:
        """提取中文关键词"""
        if not description or not description.strip():
            return ""
        
        response = self._call_model(KEYWORDS_CN_SYSTEM_PROMPT, description)
        if response:
            keywords = response.strip()
            if keywords.startswith("关键词:") or keywords.startswith("关键词："):
                keywords = keywords[4:].strip()
            return keywords
        
        return ""
    
    def process_property(self, prop: PropertyData, force_update: bool = False) -> PropertyData:
        """
        处理单个房产的评分和关键词
        
        Args:
            prop: 房产数据
            
        Returns:
            更新后的房产数据
        """
        description = prop.description_en or ""
        
        # 评分
        if force_update or not prop.average_score or prop.average_score == 0:
            avg_score, scores = self.score_property(description)
            prop.average_score = avg_score
            prop.scores = scores
        
        # 英文关键词
        if force_update or not prop.keywords:
            prop.keywords = self.extract_keywords_en(description)
        
        # 中文关键词/描述
        if force_update or not prop.description_cn:
            prop.description_cn = self.extract_keywords_cn(description)
        
        return prop
    
    def process_properties(
        self, 
        properties: List[PropertyData],
        skip_existing: bool = True,
        force_update: bool = False,
        limit: Optional[int] = None,
    ) -> List[PropertyData]:
        """
        批量处理房产评分
        
        Args:
            properties: 房产列表
            skip_existing: 是否跳过已有评分的房产
            
        Returns:
            处理后的房产列表
        """
        to_process: List[PropertyData] = []
        for prop in properties:
            if not prop.description_en:
                continue

            # skip_existing 的语义：只有在“评分 + 关键词(英文/中文) 都已经有值”时才跳过
            has_score = prop.average_score is not None and prop.average_score > 0
            has_keywords = bool(prop.keywords and str(prop.keywords).strip())
            has_cn = bool(prop.description_cn and str(prop.description_cn).strip())

            if (not force_update) and skip_existing and has_score and has_keywords and has_cn:
                continue

            to_process.append(prop)
            if limit is not None and len(to_process) >= limit:
                break
        
        if not to_process:
            logger.info("没有需要评分的房产")
            return properties
        
        logger.info(f"开始处理 {len(to_process)} 个房产的评分")
        
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            futures = {
                executor.submit(self.process_property, prop, force_update): prop 
                for prop in to_process
            }
            
            for future in tqdm(as_completed(futures), total=len(futures), desc="评分进度"):
                try:
                    future.result()
                except Exception as e:
                    logger.error(f"处理失败: {e}")
        
        return properties
