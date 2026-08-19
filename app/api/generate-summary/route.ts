import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameStats } = body

    console.log('API called with gameStats:', gameStats)

    // Check if API key exists
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not set')
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const prompt = `You are a professional investment analyst. Analyze this investment simulation game result and provide detailed insights.

GAME RESULTS:
- Final Score: ₹${gameStats.playerScore.toLocaleString('en-IN')}
- AI Score: ₹${gameStats.aiScore.toLocaleString('en-IN')}
- Result: ${gameStats.result === 'win' ? 'VICTORY' : 'LOSS'}
- Difficulty: ${gameStats.difficulty}
- Duration: ${gameStats.yearsPlayed} years

INVESTMENT BREAKDOWN:
${Object.entries(gameStats.investmentBreakdown)
  .map(([asset, amount]) => `- ${asset}: ₹${(amount as number).toLocaleString('en-IN')}`)
  .join('\n')}

PERFORMANCE:
- Total Invested: ₹${gameStats.totalInvested.toLocaleString('en-IN')}
- Total Returns: ₹${gameStats.totalReturns.toLocaleString('en-IN')}
- Best Asset: ${gameStats.bestPerformingAsset}
- Worst Asset: ${gameStats.worstPerformingAsset}

Please provide a detailed analysis in JSON format with the following fields:
{
  "summary": "2-3 sentence overall summary of performance",
  "strengths": ["List 3-4 key strengths demonstrated"],
  "mistakes": ["List 3-4 mistakes or missed opportunities"],
  "opportunities": ["List 3-4 opportunities that were missed"],
  "recommendations": ["List 3-4 recommendations for next game"],
  "investmentTips": "3-4 sentence advice on the investment strategy"
}

Make it personalized, insightful, and focused on Indian financial instruments. Be honest but encouraging.`

    console.log('Calling Groq API...')
    const message = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b', // Current working model (Aug 2026)
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = message.choices[0]?.message?.content || ''
    console.log('Groq response:', content.substring(0, 100))

    if (!content) {
      console.error('Empty response from Groq')
      return NextResponse.json(
        { error: 'Empty response from AI' },
        { status: 500 }
      )
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Could not find JSON in response:', content.substring(0, 200))
      return NextResponse.json(
        { error: 'Could not parse AI response', raw: content.substring(0, 500) },
        { status: 500 }
      )
    }

    const analysis = JSON.parse(jsonMatch[0])
    console.log('Successfully parsed analysis:', Object.keys(analysis))

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('Error in generate-summary API:', error)
    return NextResponse.json(
      { error: `Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
