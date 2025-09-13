import os
import time
import pandas as pd
import numpy as np
import dashscope
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import glob
import re
from datetime import datetime
from dotenv import load_dotenv
import os

# Try to load .env from multiple possible locations
env_paths = [
    '.env',
    '../.env', 
    '../../.env',
    '/app/.env'
]

for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break
else:
    # If no .env file found, try to load from environment
    load_dotenv()

API_KEY_POINT = os.getenv('PROPERTY_RATING_API_KEY')
MODEL_NAME = "qwen-plus-1220"

today_date = datetime.now()
current_date = today_date.strftime('%y%m%d')

# 三个目标文件
output_file1 = f"UNSW_rentdata_{current_date}.csv"
output_file2 = f"USYD_rentdata_{current_date}.csv"
output_file3 = f"UTS_rentdata_{current_date}.csv"

# ========== 房屋打分相关配置 ==========
NUM_CALLS = 2         # 调用次数
SCORES_PER_CALL = 4   # 每次调用返回4组评分
TOTAL_SCORES = NUM_CALLS * SCORES_PER_CALL

SYSTEM_PROMPT = """你是一位专业的房屋居住质量评估员，需要对房屋进行"分项打分"和"总评分"，标准如下：
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
房屋质量:6.5, 居住体验:7, 房屋内配套:5, 总评分:12.3
房屋质量:3, 居住体验:4, 房屋内配套:2.5, 总评分:6.3
房屋质量:9.5, 居住体验:8.5, 房屋内配套:9, 总评分:18
房屋质量:2, 居住体验:2.5, 房屋内配套:3, 总评分:5.5
"""

def build_user_prompt(description: str) -> str:
    return (
        "根据以下房源描述，对房屋质量、居住体验、房屋内部配套设施三个维度分别打 0~10 分，并给出总评分（0~20分）。\n"
        "请参考系统提示中的具体扣分/加分建议。\n"
        f"房源描述：{description}\n"
        "请严格按系统提示输出 4 组打分，每组一行，不要输出任何多余的文字。"
    )

def parse_four_sets_of_scores(text: str) -> list:
    lines = text.strip().split("\n")
    if len(lines) != 4:
        return [0, 0, 0, 0]
    results = []
    for line in lines:
        match = re.search(r"总评分\s*:\s*(\d+(\.\d+)?)", line)
        if not match:
            results.append(0)
            continue
        try:
            score_val = float(match.group(1))
            results.append(score_val if 0 <= score_val <= 20 else 0)
        except:
            results.append(0)
    return results

def call_model_for_scores(description: str) -> list:
    all_scores = []
    for call_idx in range(NUM_CALLS):
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": build_user_prompt(description)},
        ]
        try:
            response = dashscope.Generation.call(
                api_key=API_KEY_POINT,
                model=MODEL_NAME,
                messages=messages,
                result_format='message',
                parameters={
                    "temperature": 0.7,
                    "max_tokens": 150,
                    "top_p": 0.9
                }
            )
            if response and response.output and response.output.get("choices"):
                assistant_msg = response.output["choices"][0]["message"]["content"]
                scores_4 = parse_four_sets_of_scores(assistant_msg)
            else:
                scores_4 = [0, 0, 0, 0]
        except Exception as e:
            print(f"[the:{description[:20]}...] fail: {e}")
            scores_4 = [0, 0, 0, 0]
        all_scores.extend(scores_4)
    return all_scores

def process_one_row_scoring(idx: int, row: pd.Series) -> (int, list, float):
    desc = row.get('description_en', '')
    if pd.isna(desc) or not desc.strip():
        scores = [0] * TOTAL_SCORES
        avg_score = 0
    else:
        scores = call_model_for_scores(desc)
        avg_score = sum(scores) / len(scores) if scores else 0
    return (idx, scores, avg_score)

def score_properties_parallel(df: pd.DataFrame, max_workers=5) -> pd.DataFrame:
    for i in range(1, TOTAL_SCORES + 1):
        if f"Score_{i}" not in df.columns:
            df[f"Score_{i}"] = None
    if 'average_score' not in df.columns:
        df['average_score'] = None
    
    to_score = df[
        (df['average_score'].isna()) | 
        (df['average_score'] == 0)
    ]
    print(f"Number of properties to score (NaN or 0): {len(to_score)}")
    
    if len(to_score) == 0:
        return df
    
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for idx, row in to_score.iterrows():
            futures.append(executor.submit(process_one_row_scoring, idx, row))
        
        for f in tqdm(as_completed(futures), total=len(futures), desc="Scoring properties"):
            results.append(f.result())
    
    for (idx, scores, avg_score) in results:
        for i, score_val in enumerate(scores, 1):
            if i <= TOTAL_SCORES:
                df.at[idx, f"Score_{i}"] = score_val
        df.at[idx, 'average_score'] = avg_score
        
    return df

def call_model_for_keywords(description: str) -> str:
    messages = [
        {
            'role': 'system',
            'content': (
                "Extract concise keywords from the given property description. "
                "Include aspects such as location, property features, and available facilities. "
                "Output in one line without any extra text, in English. "
                "For example: Keywords: 3-bedroom apartment, large courtyard, stylish tiled floor, built-in wardrobes, "
                "master suite bathroom, air conditioning, ample storage, open kitchen, SMEG appliances, NBN ready, "
                "resort-style amenities, indoor heated pool, gym, private landscaped courtyard."
            )
        },
        {
            'role': 'user',
            'content': description
        }
    ]
    try:
        response = dashscope.Generation.call(
            api_key=API_KEY_POINT,
            model=MODEL_NAME,
            messages=messages,
            result_format='message',
            parameters={
                "temperature": 0.7,
                "max_tokens": 150,
                "top_p": 0.9
            }
        )
        if response and response.output and response.output.get("choices"):
            assistant_msg = response.output["choices"][0]["message"]["content"].strip()
            if assistant_msg.lower().startswith("keywords:"):
                assistant_msg = assistant_msg[len("keywords:"):].strip()
            return assistant_msg
    except Exception as e:
        print(f"[Description:{description[:20]}...] Keyword extraction failed: {e}")
    return "N/A"

