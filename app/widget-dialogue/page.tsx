'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import './dialogue.css'

interface ThemeConfig {
  text: string
  triangle: string
  outerBg: string      // 외부 사각형 색상
  innerBg: string      // 내부 사각형 색상 (더 밝게)
}

interface WidgetData {
  mainText: string
}

const THEME_COLORS: Record<string, ThemeConfig> = {
  pink: {
    text: '#FFFFFF',              // 흰색 고정
    triangle: '#FFFFFF',          // 흰색 고정
    outerBg: 'rgba(255, 185, 217, 0.8)',    // 파스텔 핑크 (외부)
    innerBg: 'rgba(255, 150, 200, 0.8)'     // 더 어두운 핑크 (내부, opacity 80%)
  },
  purple: {
    text: '#FFFFFF',              // 흰색 고정
    triangle: '#FFFFFF',          // 흰색 고정
    outerBg: 'rgba(212, 181, 255, 0.8)',    // 파스텔 퍼플 (외부)
    innerBg: 'rgba(180, 140, 255, 0.8)'     // 더 어두운 퍼플 (내부, opacity 80%)
  },
  blue: {
    text: '#FFFFFF',              // 흰색 고정
    triangle: '#FFFFFF',          // 흰색 고정
    outerBg: 'rgba(181, 212, 255, 0.8)',    // 파스텔 블루 (외부)
    innerBg: 'rgba(140, 180, 255, 0.8)'     // 더 어두운 블루 (내부, opacity 80%)
  },
  mono: {
    text: '#FFFFFF',              // 흰색 고정
    triangle: '#FFFFFF',          // 흰색 고정
    outerBg: 'rgba(100, 100, 100, 0.8)',    // 회색 (외부)
    innerBg: 'rgba(120, 120, 120, 0.8)'     // 더 어두운 회색 (내부, opacity 80%)
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

      // 칭찬 데이터 사용, 없으면 mainText 사용
      setData({
        ...result,
        dialogueText: result.praise || result.mainText || '오늘도 화이팅!'
      })
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  // 랜덤 칭찬 불러오기
  const fetchRandomPraise = useCallback(async () => {
    if (!config) return

    try {
      const response = await fetch('/api/notion/random-praise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: config.token,
          databaseId: config.databaseId
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

      // 랜덤 칭찬으로 업데이트
      setData(prev => ({
        ...prev,
        dialogueText: result.praise || '오늘도 화이팅!'
      }))
    } catch (err: any) {
      console.error('Random praise fetch error:', err)
    }
  }, [config])

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
        {/* 외부 박스 - 테마 색상 */}
        <div 
          className="dialogue-outer"
          style={{ background: theme.outerBg }}
        ></div>
        
        {/* 내부 밝은 박스 - 더 밝은 테마 색상 + blur */}
        <div 
          className="dialogue-inner"
          style={{ background: theme.innerBg }}
        ></div>
        
        {/* 텍스트 내용 - 흰색 고정 */}
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
            <span>{data.dialogueText || '오늘도 화이팅!'}</span>
          ) : (
            <span>데이터 없음</span>
          )}
        </div>
        
        {/* 우측 하단 삼각형 - 흰색 고정, 클릭 시 랜덤 칭찬 */}
        <div 
          className="dialogue-triangle"
          style={{ borderTopColor: theme.triangle }}
          onClick={(e) => {
            e.stopPropagation()  // 테마 변경 이벤트 방지
            fetchRandomPraise()
          }}
          title="클릭하여 다른 칭찬 보기"
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

