// Check if the API key looks like an OpenAI key (starts with sk- and has reasonable length)
// But also allow other formats for third-party APIs
export function checkOpenaiApiKey(str: string) {
  if (!str || str.trim().length === 0) {
    return false
  }
  // OpenAI format: sk- followed by alphanumeric characters (typically 48+ chars)
  var openaiPattern = /^sk-[A-Za-z0-9]{20,}$/
  // Also accept other common formats for third-party APIs
  // Allow any non-empty string that's at least 10 characters (for security)
  return openaiPattern.test(str) || str.trim().length >= 10
}

export function checkOpenaiApiKeys(str: string) {
  if (str.includes(',')) {
    const userApiKeys = str.split(',').map((key) => key.trim())
    return userApiKeys.every((key) => checkOpenaiApiKey(key))
  }

  return checkOpenaiApiKey(str)
}
