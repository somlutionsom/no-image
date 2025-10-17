import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    
    if (!token || !token.startsWith('ntn_')) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      )
    }
    
    const notion = new Client({ auth: token })
    
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      },
      page_size: 100
    })
    
    return NextResponse.json({ databases: response.results })
  } catch (error: any) {
    console.error('Database fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch databases: ' + error.message },
      { status: 500 }
    )
  }
}

