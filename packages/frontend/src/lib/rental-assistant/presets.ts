export const modelProviders = ['deepseek', 'qwen', 'yuanbao'] as const;
export type ModelProvider = (typeof modelProviders)[number];

export const modelPresets = {
  deepseek: {
    label: { zh: 'DeepSeek', en: 'DeepSeek' },
    keyLabel: { zh: 'DeepSeek 开放平台 Key', en: 'DeepSeek Platform key' },
    help: 'https://api-docs.deepseek.com/',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-flash',
    options: { thinking: { type: 'disabled' } },
  },
  qwen: {
    label: { zh: 'Qwen', en: 'Qwen' },
    keyLabel: { zh: '阿里云百炼北京地域 Key', en: 'Alibaba Cloud Model Studio Beijing key' },
    help: 'https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    options: { enable_thinking: false },
  },
  yuanbao: {
    label: { zh: '腾讯元宝', en: 'Tencent Yuanbao' },
    keyLabel: { zh: '腾讯云 TokenHub 的混元 Key', en: 'Tencent Cloud TokenHub Hunyuan key' },
    help: 'https://cloud.tencent.com/document/product/1823/132252',
    baseUrl: 'https://tokenhub.tencentmaas.com/v1',
    model: 'hy4',
    options: { reasoning_effort: 'no_think' },
  },
} satisfies Record<
  ModelProvider,
  {
    label: Record<'zh' | 'en', string>;
    keyLabel: Record<'zh' | 'en', string>;
    help: string;
    baseUrl: string;
    model: string;
    options: Record<string, unknown>;
  }
>;
