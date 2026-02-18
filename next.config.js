// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
const { withSentryConfig } = require('@sentry/nextjs')

const isSentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN)

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      process.env.SUPABASE_HOSTNAME || 'xxxx.supabase.co', // to prevent vercel failed
      'b.jimmylv.cn',
      'avatars.dicebear.com',
      // "i2.hdslb.com",
      // "avatars.githubusercontent.com",
      // "s3-us-west-2.amazonaws.com",
    ],
  },
  async rewrites() {
    const rewrites = [
      {
        source: '/blocked',
        destination: '/shop',
      },
    ]
    
    // Only add API rewrite if INTERNAL_API_HOSTNAME is properly configured
    if (process.env.INTERNAL_API_HOSTNAME && 
        (process.env.INTERNAL_API_HOSTNAME.startsWith('http://') || 
         process.env.INTERNAL_API_HOSTNAME.startsWith('https://'))) {
      rewrites.unshift({
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_HOSTNAME}/api/:path*`,
      })
    }
    
    return rewrites
  },
}

module.exports = withSentryConfig(module.exports, { silent: true, dryRun: !isSentryEnabled }, { hideSourcemaps: true })
