import os
import re
import dashscope
import pandas as pd
from tqdm import tqdm
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
load_dotenv('.env')

API_KEY_POINT = os.getenv('API_KEY_POINT')
MODEL_NAME = "qwen-plus-1220"

today_date = datetime.now()
current_date = today_date.strftime('%y%m%d')

# 两个目标文件
output_file1 = f"UNSW_rentdata_{current_date}.csv"
output_file2 = f"USYD_rentdata_{current_date}.csv"

# ========== 房屋打分相关配置 ==========
NUM_CALLS = 2         # 调用次数
SCORES_PER_CALL = 4   # 每次调用返回4组评分
TOTAL_SCORES = NUM_CALLS * SCORES_PER_CALL

SYSTEM_PROMPT = """你是一位专业的房屋居住质量评估员，需要对房屋进行“分项打分”和“总评分”，标准如下：
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
                api_key=API_KEY_POINT ,
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
    desc = row['description']
    if pd.isna(desc) or not desc.strip():
        scores = [0] * TOTAL_SCORES
        avg_score = 0
    else:
        scores = call_model_for_scores(desc)
        avg_score = sum(scores) / len(scores) if scores else 0
    return (idx, scores, avg_score)

def score_properties_parallel(df: pd.DataFrame, max_workers=5) -> pd.DataFrame:
    if 'description' not in df.columns:
        raise ValueError("do not have 'description'")
    for i in range(1, TOTAL_SCORES + 1):
        if f"Score_{i}" not in df.columns:
            df[f"Score_{i}"] = None
    if 'averageScore' not in df.columns:
        df['averageScore'] = None
    to_score = df[df['averageScore'].isna()]
    print(f"num of the marking: {len(to_score)}")
    if len(to_score) == 0:
        return df
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for idx, row in to_score.iterrows():
            futures.append(executor.submit(process_one_row_scoring, idx, row))
        for f in tqdm(as_completed(futures), total=len(futures), desc="marking"):
            results.append(f.result())
    for (idx, scores, avg_score) in results:
        base_col = 1
        for score_val in scores:
            df.at[idx, f"Score_{base_col}"] = score_val
            base_col += 1
        df.at[idx, 'averageScore'] = avg_score
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
            api_key=API_KEY_POINT ,
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
            # Remove any "Keywords:" prefix if exists, case-insensitive.
            if assistant_msg.lower().startswith("keywords:"):
                assistant_msg = assistant_msg[len("keywords:"):].strip()
            return assistant_msg
    except Exception as e:
        print(f"[Description:{description[:20]}...] Keyword extraction failed: {e}")
    return "N/A"

def process_one_row_keywords(idx: int, row: pd.Series) -> (int, str):
    desc = row.get('description', '')
    if pd.isna(desc) or not desc.strip():
        return idx, "N/A"
    keywords = call_model_for_keywords(desc)
    return idx, keywords

def extract_keywords_parallel(df: pd.DataFrame, max_workers=5) -> pd.DataFrame:
    if 'keywords' not in df.columns:
        df['keywords'] = pd.Series(dtype="string")
    else:
        df['keywords'] = df['keywords'].astype("string")
    to_extract = df[df['keywords'].isna()]
    print(f"num of the keywords: {len(to_extract)}")
    if len(to_extract) == 0:
        return df
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for idx, row in to_extract.iterrows():
            futures.append(executor.submit(process_one_row_keywords, idx, row))
        for f in tqdm(as_completed(futures), total=len(futures), desc="finding keywords"):
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
    desc = row.get('description', '')
    if pd.isna(desc) or not desc.strip():
        return idx, "N/A"
    kw_cn = call_model_for_keywords_cn(desc)
    return idx, kw_cn

def extract_keywords_cn_parallel(df: pd.DataFrame, max_workers=5) -> pd.DataFrame:
    if 'descriptionCN' not in df.columns:
        df['descriptionCN'] = pd.Series(dtype="string")
    else:
        df['descriptionCN'] = df['descriptionCN'].astype("string")
    to_extract = df[df['descriptionCN'].isna()]
    print(f"num of the Chinese keywords: {len(to_extract)}")
    if len(to_extract) == 0:
        return df
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for idx, row in to_extract.iterrows():
            futures.append(executor.submit(process_one_row_keywords_cn, idx, row))
        for f in tqdm(as_completed(futures), total=len(futures), desc="finding Chinese keywords"):
            results.append(f.result())
    for (idx, kw_cn) in results:
        df.at[idx, 'descriptionCN'] = str(kw_cn)
    return df

def process_missing_scores_and_keywords(file_path: str):
    if not os.path.exists(file_path):
        print(f" {file_path} do not exist.")
        return
    df = pd.read_csv(file_path, encoding="utf-8-sig")
    df = score_properties_parallel(df, max_workers=2)
    df = extract_keywords_cn_parallel(df, max_workers=2)
    df = extract_keywords_parallel(df, max_workers=2)
    
    # 调整列顺序：将 descriptionCN 插入到 description 与 publishedAt 之间
    cols = list(df.columns)
    if "description" in cols and "publishedAt" in cols:
        if "descriptionCN" in cols:
            cols.remove("descriptionCN")
        idx = cols.index("description") + 1
        cols.insert(idx, "descriptionCN")
        df = df[cols]
    
    score_cols = [col for col in df.columns if col.startswith("Score_")]
    if "Average Score" in df.columns:
        score_cols.append("Average Score")
    if score_cols:
        df.drop(columns=score_cols, inplace=True)
    df.to_csv(file_path, index=False, encoding="utf-8-sig")
    print(f"update to: {file_path}")

def main():
    for file_path in [output_file1, output_file2]:
        process_missing_scores_and_keywords(file_path)

if __name__ == "__main__":
    main()