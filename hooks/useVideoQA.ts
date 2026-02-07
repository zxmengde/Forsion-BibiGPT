import { useState, useCallback } from 'react'
import { CommonSubtitleItem } from '~/lib/types'
import { useToast } from '~/hooks/use-toast'

export interface QAMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface UseVideoQAOptions {
  subtitlesArray: CommonSubtitleItem[] | null
  videoTitle: string
  userKey?: string
}

export function useVideoQA({ subtitlesArray, videoTitle, userKey }: UseVideoQAOptions) {
  const [messages, setMessages] = useState<QAMessage[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // 将字幕数组转换为带时间戳的文本
  const getSubtitleText = useCallback(() => {
    if (!subtitlesArray || subtitlesArray.length === 0) return ''

    return subtitlesArray
      .map((item) => {
        const sec = typeof item.s === 'string' ? parseFloat(item.s) : item.s
        if (sec != null && !isNaN(sec)) {
          const minutes = Math.floor(sec / 60)
          const secs = Math.floor(sec % 60)
          const ts = `${minutes}:${secs.toString().padStart(2, '0')}`
          return `[${ts}] ${item.text}`
        }
        return item.text
      })
      .join('\n')
  }, [subtitlesArray])

  const askQuestion = useCallback(
    async (question: string) => {
      if (!question.trim()) return
      if (!subtitlesArray || subtitlesArray.length === 0) {
        toast({
          variant: 'destructive',
          title: '暂无字幕数据',
          description: '请先生成视频总结以启用问答功能',
        })
        return
      }

      const userMessage: QAMessage = {
        id: Date.now().toString() + '-user',
        role: 'user',
        content: question.trim(),
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])
      setLoading(true)

      try {
        const subtitleText = getSubtitleText()

        // 构建对话历史（不包含当前消息）
        const conversationHistory = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

        const response = await fetch('/api/qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: question.trim(),
            subtitles: subtitleText,
            videoTitle,
            userKey,
            conversationHistory,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `请求失败 (${response.status})`)
        }

        const data = await response.json()

        const assistantMessage: QAMessage = {
          id: Date.now().toString() + '-assistant',
          role: 'assistant',
          content: data.answer,
          timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (error: any) {
        console.error('[useVideoQA] Error:', error)
        toast({
          variant: 'destructive',
          title: '问答失败',
          description: error.message || '请稍后重试',
        })

        // 添加错误消息到对话中
        const errorMessage: QAMessage = {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: `❌ 抱歉，回答失败：${error.message || '未知错误'}`,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setLoading(false)
      }
    },
    [subtitlesArray, videoTitle, userKey, messages, getSubtitleText, toast],
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    loading,
    askQuestion,
    clearMessages,
    hasSubtitles: !!subtitlesArray && subtitlesArray.length > 0,
  }
}
