import requests
from getpass import getpass

def test_openai(api_key):
    print("\n[测试 OpenAI API Key 与额度状态]\n")

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 5
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)

        # ---------- 正常情况 ----------
        if resp.status_code == 200:
            print("✔ Key 有效，并且当前额度充足，可正常使用模型。")
            return

        # ---------- 限流（频率超限） ----------
        if resp.status_code == 429:
            data = resp.json()
            err = data.get("error", {})
            code = err.get("code")
            msg = err.get("message", "")

            if code == "insufficient_quota":
                print("✘ Key 有效，但当前账号额度已用完（insufficient_quota）。")
                print("原因：余额为 0 或 Soft Limit / Hard Limit 已触达。")
            elif "rate limit" in msg.lower() or code == "rate_limit_exceeded":
                print("⚠ Key 有效，但触发 Rate Limit（请求过于频繁）。")
            else:
                print("✘ 429 错误：", msg)

            return

        # ---------- 无效 Key ----------
        if resp.status_code == 401:
            print("✘ API Key 无效（401 Unauthorized）")
            return

        # ---------- 其他错误 ----------
        print(f"✘ 发生错误：HTTP {resp.status_code} - {resp.text}")

    except Exception as e:
        print("✘ 请求失败：", e)



def test_bailian(api_key):
    print("\n[测试 通义·百炼 API Key]")
    try:
        url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
        headers = {"Authorization": f"Bearer {api_key}"}
        data = {"model": "qwen-turbo", "input": {"prompt": "hello"}}

        r = requests.post(url, json=data, headers=headers, timeout=10)

        if r.status_code == 200:
            print("✔ 百炼 API Key 有效")
        else:
            print(f"✘ 百炼 API Key 无效：{r.status_code} {r.text}")
    except Exception as e:
        print("✘ 百炼请求失败:", e)


def test_langsmith(api_key):
    print("\n[测试 LangSmith API Key]")
    try:
        url = "https://api.smith.langchain.com/v1/projects"
        headers = {"Authorization": f"Bearer {api_key}"}
        r = requests.get(url, headers=headers, timeout=10)

        if r.status_code == 200:
            print("✔ LangSmith API Key 有效")
        else:
            print(f"✘ LangSmith API Key 无效：{r.status_code} {r.text}")
    except Exception as e:
        print("✘ LangSmith 请求失败:", e)


if __name__ == "__main__":
    print("请输入 API Key（不会回显）")

    openai_key = getpass("OpenAI API Key: ")
    bailian_key = getpass("百炼 API Key: ")
    langsmith_key = getpass("LangSmith API Key: ")

    test_openai(openai_key)
    test_bailian(bailian_key)
    test_langsmith(langsmith_key)
