// 服务商预设 · 灵感引擎工坊 · bin1732
const PRESETS = {
  builtin:     { label: '内置助手', base_url: '', model: '', key_url: '', local: true },
  deepseek:    { label: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', model: '', key_url: 'https://platform.deepseek.com/api_keys',
                 check: 'deepseek-flash', known: ['deepseek-flash', 'deepseek-v4-pro'] },
  qwen:        { label: '通义千问', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: '', key_url: 'https://dashscope.aliyuncs.com/apiKey',
                 check: 'qwen-turbo', known: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-flash', 'qwen-long'] },
  zhipu:       { label: '智谱GLM', base_url: 'https://open.bigmodel.cn/api/paas/v4', model: '', key_url: 'https://open.bigmodel.cn/usercenter/apikeys',
                 check: 'glm-4-flash', known: ['glm-4-flash', 'glm-4-air', 'glm-4-plus', 'glm-4-long', 'glm-4.5'] },
  moonshot:    { label: '月之暗面', base_url: 'https://api.moonshot.cn/v1', model: '', key_url: 'https://platform.moonshot.cn/console/api-keys',
                 check: 'kimi-k2.6', known: ['kimi-k2.6', 'kimi-k2.7-code'] },
  siliconflow: { label: '硅基流动', base_url: 'https://api.siliconflow.cn/v1', model: '', key_url: 'https://cloud.siliconflow.cn/account/ak',
                 check: 'Qwen/Qwen2.5-7B-Instruct', known: ['Qwen/Qwen2.5-7B-Instruct', 'Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1'] },
  openai:      { label: 'OpenAI', base_url: 'https://api.openai.com/v1', model: '', key_url: 'https://platform.openai.com/api-keys',
                 check: 'gpt-4o-mini', known: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'] },
  lmstudio:    { label: 'LM Studio', base_url: 'http://127.0.0.1:1234/v1', model: '', key_url: '', local: true },
  ollama:      { label: 'Ollama', base_url: 'http://127.0.0.1:11434', model: '', key_url: '', local: true },
};

const DEFAULT_CONFIG = { provider: 'builtin', base_url: '', api_key: '', model: '' };

module.exports = { PRESETS, DEFAULT_CONFIG };