def process_one_row_keywords(idx: int, row: pd.Series) -> (int, str):
    desc = row.get('description_en', '')
    if pd.isna(desc) or not desc.strip():
        return idx, "N/A"
    keywords = call_model_for_keywords(desc)
    return idx, keywords

def extract_keywords_parallel(df: pd.DataFrame, max_workers=5) -> pd.DataFrame:
    if 'keywords' not in df.columns:
        df['keywords'] = pd.Series(dtype="string")
    else:
        df['keywords'] = df['keywords'].astype("string")
    
    to_extract = df[
        (df['keywords'].isna()) | 
        (df['keywords'] == 'N/A') |
        (df['keywords'] == '')
    ]
    print(f"Number of properties needing keyword extraction: {len(to_extract)}")
    
    if len(to_extract) == 0:
        return df
    
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for idx, row in to_extract.iterrows():
            futures.append(executor.submit(process_one_row_keywords, idx, row))
        
        for f in tqdm(as_completed(futures), total=len(futures), desc="Extracting keywords"):
            results.append(f.result())
    
    for (idx, kw) in results:
        df.at[idx, 'keywords'] = str(kw)
    
    return df

def call_model_for_keywords_cn(description: str) -> str:
    messages = [
        {
            'role': 'system',
            'content': (
                "从给定的房屋描述中提取关键词，关键词请用中文输出。"
                "要求关键词应包含房屋的位置、特征和可用设施。"
                "只输出关键词，用逗号分隔，不要包含其他文字。"
            )
        },
        {
            'role': 'user',
            'content': description
        }
    ]
    try:
        response = dashscope.Generation.call(
            api_key=API_KEY_POINT,
            model=MODEL_NAME,
            messages=messages,
            result_format='message',
            parameters={
                "temperature": 0.7,
                "max_tokens": 150,
                "top_p": 0.9
            }
        )
        if response and response.output and response.output.get("choices"):
            assistant_msg = response.output["choices"][0]["message"]["content"].strip()
            if assistant_msg.lower().startswith("关键词:"):
                assistant_msg = assistant_msg[len("关键词:"):].strip()
            return assistant_msg
    except Exception as e:
        print(f"[Description:{description[:20]}...] Chinese keyword extraction failed: {e}")
    return "N/A"

def process_one_row_keywords_cn(idx: int, row: pd.Series) -> (int, str):
    desc = row.get('description_en', '')
    if pd.isna(desc) or not desc.strip() or desc == 'N/A':
        return idx, "N/A"
    kw_cn = call_model_for_keywords_cn(desc)
    return idx, kw_cn

def extract_keywords_cn_parallel(df: pd.DataFrame, max_workers=5) -> pd.DataFrame:
    if 'description_cn' not in df.columns:
        df['description_cn'] = pd.Series(dtype="string")
    else:
        df['description_cn'] = df['description_cn'].astype("string")
    
    to_extract = df[
        (df['description_cn'].isna()) | 
        (df['description_cn'] == 'N/A') |
        (df['description_cn'] == '')
    ]
    print(f"Number of properties needing Chinese keyword extraction: {len(to_extract)}")
    
    if len(to_extract) == 0:
        return df
    
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for idx, row in to_extract.iterrows():
            futures.append(executor.submit(process_one_row_keywords_cn, idx, row))
        
        for f in tqdm(as_completed(futures), total=len(futures), desc="Extracting Chinese keywords"):
            results.append(f.result())
    
    for (idx, kw_cn) in results:
        df.at[idx, 'description_cn'] = str(kw_cn)
    
    return df

def process_missing_scores_and_keywords(file_path: str):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    print(f"Processing file: {file_path}")
    df = pd.read_csv(file_path, encoding="utf-8-sig")
    
    df = score_properties_parallel(df, max_workers=2)
    
    df = extract_keywords_cn_parallel(df, max_workers=2)
    
    df = extract_keywords_parallel(df, max_workers=2)
    
    cols = df.columns.tolist()
    if 'description_cn' in cols and 'description_en' in cols and 'published_at' in cols:
        cols.remove('description_cn')
        desc_en_idx = cols.index('description_en')
        cols.insert(desc_en_idx + 1, 'description_cn')
        df = df[cols]
    
    df.to_csv(file_path, index=False, encoding='utf-8-sig')
    print(f"File processed and saved: {file_path}")

def find_today_csv_files():
    today_files = [output_file1, output_file2, output_file3]
    
    existing_files = []
    for file in today_files:
        if os.path.exists(file):
            existing_files.append(file)
        else:
            print(f"donot find: {file}")
    
    return existing_files

def main():
    
    today_files = find_today_csv_files()
    
    if not today_files:
        print("donot find today file")
        return
    
    print(f"find {len(today_files)}:")
    for file in today_files:
        print(f"  - {file}")
    
    # 处理每个文件
    for file_path in today_files:
        print(f"\n complete: {file_path}")
        try:
            process_missing_scores_and_keywords(file_path)
            print(f"file finish: {file_path}")
        except Exception as e:
            print(f": {file_path}, error: {e}")
    
    print(f"\ncomplete!")

if __name__ == "__main__":
    main()