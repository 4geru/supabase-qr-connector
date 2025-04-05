import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function parseCSV(csvData: string): Record<string, string>[] {
  const lines = csvData.split('\n');
  if (lines.length < 2) return [];

  // ヘッダー行を処理
  const headers = lines[0].split(',').map(header => header.trim());

  // データ行を処理
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(value => value.trim());
    const record: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });

    records.push(record);
  }

  return records;
}

export async function POST(request: Request) {
  try {
    const { supabaseUrl, supabaseKey, csvData, fileName } = await request.json();

    if (!supabaseUrl || !supabaseKey || !csvData) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // CSVデータをパース
    const records = parseCSV(csvData);

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSVファイルにデータが含まれていません' },
        { status: 400 }
      );
    }

    // Supabaseクライアントを作成
    const supabase = createClient(supabaseUrl, supabaseKey);

    // リストを作成
    const { data: list, error: listError } = await supabase
      .from('lists')
      .insert([
        {
          title: fileName.replace('.csv', ''),
          description: `${records.length}件のアイテムを含むリスト`,
        },
      ])
      .select()
      .single();

    if (listError) {
      throw listError;
    }

    // リストアイテムを作成
    const listItems = records.map((record, index) => ({
      list_id: list.id,
      csv_column: record,
      csv_column_number: index + 1,
    }));

    const { error: itemsError } = await supabase
      .from('list_items')
      .insert(listItems);

    if (itemsError) {
      throw itemsError;
    }

    return NextResponse.json({
      title: list.title,
      id: list.id,
      itemCount: records.length,
    });
  } catch (error) {
    console.error('リスト作成エラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
} 

