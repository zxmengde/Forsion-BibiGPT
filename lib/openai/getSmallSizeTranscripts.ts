// Copyright (c) 2022 Kazuki Nakayashiki.
// Modified work: Copyright (c) 2023 Qixiang Zhu.
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// via https://github.com/lxfater/BilibiliSummary/blob/3d1a67cbe8e96adba60672b778ce89644a43280d/src/prompt.ts#L62
export function limitTranscriptByteLength(str: string, byteLimit: number = LIMIT_COUNT) {
  const utf8str = unescape(encodeURIComponent(str))
  const byteLength = utf8str.length
  if (byteLength > byteLimit) {
    const ratio = byteLimit / byteLength
    const newStr = str.substring(0, Math.floor(str.length * ratio))
    return newStr
  }
  return str
}
function filterHalfRandomly<T>(arr: T[]): T[] {
  const filteredArr: T[] = []
  const halfLength = Math.floor(arr.length / 2)
  const indicesToFilter = new Set<number>()

  // 随机生成要过滤掉的元素的下标
  while (indicesToFilter.size < halfLength) {
    const index = Math.floor(Math.random() * arr.length)
    if (!indicesToFilter.has(index)) {
      indicesToFilter.add(index)
    }
  }

  // 过滤掉要过滤的元素
  for (let i = 0; i < arr.length; i++) {
    if (!indicesToFilter.has(i)) {
      filteredArr.push(arr[i])
    }
  }

  return filteredArr
}
function getByteLength(text: string) {
  return unescape(encodeURIComponent(text)).length
}

function itemInIt(textData: SubtitleItem[], text: string): boolean {
  return textData.find((t) => t.text === text) !== undefined
}

type SubtitleItem = {
  text: string
  index: number
}

// Seems like 15,000 bytes is the limit for the prompt
// 13000 = 6500*2
const LIMIT_COUNT = 6200 // 2000 is a buffer

/**
 * 检测字幕是否包含时间戳格式（如 [MM:SS] 或 [HH:MM:SS]）
 * 用于判断是否应该使用换行符连接字幕
 */
function hasTimestampFormat(subtitleItems: SubtitleItem[]): boolean {
  if (!subtitleItems || subtitleItems.length === 0) {
    return false
  }

  // 检查前几个字幕项是否包含时间戳格式
  // 时间戳格式： [MM:SS] 或 [HH:MM:SS] 或 [M:SS]（例如 [0:10] 或 [1:23:45]）
  const timestampPattern = /^\[\d{1,2}:\d{2}(?::\d{2})?\]/
  const sampleSize = Math.min(10, subtitleItems.length) // 增加样本数量以提高准确性
  let timestampCount = 0

  for (let i = 0; i < sampleSize; i++) {
    const text = subtitleItems[i]?.text?.trim() || ''
    if (timestampPattern.test(text)) {
      timestampCount++
    }
  }

  // 如果超过一半的样本包含时间戳，则认为整个字幕集包含时间戳
  // 或者至少有一个样本包含时间戳（对于小样本）
  return timestampCount >= Math.max(1, Math.ceil(sampleSize / 2))
}

export function getSmallSizeTranscripts(
  newTextData: SubtitleItem[],
  oldTextData: SubtitleItem[],
  byteLimit: number = LIMIT_COUNT,
): string {
  // 检测是否包含时间戳格式，如果包含则使用换行符连接，否则使用空格
  const hasTimestamp = hasTimestampFormat(newTextData)
  const separator = hasTimestamp ? '\n' : ' '

  // 调试日志（仅在开发环境）
  const isDev =
    typeof process !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production')
  if (isDev) {
    console.log(
      '[getSmallSizeTranscripts] 字幕数量:',
      newTextData.length,
      '检测到时间戳:',
      hasTimestamp,
      '使用分隔符:',
      separator === '\n' ? '换行符' : '空格',
    )
    if (hasTimestamp && newTextData.length > 0) {
      console.log(
        '[getSmallSizeTranscripts] 示例字幕:',
        newTextData.slice(0, 3).map((t) => t.text),
      )
      const sampleResult = newTextData
        .slice(0, 3)
        .map((t) => t.text)
        .join(separator)
      console.log('[getSmallSizeTranscripts] 连接后示例:', sampleResult.substring(0, 200))
    }
  }

  const text = newTextData
    .sort((a, b) => a.index - b.index)
    .map((t) => t.text)
    .join(separator)
  const byteLength = getByteLength(text)

  if (byteLength > byteLimit) {
    const filtedData = filterHalfRandomly(newTextData)
    return getSmallSizeTranscripts(filtedData, oldTextData, byteLimit)
  }

  let resultData = newTextData.slice()
  let resultText = text
  let lastByteLength = byteLength

  for (let i = 0; i < oldTextData.length; i++) {
    const obj = oldTextData[i]
    if (itemInIt(newTextData, obj.text)) {
      continue
    }

    const nextTextByteLength = getByteLength(obj.text)
    const isOverLimit = lastByteLength + nextTextByteLength > byteLimit
    if (isOverLimit) {
      const overRate = (lastByteLength + nextTextByteLength - byteLimit) / nextTextByteLength
      const chunkedText = obj.text.substring(0, Math.floor(obj.text.length * overRate))
      resultData.push({ text: chunkedText, index: obj.index })
    } else {
      resultData.push(obj)
    }
    resultText = resultData
      .sort((a, b) => a.index - b.index)
      .map((t) => t.text)
      .join(separator)
    lastByteLength = getByteLength(resultText)
  }

  return resultText
}
