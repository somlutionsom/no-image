import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

interface WidgetData {
  profileImage: string | null
  sleep: string
  energy: number
  name: string
  mainText: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function POST(req: NextRequest) {
  try {
    const { token, databaseId } = await req.json()
    
    if (!token || !databaseId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    const notion = new Client({ auth: token })
    
    // 데이터베이스 정보 먼저 조회해서 Date 속성이 있는지 확인
    let response
    try {
      const dbInfo = await notion.databases.retrieve({ database_id: databaseId })
      const hasDateProperty = 'Date' in (dbInfo as any).properties
      
      if (hasDateProperty) {
        // Date 속성이 있으면 오늘 날짜로 필터링
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        response = await notion.databases.query({
          database_id: databaseId,
          filter: {
            and: [
              {
                property: 'Date',
                date: {
                  on_or_after: today.toISOString()
                }
              },
              {
                property: 'Date',
                date: {
                  before: tomorrow.toISOString()
                }
              }
            ]
          },
          page_size: 1
        })
        
        // 오늘 데이터가 없으면 최근 데이터 조회
        if (response.results.length === 0) {
          response = await notion.databases.query({
            database_id: databaseId,
            sorts: [{
              property: 'Date',
              direction: 'descending'
            }],
            page_size: 1
          })
        }
      } else {
        // Date 속성이 없으면 그냥 최근 데이터 1개 조회
        response = await notion.databases.query({
          database_id: databaseId,
          page_size: 1
        })
      }
    } catch {
      // 오류 발생 시 필터 없이 조회
      response = await notion.databases.query({
        database_id: databaseId,
        page_size: 1
      })
    }
    
    if (response.results.length > 0) {
      const page: any = response.results[0]
      const properties = page.properties
      
      // 데이터 추출 (속성 이름에 정확히 맞춰서)
      const data: WidgetData = {
        profileImage: 
          properties['profile image']?.files?.[0]?.file?.url || 
          properties['profile image']?.files?.[0]?.external?.url || 
          null,
        sleep: 
          properties.sleep?.formula?.string || 
          (properties.sleep?.formula?.number ? `${properties.sleep.formula.number}H` : '0H'),
        energy: properties.energy?.number || 0,
        name: properties.name?.rich_text?.[0]?.plain_text || 'Anonymous',
        mainText: properties['main text']?.rich_text?.[0]?.plain_text || '오늘도 좋은 하루!'
      }
      
      return NextResponse.json(data, { headers: corsHeaders })
    } else {
      // 데이터가 없을 때 기본값 반환
      return NextResponse.json({
        profileImage: null,
        sleep: '0H',
        energy: 0,
        name: 'No Data',
        mainText: '데이터를 입력해주세요'
      }, { headers: corsHeaders })
    }
  } catch (error: any) {
    console.error('Widget data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch widget data: ' + error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

