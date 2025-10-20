'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import './routine.css'

interface ThemeConfig {
  primary: string
  bg: string
  text: string
}

interface Routine {
  name: string
  duration: number  // 분 단위
  emoji: string
}

interface RoutineConfig {
  routines: Routine[]
  theme: string
  token: string
  databaseId: string
}

const THEME_COLORS: Record<string, ThemeConfig> = {
  pink: {
    primary: '#FFB9D9',
    bg: '#FFE5F0',
    text: '#2C2C2C'
  },
  purple: {
    primary: '#D4B5FF',
    bg: '#F0E5FF',
    text: '#2C2C2C'
  },
  blue: {
    primary: '#B5D4FF',
    bg: '#E5F0FF',
    text: '#2C2C2C'
  },
  mono: {
    primary: '#808080',
    bg: '#F0F0F0',
    text: '#000000'
  }
}

type GameState = 'idle' | 'playing' | 'paused' | 'mood' | 'report'

function RoutinePlayerContent() {
  const searchParams = useSearchParams()
  const [config, setConfig] = useState<RoutineConfig | null>(null)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [currentRoutineIndex, setCurrentRoutineIndex] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [mood, setMood] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [completedRoutines, setCompletedRoutines] = useState<Array<{name: string, emoji: string}>>([])
  const timerRef = useRef<number | null>(null)
  const [currentTheme, setCurrentTheme] = useState<string>('pink')

  const theme = THEME_COLORS[currentTheme] || THEME_COLORS.pink

  // Config 디코딩
  useEffect(() => {
    const configParam = searchParams.get('config')
    
    if (!configParam) {
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
    } catch (err: any) {
      console.error('Config decode error:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // 테마 변경 함수
  const toggleTheme = () => {
    const themes = ['pink', 'blue', 'purple', 'mono']
    const currentIndex = themes.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    setCurrentTheme(themes[nextIndex])
  }

  // 타이머 로직
  useEffect(() => {
    if (gameState !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // 타이머 클리어 (재시작 시)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = window.setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          // 타이머 중지
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          
          // 루틴 완료 처리
          if (config && currentRoutineIndex < config.routines.length - 1) {
            // 현재 루틴을 완료 목록에 추가
            const currentRoutine = config.routines[currentRoutineIndex]
            setCompletedRoutines(prev => [...prev, { name: currentRoutine.name, emoji: currentRoutine.emoji }])
            
            // 다음 루틴으로
            const nextRoutineDuration = config.routines[currentRoutineIndex + 1].duration || 1
            console.log('Moving to next routine:', currentRoutineIndex + 1, 'duration:', nextRoutineDuration)
            
            setCompletedCount(c => c + 1)
            setCurrentRoutineIndex(currentRoutineIndex + 1)
            setRemainingSeconds(nextRoutineDuration * 60)
            
            return 0 // 임시로 0 반환 (곧 업데이트됨)
          } else {
            // 마지막 루틴도 완료 목록에 추가
            if (config) {
              const currentRoutine = config.routines[currentRoutineIndex]
              setCompletedRoutines(prev => [...prev, { name: currentRoutine.name, emoji: currentRoutine.emoji }])
            }
            
            // 모든 루틴 완료
            console.log('All routines completed')
            setCompletedCount(c => c + 1)
            setGameState('mood')
            return 0
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameState, config, currentRoutineIndex])

  const startRoutine = () => {
    if (!config || config.routines.length === 0) {
      console.error('No config or routines found')
      return
    }
    
    // 첫 번째 루틴의 duration이 0이면 기본값 1분 설정
    const firstRoutineDuration = config.routines[0].duration || 1
    
    console.log('Starting routine:', config.routines[0], 'duration:', firstRoutineDuration)
    
    setCurrentRoutineIndex(0)
    setRemainingSeconds(firstRoutineDuration * 60)
    setGameState('playing')
    setCompletedCount(0)
    setCompletedRoutines([]) // 완료 목록 초기화
  }

  const pauseRoutine = () => {
    setGameState('paused')
  }

  const resumeRoutine = () => {
    setGameState('playing')
  }

  const skipRoutine = () => {
    if (!config) return
    
    // 현재 루틴을 완료 목록에 추가
    const currentRoutine = config.routines[currentRoutineIndex]
    setCompletedRoutines(prev => [...prev, { name: currentRoutine.name, emoji: currentRoutine.emoji }])
    setCompletedCount(prev => prev + 1)
    
    if (currentRoutineIndex < config.routines.length - 1) {
      const nextRoutineDuration = config.routines[currentRoutineIndex + 1].duration || 1
      setCurrentRoutineIndex(prev => prev + 1)
      setRemainingSeconds(nextRoutineDuration * 60)
    } else {
      setGameState('mood')
    }
  }

  const completeRoutine = () => {
    if (!config) return
    
    // 현재 루틴을 완료 목록에 추가
    const currentRoutine = config.routines[currentRoutineIndex]
    setCompletedRoutines(prev => [...prev, { name: currentRoutine.name, emoji: currentRoutine.emoji }])
    setCompletedCount(prev => prev + 1)
    setGameState('mood')
  }

  const selectMood = (selectedMood: string) => {
    setMood(selectedMood)
    // 별점 효과를 위해 약간의 지연 후 리포트로 이동
    setTimeout(() => {
      setGameState('report')
    }, 300)
  }

  const saveToNotion = async () => {
    if (!config) return

    try {
      const response = await fetch('/api/notion/save-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.token,
          databaseId: config.databaseId,
          completedCount,
          totalCount: config?.routines.length || 0,
          mood,
          date: new Date().toISOString()
        })
      })

      if (response.ok) {
        alert('✅ Notion에 저장되었습니다!')
        setGameState('idle')
      } else {
        alert('⚠️ 저장 실패')
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('⚠️ 저장 실패')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // 프로그레스 계산 - 루틴 진행 상태
  const currentRoutine = config?.routines[currentRoutineIndex]
  const totalDuration = (currentRoutine?.duration || 1) * 60
  const elapsedSeconds = Math.max(0, totalDuration - remainingSeconds)
  const progress = totalDuration > 0 ? Math.min(100, (elapsedSeconds / totalDuration) * 100) : 0

  if (!config) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent'
      }}>
        <div className="routine-loading">⏳</div>
      </div>
    )
  }

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
        className="routine-container"
        style={{ color: theme.text }}
      >
        <div 
          className="routine-window"
          style={{ 
            background: theme.bg,
            borderColor: theme.primary
          }}
        >
          {/* 타이틀 바 */}
          <div 
            className="routine-titlebar"
            onClick={toggleTheme}
            style={{ 
              cursor: 'pointer',
              background: currentTheme === 'pink' ? 'hsl(340 100% 88%)' :
                         currentTheme === 'blue' ? 'hsl(210 100% 90%)' :
                         currentTheme === 'purple' ? 'hsl(270 100% 90%)' :
                         'hsl(0 0% 85%)'
            }}
          >
            <div className="routine-title">RoutinePlayer.exe</div>
            <div className="routine-window-buttons">
              <div 
                className="window-btn"
                style={{
                  background: currentTheme === 'pink' ? 'hsl(340 100% 94%)' :
                             currentTheme === 'blue' ? 'hsl(210 100% 94%)' :
                             currentTheme === 'purple' ? 'hsl(270 100% 94%)' :
                             'hsl(0 0% 90%)'
                }}
              ></div>
              <div 
                className="window-btn"
                style={{
                  background: currentTheme === 'pink' ? 'hsl(340 90% 90%)' :
                             currentTheme === 'blue' ? 'hsl(210 90% 90%)' :
                             currentTheme === 'purple' ? 'hsl(270 90% 90%)' :
                             'hsl(0 0% 85%)'
                }}
              ></div>
              <div 
                className="window-btn"
                style={{ background: 'hsl(0 0% 100%)' }}
              ></div>
            </div>
          </div>

          <div className="routine-content">
            {/* Idle 상태: 시작 화면 */}
            {gameState === 'idle' && (
              <div className="start-screen">
                <div className="start-icon">🎮</div>
                <div 
                  className="start-title"
                  style={{
                    color: currentTheme === 'pink' ? 'hsl(340 100% 60%)' :
                           currentTheme === 'blue' ? 'hsl(210 100% 60%)' :
                           currentTheme === 'purple' ? 'hsl(270 100% 60%)' :
                           'hsl(0 0% 40%)'
                  }}
                >
                  Start Routine Player
                </div>
                <div 
                  className="start-info"
                  style={{
                    background: currentTheme === 'pink' ? 'hsl(340 100% 92%)' :
                               currentTheme === 'blue' ? 'hsl(210 100% 92%)' :
                               currentTheme === 'purple' ? 'hsl(270 100% 92%)' :
                               'hsl(0 0% 90%)'
                  }}
                >
                  수행할 루틴은 총 <span className="info-highlight">{config.routines.length}</span>개, 예상 시간은 <span className="info-highlight">{config.routines.reduce((sum, r) => sum + (r.duration || 1), 0)}</span>분이에요!💕
                </div>
                
                <div
                  onClick={startRoutine}
                  className="start-button-text"
                  style={{
                    color: theme.text
                  }}
                >
                  ▶ 시작하기
                </div>
              </div>
            )}

            {/* Playing/Paused 상태: 플레이 화면 */}
            {(gameState === 'playing' || gameState === 'paused') && (
              <>
                {/* 루틴 이름 + 이모지 (중앙 정렬) */}
                <div className="routine-display">
                  <div className="routine-emoji">
                    {config.routines[currentRoutineIndex]?.emoji}
                  </div>
                  <div className="routine-name">
                    {config.routines[currentRoutineIndex]?.name}
                  </div>
                </div>

                {/* 프로그레스 바 */}
                <div className="progress-bar-container">
                  <div className="progress-bar-bg"></div>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${progress}%`,
                      background: currentTheme === 'pink' ? 'hsl(340 85% 80%)' :
                                 currentTheme === 'blue' ? 'hsl(210 85% 80%)' :
                                 currentTheme === 'purple' ? 'hsl(270 85% 80%)' :
                                 'hsl(0 0% 70%)'
                    }}
                  ></div>
                  <div className="progress-bar-timer">
                    {formatTime(remainingSeconds)}
                  </div>
                </div>

                <div className="routine-controls">
                  {gameState === 'playing' ? (
                    <button onClick={pauseRoutine} className="control-btn">
                      Pause
                    </button>
                  ) : (
                    <button 
                      onClick={resumeRoutine} 
                      className="control-btn primary"
                      style={{
                        background: currentTheme === 'pink' ? 'hsl(340 100% 88%)' :
                                   currentTheme === 'blue' ? 'hsl(210 100% 88%)' :
                                   currentTheme === 'purple' ? 'hsl(270 100% 88%)' :
                                   'hsl(0 0% 85%)'
                      }}
                    >
                      Start
                    </button>
                  )}
                  <button onClick={skipRoutine} className="control-btn">
                    Next
                  </button>
                  <button onClick={completeRoutine} className="control-btn">
                    Done
                  </button>
                </div>
              </>
            )}

            {/* Mood 상태: 별점 선택 */}
            {gameState === 'mood' && (
              <div className="start-screen mood-screen">
                <div className="start-title">
                  오늘 루틴은 어땠나요?
                </div>
                
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => selectMood(`${star}점`)}
                      className={`star-btn ${mood === `${star}점` ? 'filled' : ''}`}
                      style={{
                        color: currentTheme === 'pink' ? 'hsl(340 100% 75%)' :
                               currentTheme === 'blue' ? 'hsl(210 100% 75%)' :
                               currentTheme === 'purple' ? 'hsl(270 100% 75%)' :
                               'hsl(0 0% 60%)'
                      }}
                    >
                      {mood === `${star}점` || (mood && parseInt(mood) >= star) ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Report 상태: 완료 리포트 */}
            {gameState === 'report' && (
              <div className="completion-report">
                <div className="report-container">
                  {/* 좌측: 통계 */}
                  <div className="report-left">
                    <div className="report-title">
                      🗂️ ROUTINE REPORT
                    </div>
                    
                    <div className="report-stats">
                      <div>☑️ 완료</div>
                      <div className="stat-value">{completedCount} / {config.routines.length}</div>
                      <div>❤️ 만족도</div>
                      <div className="stat-value">{mood}</div>
                    </div>

                    <div className="report-buttons">
                      <button
                        onClick={saveToNotion}
                        className="report-btn"
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => setGameState('idle')}
                        className="report-btn home-btn"
                        style={{
                          background: currentTheme === 'pink' ? 'hsl(340 100% 88%)' :
                                     currentTheme === 'blue' ? 'hsl(210 100% 88%)' :
                                     currentTheme === 'purple' ? 'hsl(270 100% 88%)' :
                                     'hsl(0 0% 85%)'
                        }}
                      >
                        HOME
                      </button>
                    </div>
                  </div>

                  {/* 우측: 아이템 그리드 */}
                  <div className="report-right">
                    <div className="item-grid">
                      {completedRoutines.map((routine, index) => (
                        <div key={index} className="item-slot">
                          <div className="item-icon">{routine.emoji}</div>
                        </div>
                      ))}
                      {/* 빈 슬롯 채우기 (최대 6개까지 표시) */}
                      {Array.from({ length: Math.max(0, 6 - completedRoutines.length) }).map((_, index) => (
                        <div key={`empty-${index}`} className="item-slot empty"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 브랜드 워터마크 */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          fontSize: '3.5px',
          fontWeight: 'bold',
          letterSpacing: '1.5px',
          opacity: 0.2,
          color: theme.text,
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          SOMLUTUON
        </div>
      </div>
    </div>
  )
}

export default function RoutineWidget() {
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
      <RoutinePlayerContent />
    </Suspense>
  )
}

