'use client'

import { useState } from 'react'
import OnboardingFlow from './components/OnboardingFlow'
import WidgetPreview from './components/WidgetPreview'

export default function Home() {
  const [widgetUrl, setWidgetUrl] = useState<string>('')
  const [config, setConfig] = useState<any>(null)

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-light via-pink-medium to-purple-light p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-dark mb-2">
            ✨ Notion Pixel Widget ✨
          </h1>
          <p className="text-gray-dark/70">
            노션과 연동되는 귀여운 픽셀 프로필 위젯을 만들어보세요!
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div>
            <OnboardingFlow 
              onComplete={(url: string, cfg: any) => {
                setWidgetUrl(url)
                setConfig(cfg)
              }} 
            />
          </div>
          
          <div>
            <WidgetPreview config={config} url={widgetUrl} />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-gray-dark/60">
          <p>Made with 💖 for Notion users</p>
        </footer>
      </div>
    </main>
  )
}
