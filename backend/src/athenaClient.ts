import { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } from "@aws-sdk/client-athena";
import * as dotenv from 'dotenv';
dotenv.config();

const athena = new AthenaClient({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const DATABASE = 'mediguard_healthcare';
const OUTPUT_LOCATION = 's3://mediguard-data-2026-project/athena-results/';

export async function queryAthena(sql: string): Promise<any[]> {
  try {
    console.log(`\n☁️ [AWS ATHENA] Executing Query: ${sql}`);
    const start = await athena.send(new StartQueryExecutionCommand({
      QueryString: sql,
      QueryExecutionContext: { Database: DATABASE },
      ResultConfiguration: { OutputLocation: OUTPUT_LOCATION }
    }));
    
    const queryId = start.QueryExecutionId;
    if (!queryId) throw new Error("Failed to start Athena query");

    // Poll for completion
    while (true) {
      const status = await athena.send(new GetQueryExecutionCommand({ QueryExecutionId: queryId }));
      const state = status.QueryExecution?.Status?.State;
      
      if (state === 'SUCCEEDED') break;
      if (state === 'FAILED' || state === 'CANCELLED') {
        throw new Error(`Athena query failed: ${status.QueryExecution?.Status?.StateChangeReason}`);
      }
      
      await new Promise(r => setTimeout(r, 500)); // wait 500ms
    }

    // Get Results
    const results = await athena.send(new GetQueryResultsCommand({ QueryExecutionId: queryId }));
    
    // Parse Results
    const rows = results.ResultSet?.Rows || [];
    if (rows.length <= 1) return []; // Only header or empty
    
    const headers = rows[0].Data?.map(d => d.VarCharValue) || [];
    
    const parsedData = rows.slice(1).map(row => {
      const obj: any = {};
      row.Data?.forEach((col, i) => {
        const header = headers[i];
        if (header) {
          obj[header] = col.VarCharValue;
        }
      });
      return obj;
    });

    return parsedData;
  } catch (error) {
    console.error("Athena Query Error:", error);
    return [];
  }
}
