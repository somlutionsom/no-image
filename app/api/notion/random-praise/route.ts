import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

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
        { status: 400, headers: corsHeaders }
      )
    }

    const notion = new Client({ auth: token })

    // 최근 데이터 조회 (칭찬 속성이 있는 항목들)
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{
        property: 'Date',
        direction: 'descending'
      }],
      page_size: 50  // 최근 50개 중에서 랜덤으로 선택
    })

    // 칭찬 속성이 있는 항목들만 필터링
    const praiseList: string[] = []
    
    for (const page of response.results) {
      const props = (page as any).properties
      
      if (props['칭찬']?.rich_text?.[0]?.plain_text) {
        const praise = props['칭찬'].rich_text[0].plain_text
        if (praise && praise.trim() !== '') {
          praiseList.push(praise)
        }
      }
    }

    // 칭찬 항목이 없으면 기본 메시지
    if (praiseList.length === 0) {
      return NextResponse.json(
        { praise: '오늘도 화이팅!' },
        { headers: corsHeaders }
      )
    }

    // 랜덤으로 칭찬 선택
    const randomIndex = Math.floor(Math.random() * praiseList.length)
    const randomPraise = praiseList[randomIndex]

    return NextResponse.json(
      { praise: randomPraise },
      { headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('Random praise error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch random praise: ' + error.message },
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

