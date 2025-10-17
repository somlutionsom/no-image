'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import './dialogue.css'

interface ThemeConfig {
  text: string
  triangle: string
}

interface WidgetData {
  mainText: string
}

const THEME_COLORS: Record<string, ThemeConfig> = {
  pink: {
    text: '#FFB9D9',
    triangle: '#FFB9D9'
  },
  purple: {
    text: '#D4B5FF',
    triangle: '#D4B5FF'
  },
  blue: {
    text: '#B5D4FF',
    triangle: '#B5D4FF'
  },
  mono: {
    text: '#FFFFFF',
    triangle: '#FFFFFF'
  }
}

function DialogueContent() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<WidgetData | null>(null)
  const [config, setConfig] = useState<any>(null)
  const [currentTheme, setCurrentTheme] = useState('pink')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const theme = THEME_COLORS[currentTheme]

  // Config 디코딩
  useEffect(() => {
    const configParam = searchParams.get('config')
    
    if (!configParam) {
      setError('설정 정보가 없습니다')
      setLoading(false)
      return
    }

    try {
      let base64 = configParam.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) {
        base64 += '='
      }
      
      const jsonString = atob(base64)
      const decoder = new TextDecoder('utf-8')
      const bytes = Uint8Array.from(jsonString, c => c.charCodeAt(0))
      const decoded = decoder.decode(bytes)
      const cfg = JSON.parse(decoded)
      
      setConfig(cfg)
      setCurrentTheme(cfg.theme || 'pink')
      fetchData(cfg)
    } catch (err: any) {
      console.error('Config decode error:', err)
      setError('설정 정보 오류')
      setLoading(false)
    }
  }, [searchParams])

  const fetchData = useCallback(async (cfg: any) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/notion/widget-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: cfg.token,
          databaseId: cfg.databaseId
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      setData(result)
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  // 테마 변경
  const cycleTheme = useCallback(() => {
    const themes = Object.keys(THEME_COLORS)
    const currentIndex = themes.indexOf(currentTheme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setCurrentTheme(nextTheme)

    if (config) {
      const updated = { ...config, theme: nextTheme }
      setConfig(updated)
    }
  }, [config, currentTheme])

  // 자동 새로고침 (5분마다)
  useEffect(() => {
    if (!config) {
      return
    }

    const interval = window.setInterval(() => {
      fetchData(config)
    }, 300000)

    return () => window.clearInterval(interval)
  }, [config, fetchData])

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      overflow: 'hidden',
      padding: 0,
      margin: 0,
    }}>
      <div 
        className="dialogue-container"
        onClick={cycleTheme}
        title="클릭하여 테마 변경"
      >
        {/* 외부 다크 박스 */}
        <div className="dialogue-outer"></div>
        
        {/* 내부 밝은 박스 */}
        <div className="dialogue-inner"></div>
        
        {/* 텍스트 내용 */}
        <div 
          className="dialogue-content"
          style={{ color: theme.text }}
        >
          {loading ? (
            <div className="dialogue-loading">
              <div className="animate-pulse">⏳</div>
            </div>
          ) : error ? (
            <span>⚠️ {error}</span>
          ) : data ? (
            <span>{data.mainText || '오늘도 화이팅!'}</span>
          ) : (
            <span>데이터 없음</span>
          )}
        </div>
        
        {/* 우측 하단 삼각형 */}
        <div 
          className="dialogue-triangle"
          style={{ color: theme.triangle }}
        ></div>
      </div>
    </div>
  )
}

export default function DialogueWidget() {
  return (
    <Suspense fallback={
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="animate-pulse">⏳</div>
      </div>
    }>
      <DialogueContent />
    </Suspense>
  )
}

