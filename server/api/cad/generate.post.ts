import { randomUUID } from 'node:crypto'
import { getUserFromToken } from '../../utils/auth'
import { createQwenClient, callQwenDoc, parseQwenJson, qwenConfig } from '../../utils/qwen'
import { cadModelSchema, cadMaterialEditSchema, applyCadMaterialEdit } from '../../utils/cad/schema'
import {
  buildCadSystemPrompt,
  buildCadTextPrompt,
  buildCadImagePrompt,
  buildCadMaterialSystemPrompt,
  buildCadMaterialPrompt,
} from '../../utils/cad/prompts'
import type { CadModel } from '../../../shared/types/cad'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { z } from 'zod'

/** 单次文字描述的长度上限（字符）。超出直接拒绝，避免构造出结构失控的大模型。 */
const MAX_CAD_TEXT_LENGTH = 500
/** 纯 base64 图片的上限（约 15MB 图片），imageBase64 不含 data: 前缀。 */
const MAX_CAD_IMAGE_LENGTH = 20_000_000
/** 材质编辑模式下 currentModel 的 JSON 长度上限。 */
const MAX_CAD_MODEL_LENGTH = 100_000

const requestSchema = z.object({
  text: z.string().trim().max(MAX_CAD_TEXT_LENGTH, `文字描述最多 ${MAX_CAD_TEXT_LENGTH} 字，请精简后重试`).default(''),
  imageBase64: z.string().trim().max(MAX_CAD_IMAGE_LENGTH).default(''),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).default('image/jpeg'),
  mode: z.enum(['generate', 'material']).default('generate'),
  currentModel: z.unknown().optional(),
})

/**
 * POST /api/cad/generate
 * 把「文字需求」或「图片(+文字)」转成受约束的 CadModel DSL（CSG 建模树）。
 *
 * 入参：{ text?: string; imageBase64?: string; mediaType?: string; mode: 'generate' | 'material'; currentModel?: CadModel }
 *   - imageBase64 为「不含 data: 前缀」的纯 base64 字符串
 * 返回：{ success: true, model, title, summary }
 *
 * 这一层只做「需求 -> 建模 JSON」（L2 生成层），
 * 真正的几何求值在前端 Three.js + three-bvh-csg（L3/L4）完成。
 */
export default defineEventHandler(async (event) => {
  const requestId = randomUUID()
  const startedAt = performance.now()
  let stage = '鉴权'
  let stageStartedAt = startedAt
  let stageDetails: Record<string, string | number | boolean> = {}
  // 只记录阶段与长度等元数据，不输出图纸正文、图片、凭证或模型原文。
  const log = (message: string, details: Record<string, string | number | boolean> = {}) => {
    console.log(`[cad/generate][${requestId}] ${message}`, {
      stage,
      elapsedMs: Math.round(performance.now() - startedAt),
      stageElapsedMs: Math.round(performance.now() - stageStartedAt),
      ...details,
    })
  }
  const onProgress = (message: string, details: Record<string, string | number | boolean> = {}) => {
    stage = message
    stageStartedAt = performance.now()
    stageDetails = details
    log(message, details)
  }
  log('收到请求')
  const heartbeat = setInterval(() => log('处理中，等待当前阶段完成', stageDetails), 10_000)
  heartbeat.unref()

  try {
    const user = getUserFromToken(event)
    if (!user) {
      throw createError({ statusCode: 401, message: '未授权' })
    }

    onProgress('读取并校验请求参数')
    const request = requestSchema.safeParse(await readBody(event))
    if (!request.success) {
      throw createError({ statusCode: 400, message: '请求参数不合法，请检查描述长度、图片格式或编辑模式' })
    }
    const { text, imageBase64, mediaType, mode } = request.data
    onProgress('请求参数校验通过', { mode, textLength: text.length, hasImage: !!imageBase64, imageLength: imageBase64.length })

    let currentModel: CadModel | undefined
    if (mode === 'material') {
      onProgress('校验现有模型')
      // 在递归校验前限制输入规模，避免把任意超深 JSON 当作模型树解析。
      const rawModel = JSON.stringify(request.data.currentModel)
      if (!rawModel || rawModel.length > MAX_CAD_MODEL_LENGTH) {
        throw createError({ statusCode: 400, message: '请先生成一个有效模型，当前模型过大或不存在' })
      }
      const current = cadModelSchema.safeParse(request.data.currentModel)
      if (!current.success) throw createError({ statusCode: 400, message: '当前模型无效，请重新生成' })
      currentModel = current.data
    }

    if (!text && !imageBase64) {
      throw createError({ statusCode: 400, message: '请输入文字描述或上传图片' })
    }

    onProgress('准备建模提示词', { mode, channel: imageBase64 ? '视觉模型' : '文档模型' })
    const systemPrompt = currentModel ? buildCadMaterialSystemPrompt() : buildCadSystemPrompt()
    const userPrompt = currentModel
      ? buildCadMaterialPrompt(text, currentModel)
      : imageBase64 ? buildCadImagePrompt(text) : buildCadTextPrompt(text)

    let rawText = ''
    const modelStartedAt = performance.now()
    if (imageBase64) {
      const response = await createQwenClient().chat.completions.create({
        model: qwenConfig.visionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
              { type: 'text', text: userPrompt },
            ],
          },
        ] as ChatCompletionMessageParam[],
      })
      rawText = response.choices[0]?.message?.content || ''
    } else {
      rawText = (await callQwenDoc(userPrompt, systemPrompt)).rawText
    }
    onProgress('建模模型返回', { promptLength: userPrompt.length, outputLength: rawText.length, durationMs: Math.round(performance.now() - modelStartedAt) })

    onProgress('解析模型 JSON')
    const parsed = parseQwenJson(rawText)
    if (!parsed) {
      log('模型 JSON 解析失败', { outputLength: rawText.length })
      throw createError({ statusCode: 502, message: '模型未返回有效的建模 JSON，请重试或换个描述' })
    }

    if (currentModel) {
      onProgress('校验材质编辑参数')
      const edit = cadMaterialEditSchema.safeParse(parsed)
      if (!edit.success) throw createError({ statusCode: 422, message: '材质参数不合法，请换个描述重试' })
      onProgress('应用材质修改')
      try {
        const model = applyCadMaterialEdit(currentModel, edit.data)
        log('请求成功', { mode })
        return { success: true, model, title: model.title || '未命名模型', summary: model.summary || '' }
      } catch (error) {
        throw createError({ statusCode: 422, message: error instanceof Error ? error.message : '材质目标无效' })
      }
    }

    onProgress('校验建模结构')
    const result = cadModelSchema.safeParse(parsed)
    if (!result.success) {
      log('建模结构校验失败', { issueCount: result.error.issues.length })
      throw createError({
        statusCode: 422,
        message: `建模结构校验失败：${result.error.issues.map((issue) => issue.message).join('；')}`,
      })
    }

    const model = result.data
    log('请求成功', { mode, outputLength: rawText.length })
    return {
      success: true,
      model,
      title: model.title || '未命名模型',
      summary: model.summary || '',
    }
  } catch (err: any) {
    // createError 抛出的 H3Error 直接透传，其余包装为 500
    if (err?.statusCode) {
      log(`请求失败（${err.statusCode}）`, { message: err.message || '' })
      throw err
    }
    log('请求异常', { error: err?.message || String(err) })
    throw createError({ statusCode: 500, message: err?.message || 'CAD 生成失败' })
  } finally {
    clearInterval(heartbeat)
  }
})