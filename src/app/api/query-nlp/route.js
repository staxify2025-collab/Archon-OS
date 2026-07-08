import { NextResponse } from 'next/server';
import { translateNLQueryToSQL } from '../../../lib/gemini';
import { getDb, logAudit } from '../../../lib/db';

export async function POST(request) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Search or command query is required.' }, { status: 400 });
    }

    console.log(`AI Agent executing command/query: "${query}"...`);
    const translation = await translateNLQueryToSQL(query);
    const { sql, explanation } = translation;

    const cleanSql = sql.trim();

    // Check for structural database modifications that are blocked for security
    const isDropOrAlter = /drop\s+table|alter\s+table|create\s+table/i.test(cleanSql);
    if (isDropOrAlter) {
      return NextResponse.json({
        error: 'Security block: Schema definition modifications (DROP, ALTER, CREATE TABLE) are restricted.',
        sql,
        explanation: 'Structural changes are blocked to maintain system integrity.'
      }, { status: 400 });
    }

    const db = await getDb();
    const isWrite = /insert\s+|update\s+|delete\s+/i.test(cleanSql);

    let result = null;
    let userEmail = 'marcus@houstoncounty.gov'; // Mock logged-in user

    if (isWrite) {
      // Execute database mutation
      result = await db.run(cleanSql);
      
      // Audit log the mutation
      await logAudit(
        userEmail,
        'UPDATE',
        'database_command',
        result.lastID || 0,
        { command: query },
        { executedSql: cleanSql, changes: result.changes }
      );

      // Force save changes if JSON wrapper is active
      if (db.saveJsonDb) {
        db.saveJsonDb();
      }

      return NextResponse.json({
        success: true,
        isMutation: true,
        sql: cleanSql,
        explanation: `${explanation} (Database updated: ${result.changes} row(s) affected).`,
        result: [{ status: 'success', rowsAffected: result.changes, lastInsertId: result.lastID }]
      });
    } else {
      // Execute read query
      result = await db.all(cleanSql);

      // Audit log the read
      await logAudit(
        userEmail,
        'READ',
        'database_command',
        0,
        { command: query },
        { executedSql: cleanSql, rowsCount: result?.length || 0 }
      );

      return NextResponse.json({
        success: true,
        isMutation: false,
        sql: cleanSql,
        explanation,
        result
      });
    }
  } catch (err) {
    console.error('API AI Query/Command error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
