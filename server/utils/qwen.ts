import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

/**
 * 文字建模使用的 Qwen（阿里云百炼 / DashScope，OpenAI 兼容模式）客户端。
 *
 * 只保留建模链路需要的四个能力：建客户端、纯文字对话、JSON 容错解析。
 * 图片输入同样走本客户端的 chat.completions，由调用方拼装 image_url 内容块。
 */

export const qwenConfig = {
  apiKey: process.env.DASHSCOPE_API_KEY || '',
  baseUrl: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  /** 图片输入：视觉模型。 */
  visionModel: process.env.QWEN_MODEL || 'qwen-vl-max',
  /** 长提示词：文档模型。 */
  docModel: process.env.QWEN_DOC_MODEL || 'qwen3-max',
  /** 短提示词：轻量模型，延迟更低。 */
  flashModel: process.env.QWEN_FLASH_MODEL || 'qwen-flash',
  /** 短于该长度的提示词走 flash 模型。 */
  flashPromptThreshold: 200,
}

export function createQwenClient(): OpenAI {
  if (!qwenConfig.apiKey) {
    throw new Error('DASHSCOPE_API_KEY 未配置，请在 .env 中设置')
  }
  return new OpenAI({
    apiKey: qwenConfig.apiKey,
    baseURL: qwenConfig.baseUrl,
  })
}

export interface QwenResponse {
  rawText: string
  usage: OpenAI.CompletionUsage | undefined
}

/** 纯文本对话；提示词很短时自动切到轻量模型。 */
export async function callQwenDoc(prompt: string, systemPrompt: string): Promise<QwenResponse> {
  const client = createQwenClient()
  const response = await client.chat.completions.create({
    model: prompt.length < qwenConfig.flashPromptThreshold ? qwenConfig.flashModel : qwenConfig.docModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: [{ type: 'text', text: prompt }] },
    ] as ChatCompletionMessageParam[],
  })
  return {
    rawText: response.choices[0]?.message?.content || '',
    usage: response.usage,
  }
}

/** 解析模型返回的 JSON：容忍纯文本、```json 代码块和前后缀文字。 */
export function parseQwenJson(rawText: string): unknown {
  try { return JSON.parse(rawText); } catch {}

  const mdMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/)
  if (mdMatch) {
    try { return JSON.parse(mdMatch[1]); } catch {}
  }

  const braceMatch = rawText.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch {}
  }

  return null
}