import { activateLicenseKey } from '~/lib/lemon'
import { checkOpenaiApiKeys } from '~/lib/openai/checkOpenaiApiKey'
import { sample } from '~/utils/fp'

export interface ApiKeyConfig {
  apiKey: string
  apiBaseUrl?: string
}

export async function selectApiKeyAndActivatedLicenseKey(
  apiKey?: string,
  videoId?: string,
): Promise<ApiKeyConfig> {
  let selectedApiKey = ''
  let selectedApiBaseUrl: string | undefined = undefined

  if (apiKey) {
    if (checkOpenaiApiKeys(apiKey)) {
      const userApiKeys = apiKey.split(',')
      selectedApiKey = sample(userApiKeys)
    } else {
      // user is using validated licenseKey
      const activated = await activateLicenseKey(apiKey, videoId)
      if (!activated) {
        throw new Error('licenseKey is not validated!')
      }
      selectedApiKey = apiKey
    }
  } else {
    // don't need to validate anymore, already verified in middleware?
    const myApiKeyList = process.env.OPENAI_API_KEY
    selectedApiKey = sample(myApiKeyList?.split(',')) || ''
  }

  // Get API base URL from environment variable
  selectedApiBaseUrl = process.env.OPENAI_API_BASE_URL

  return {
    apiKey: selectedApiKey,
    apiBaseUrl: selectedApiBaseUrl,
  }
}
