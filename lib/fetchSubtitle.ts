import { fetchBilibiliSubtitle } from './bilibili/fetchBilibiliSubtitle'
import { CommonSubtitleItem, VideoConfig, VideoService } from './types'
import { fetchYoutubeSubtitle } from './youtube/fetchYoutubeSubtitle'
import { fetchDouyinSubtitle } from './douyin/fetchDouyinSubtitle'
import { fetchAudio, checkAudioExtractionSupport } from './audio/fetchAudioUrl'
import { transcribeVideoAudio } from './audio/transcribeAudio'
import { isDev } from '~/utils/env'

/**
 * 从视频提取字幕，如果字幕不存在则尝试音频转文字
 */
export async function fetchSubtitle(
  videoConfig: VideoConfig,
  shouldShowTimestamp?: boolean,
  userKey?: string,
  enableAudioTranscription: boolean = true, // 默认启用音频转文字回退
): Promise<{
  title: string
  subtitlesArray?: null | Array<CommonSubtitleItem>
  descriptionText?: string
  duration?: number // 视频时长（秒数）
  source?: 'subtitle' | 'audio' // 标注内容来源
}> {
  const { service, videoId, pageNumber } = videoConfig
  console.log('video: ', videoConfig)

  let result: {
    title: string
    subtitlesArray?: null | Array<CommonSubtitleItem>
    descriptionText?: string
    duration?: number
    source?: 'subtitle' | 'audio'
  }

  // 首先尝试提取字幕
  try {
    if (service === VideoService.Youtube) {
      result = await fetchYoutubeSubtitle(videoId, shouldShowTimestamp)
    } else if (service === VideoService.Douyin) {
      result = await fetchDouyinSubtitle(videoId, shouldShowTimestamp)
    } else {
      result = await fetchBilibiliSubtitle(videoId, pageNumber, shouldShowTimestamp)
    }
    result.source = 'subtitle'
  } catch (error: any) {
    console.error('字幕提取失败:', error)
    isDev &&
      console.error('字幕提取错误详情:', {
        service,
        videoId,
        error: error.message,
        stack: error.stack,
      })
    // 如果字幕提取失败，返回空结果，尝试音频转文字
    result = {
      title: videoId,
      subtitlesArray: null,
      descriptionText: undefined,
      duration: undefined,
      source: 'subtitle',
    }
  }

  // 如果字幕提取成功，直接返回
  if (result.subtitlesArray && result.subtitlesArray.length > 0) {
    return result
  }

  // 字幕提取失败，尝试音频转文字（如果启用）
  // 注意：即使有描述文本，也应该尝试音频转文字，因为描述文本只是视频简介，不是实际内容

  // 如果音频转文字未启用或不可用，但有描述文本，将其转换为字幕格式
  if (!enableAudioTranscription) {
    isDev && console.log('音频转文字未启用，跳过音频提取')
    // 如果有描述文本，转换为字幕格式
    if (result.descriptionText && result.descriptionText.trim()) {
      isDev && console.log('将描述文本转换为字幕格式')
      const descriptionAsSubtitle: Array<CommonSubtitleItem> = [
        {
          text: result.descriptionText.trim(),
          index: 0,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]
      return {
        ...result,
        subtitlesArray: descriptionAsSubtitle,
        source: 'subtitle',
      }
    }
    // 如果没有描述文本，至少显示视频标题或ID
    if (result.title && result.title.trim()) {
      isDev && console.log('将视频标题转换为字幕格式')
      const titleAsSubtitle: Array<CommonSubtitleItem> = [
        {
          text: result.title.trim(),
          index: 0,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]
      return {
        ...result,
        subtitlesArray: titleAsSubtitle,
        source: 'subtitle',
      }
    }
    // 如果连标题都没有，至少显示视频ID
    if (videoId) {
      isDev && console.log('将视频ID转换为字幕格式')
      const videoIdAsSubtitle: Array<CommonSubtitleItem> = [
        {
          text: `视频ID: ${videoId}`,
          index: 0,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]
      return {
        ...result,
        subtitlesArray: videoIdAsSubtitle,
        source: 'subtitle',
      }
    }
    return result
  }

  // 检查 service 是否存在
  if (!service) {
    isDev && console.warn('视频服务类型未指定，无法进行音频转文字')
    // 如果有描述文本，转换为字幕格式
    if (result.descriptionText && result.descriptionText.trim()) {
      isDev && console.log('将描述文本转换为字幕格式')
      const descriptionAsSubtitle: Array<CommonSubtitleItem> = [
        {
          text: result.descriptionText.trim(),
          index: 0,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]
      return {
        ...result,
        subtitlesArray: descriptionAsSubtitle,
        source: 'subtitle',
      }
    }
    // 如果没有描述文本，至少显示视频标题或ID
    if (result.title && result.title.trim()) {
      isDev && console.log('将视频标题转换为字幕格式')
      const titleAsSubtitle: Array<CommonSubtitleItem> = [
        {
          text: result.title.trim(),
          index: 0,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]
      return {
        ...result,
        subtitlesArray: titleAsSubtitle,
        source: 'subtitle',
      }
    }
    // 如果连标题都没有，至少显示视频ID
    if (videoId) {
      isDev && console.log('将视频ID转换为字幕格式')
      const videoIdAsSubtitle: Array<CommonSubtitleItem> = [
        {
          text: `视频ID: ${videoId}`,
          index: 0,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]
      return {
        ...result,
        subtitlesArray: videoIdAsSubtitle,
        source: 'subtitle',
      }
    }
    return result
  }

  try {
    // 检查是否支持音频提取
    const isSupported = await checkAudioExtractionSupport()
    if (!isSupported) {
      isDev && console.warn('yt-dlp 未安装，无法进行音频转文字')
      // 如果有描述文本，转换为字幕格式
      if (result.descriptionText && result.descriptionText.trim()) {
        isDev && console.log('将描述文本转换为字幕格式')
        const descriptionAsSubtitle: Array<CommonSubtitleItem> = [
          {
            text: result.descriptionText.trim(),
            index: 0,
            s: shouldShowTimestamp ? 0 : undefined,
          },
        ]
        return {
          ...result,
          subtitlesArray: descriptionAsSubtitle,
          source: 'subtitle',
        }
      }
      // 如果没有描述文本，至少显示视频标题或ID
      if (result.title && result.title.trim()) {
        isDev && console.log('将视频标题转换为字幕格式')
        const titleAsSubtitle: Array<CommonSubtitleItem> = [
          {
            text: result.title.trim(),
            index: 0,
            s: shouldShowTimestamp ? 0 : undefined,
          },
        ]
        return {
          ...result,
          subtitlesArray: titleAsSubtitle,
          source: 'subtitle',
        }
      }
      // 如果连标题都没有，至少显示视频ID
      if (videoId) {
        isDev && console.log('将视频ID转换为字幕格式')
        const videoIdAsSubtitle: Array<CommonSubtitleItem> = [
          {
            text: `视频ID: ${videoId}`,
            index: 0,
            s: shouldShowTimestamp ? 0 : undefined,
          },
        ]
        return {
          ...result,
          subtitlesArray: videoIdAsSubtitle,
          source: 'subtitle',
        }
      }
      return result
    }

    isDev && console.log('字幕提取失败，尝试使用音频转文字...')

    // 使用 yt-dlp 直接下载音频文件
    const { audioBuffer, title, duration } = await fetchAudio(service, videoId, pageNumber)

    // 使用 Whisper API 转录音频
    const { subtitlesArray, duration: audioDuration } = await transcribeVideoAudio(
      audioBuffer,
      videoConfig,
      userKey,
      shouldShowTimestamp,
    )

    isDev && console.log('音频转文字成功，获得', subtitlesArray.length, '条字幕')

    return {
      title: title || result.title,
      subtitlesArray,
      descriptionText: result.descriptionText,
      duration: audioDuration || duration || result.duration,
      source: 'audio',
    }
  } catch (error: any) {
    console.error('音频转文字失败:', error)
    // 如果音频转文字失败，尝试将描述文本转换为字幕格式
    // 确保所有视频都有原文细读内容
    if (result.descriptionText && result.descriptionText.trim()) {
      isDev && console.log('音频转文字失败，将描述文本转换为字幕格式')
      // 将描述文本转换为字幕格式（单条字幕，无时间戳）
      const descriptionAsSubtitle: Array<CommonSubtitleItem> = [
        {
          text: result.descriptionText.trim(),
          index: 0,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]
      return {
        ...result,
        subtitlesArray: descriptionAsSubtitle,
        source: 'subtitle', // 标记为字幕来源（虽然实际上是描述文本）
      }
    }
    // 如果音频转文字失败且没有描述文本，至少显示视频标题作为原文细读内容
    // 确保所有视频都有原文细读内容
    if (result.title && result.title.trim()) {
      isDev && console.log('音频转文字失败且无描述文本，将视频标题转换为字幕格式')
      const titleAsSubtitle: Array<CommonSubtitleItem> = [
        {
          text: result.title.trim(),
          index: 0,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]
      return {
        ...result,
        subtitlesArray: titleAsSubtitle,
        source: 'subtitle',
      }
    }
    // 如果所有方法都失败，至少显示视频ID作为原文细读内容
    // 确保所有视频都有原文细读内容
    if (videoId) {
      isDev && console.log('所有方法都失败，将视频ID转换为字幕格式')
      const videoIdAsSubtitle: Array<CommonSubtitleItem> = [
        {
          text: `视频ID: ${videoId}`,
          index: 0,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]
      return {
        ...result,
        subtitlesArray: videoIdAsSubtitle,
        source: 'subtitle',
      }
    }
    // 如果连视频ID都没有，返回原始结果（这种情况理论上不应该发生）
    return result
  }
}
