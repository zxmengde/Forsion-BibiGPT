import { AnalyticsBrowser } from '@segment/analytics-next'
import { Analytics as AnalyticsType } from '@segment/analytics-next/dist/types/core/analytics'
import { NextPage } from 'next'
import React, { useEffect, useState } from 'react'
import { useAnalytics } from '~/components/context/analytics'
import SlugPage from './[...slug]'

const Home: NextPage<{
  showSingIn: (show: boolean) => void
}> = ({ showSingIn }) => {
  const [analytics, setAnalytics] = useState<AnalyticsType | undefined>(undefined)

  const { analytics: analyticsBrowser } = useAnalytics()
  useEffect(() => {
    async function handleAnalyticsLoading(browser: AnalyticsBrowser) {
      try {
        // Check if browser is a Promise (real AnalyticsBrowser) or a mock object
        if (browser && typeof browser === 'object' && 'then' in browser) {
          const [response, ctx] = await browser
          setAnalytics(response)
          // @ts-ignore
          window.analytics = response
          window.analytics?.page()
        } else {
          // It's a mock object, use it directly
          setAnalytics(browser as any)
          // @ts-ignore
          window.analytics = browser
        }
      } catch (err) {
        console.error(err)
        setAnalytics(undefined)
      }
    }
    if (analyticsBrowser) {
      handleAnalyticsLoading(analyticsBrowser).catch(console.error)
    }
  }, [analyticsBrowser])
  return <SlugPage showSingIn={showSingIn} />
}
export default Home
