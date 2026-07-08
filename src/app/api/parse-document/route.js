import { NextResponse } from 'next/server';
import { parsePersonnelMemo } from '../../../lib/gemini';
import { logAudit } from '../../../lib/db';

export async function POST(request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text prompt is required.' }, { status: 400 });
    }

    console.log('Sending text memo to Gemini API parsing engine...');
    const parsedActions = await parsePersonnelMemo(text);
    
    // Log the AI usage in the audit logs
    await logAudit(
      'marcus@houstoncounty.gov',
      'CREATE', // Creating candidates
      'personnel_actions',
      0,
      { rawMemoLength: text.length },
      { parsedCount: parsedActions?.length || 0 }
    );

    return NextResponse.json({ success: true, actions: parsedActions });
  } catch (err) {
    console.error('API Parse Document error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
