import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Trash2, Bot, User, HelpCircle, Loader2 } from 'lucide-react'
import { useVideoQA, type QAMessage } from '~/hooks/useVideoQA'
import { CommonSubtitleItem } from '~/lib/types'

interface VideoQAPanelProps {
  subtitlesArray: CommonSubtitleItem[] | null
  videoTitle: string
  userKey?: string
  videoPlayerController?: { seekTo: (seconds: number) => void } | null
}

/** 将 AI 回答中的 [MM:SS] 时间戳渲染为可点击按钮 */
function renderContentWithTimestamps(content: string, onSeek?: (seconds: number) => void) {
  // 匹配 [M:SS] 或 [MM:SS] 或 [H:MM:SS] 或 [HH:MM:SS] 格式
  const timestampRegex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = timestampRegex.exec(content)) !== null) {
    // 添加时间戳之前的文本
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    const fullMatch = match[0]
    const firstNum = parseInt(match[1], 10)
    const secondNum = parseInt(match[2], 10)
    const thirdNum = match[3] ? parseInt(match[3], 10) : undefined

    let totalSeconds: number
    if (thirdNum !== undefined) {
      // H:MM:SS 格式
      totalSeconds = firstNum * 3600 + secondNum * 60 + thirdNum
    } else {
      // M:SS 格式
      totalSeconds = firstNum * 60 + secondNum
    }

    parts.push(
      <button
        key={`ts-${match.index}`}
        onClick={() => onSeek?.(totalSeconds)}
        className="mx-0.5 inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-800/60"
        title={`跳转到 ${fullMatch}`}
      >
        ⏱ {fullMatch}
      </button>,
    )

    lastIndex = match.index + fullMatch.length
  }

  // 添加最后一段文本
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length > 0 ? parts : content
}

function MessageBubble({ message, onSeek }: { message: QAMessage; onSeek?: (seconds: number) => void }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 头像 */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-sky-500 text-white' : 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* 消息气泡 */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <div className="whitespace-pre-wrap">{renderContentWithTimestamps(message.content, onSeek)}</div>
        )}
      </div>
    </div>
  )
}

export function VideoQAPanel({ subtitlesArray, videoTitle, userKey, videoPlayerController }: VideoQAPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, loading, askQuestion, clearMessages, hasSubtitles } = useVideoQA({
    subtitlesArray,
    videoTitle,
    userKey,
  })

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSeek = useCallback(
    (seconds: number) => {
      videoPlayerController?.seekTo(seconds)
    },
    [videoPlayerController],
  )

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!inputValue.trim() || loading) return
      askQuestion(inputValue)
      setInputValue('')
    },
    [inputValue, loading, askQuestion],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  // 没有字幕时显示提示
  if (!hasSubtitles) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
        <HelpCircle className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">AI 问答</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">请先生成视频总结以启用问答功能</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">AI 问答</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            在线
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="清空对话"
          >
            <Trash2 className="h-3.5 w-3.5" />
            清空
          </button>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <HelpCircle className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">对视频内容有疑问？试试问我吧！</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {['这个视频的主要内容是什么？', '有哪些关键知识点？', '总结一下视频的核心观点'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInputValue(suggestion)
                    inputRef.current?.focus()
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-sky-700 dark:hover:bg-sky-900/20 dark:hover:text-sky-400"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onSeek={handleSeek} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在思考...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            disabled={loading}
            className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-sky-600"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
