import { NextRequest, NextResponse } from 'next/server'

const MAX_LOG_BODY = 10_000

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || '0')
    if (contentLength > MAX_LOG_BODY) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const payload = await req.json().catch(() => null)

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { log, userAgent } = payload as { log?: any; userAgent?: string }

    if (!log || typeof log !== 'object') {
      return NextResponse.json({ error: 'Missing log payload' }, { status: 400 })
    }

    const sanitized = {
      id: log.id,
      level: log.level,
      timestamp: log.timestamp,
      message: log.message,
      meta: log.meta,
      userAgent,
      headers: {
        viewport: req.headers.get('x-widget-viewport') || 'unknown',
        referrer: req.headers.get('x-widget-referrer') || 'unknown',
      },
      receivedAt: Date.now(),
    }

    console.info('[widget-log]', JSON.stringify(sanitized))

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Remote log error:', err)
    return NextResponse.json(
      { error: 'Failed to record log', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true })
}

