import type { NextApiRequest, NextApiResponse } from 'next'
import { selectApiKeyAndActivatedLicenseKey } from '~/lib/openai/selectApiKeyAndActivatedLicenseKey'
import { isDev } from '~/utils/env'

export const config = {
  api: {
    externalResolver: true,
  },
}

interface QARequestBody {
  question: string
  subtitles: string
  videoTitle: string
  userKey?: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question, subtitles, videoTitle, userKey, conversationHistory } = req.body as QARequestBody

  if (!question || !question.trim()) {
    return res.status(400).json({ error: '请输入问题' })
  }

  if (!subtitles || !subtitles.trim()) {
    return res.status(400).json({ error: '暂无字幕数据，请先生成视频总结' })
  }

  try {
    const { apiKey, apiBaseUrl } = await selectApiKeyAndActivatedLicenseKey(userKey)

    const baseUrl = apiBaseUrl || process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`

    // 构建系统 prompt
    const systemPrompt = `你是一个专业的视频内容分析助手。用户正在观看一个视频，你需要根据视频的字幕内容来精准回答用户的问题。

以下是视频的信息：
- 视频标题：${videoTitle || '未知'}
- 视频字幕内容：
${subtitles}

请注意以下规则：
1. 只根据上述字幕内容来回答问题，不要编造字幕中没有提到的信息。
2. 如果字幕中包含时间戳信息（如 [MM:SS] 格式），在回答中引用相关内容时，请附上对应的时间戳，格式为 [MM:SS]，方便用户跳转到视频对应位置。
3. 如果问题在字幕内容中找不到答案，请诚实告知用户该信息在视频中未提及。
4. 回答请简洁明了，使用中文。
5. 可以对字幕内容进行归纳、总结和分析。`

    // 构建消息列表
    const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: systemPrompt }]

    // 添加对话历史（最多保留最近 10 轮）
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-20) // 最近 10 轮 = 20 条消息
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content })
      }
    }

    // 添加当前问题
    messages.push({ role: 'user', content: question })

    isDev &&
      console.log('[QA API] 请求参数:', {
        question,
        videoTitle,
        subtitlesLength: subtitles.length,
        historyLength: conversationHistory?.length || 0,
        messagesCount: messages.length,
      })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[QA API] OpenAI 请求失败:', response.status, errorText)
      return res.status(response.status).json({
        error: `AI 服务请求失败: ${response.statusText}`,
      })
    }

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content || '抱歉，无法生成回答。'

    isDev && console.log('[QA API] 回答:', answer.substring(0, 200))

    return res.status(200).json({ answer })
  } catch (error: any) {
    console.error('[QA API] Error:', error.message)
    return res.status(500).json({
      error: error.message || '问答服务出错，请稍后重试',
    })
  }
}
