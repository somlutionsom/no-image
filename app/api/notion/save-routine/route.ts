import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function POST(req: NextRequest) {
  try {
    const { token, databaseId, completedCount, totalCount, mood, date } = await req.json()

    if (!token || !databaseId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400, headers: corsHeaders }
      )
    }

    const notion = new Client({ auth: token })

    // 오늘 날짜로 페이지 찾기
    const today = new Date(date)
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const response = await notion.databases.query({
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

    let pageId: string

    if (response.results.length > 0) {
      // 오늘 페이지가 있으면 업데이트
      pageId = response.results[0].id
    } else {
      // 오늘 페이지가 없으면 생성
      const newPage = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Date': {
            date: {
              start: today.toISOString().split('T')[0]
            }
          }
        }
      })
      pageId = newPage.id
    }

    // 페이지 내부에 블록으로 루틴 완료 정보 추가
    // 기존 블록 가져오기
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100
    })

    // 루틴 완료 정보를 찾아서 업데이트하거나 추가
    const routineBlockIndex = blocks.results.findIndex((block: any) => 
      block.type === 'heading_3' && 
      block.heading_3?.rich_text?.[0]?.plain_text?.includes("🎮 TODAY'S ROUTINE REPORT")
    )

    if (routineBlockIndex >= 0) {
      // 기존 블록 삭제 (헤딩 + 내용 3개)
      const blocksToDelete = blocks.results.slice(routineBlockIndex, routineBlockIndex + 4)
      for (const block of blocksToDelete) {
        try {
          await notion.blocks.delete({ block_id: block.id })
        } catch (e) {
          // 이미 삭제된 블록일 수 있음
        }
      }
    }

    // 만족도에서 숫자만 추출
    const moodScore = mood.replace('점', '')

    // 새로운 루틴 완료 정보 추가
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          type: 'heading_3',
          heading_3: {
            rich_text: [{
              type: 'text',
              text: { content: "🎮 TODAY'S ROUTINE REPORT" }
            }]
          }
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: '' }
            }]
          }
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: `🎉 총 ${completedCount}개의 루틴을 완료했어요!` }
            }]
          }
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: `💕 오늘의 루틴 만족도 : ${moodScore}점` }
            }]
          }
        }
      ]
    })

    return NextResponse.json({ success: true }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Save routine error:', error)
    return NextResponse.json(
      { error: 'Failed to save routine: ' + error.message },
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

