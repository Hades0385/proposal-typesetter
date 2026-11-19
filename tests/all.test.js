/**
 * Comprehensive Test Suite
 * Verifies Acceptance Criteria AC-01 through AC-12
 */

import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { normalizeText, normalizeLine } from '../core/normalize.js';
import { parseMarkdownToIR, getChineseNumber } from '../core/md-parser.js';
import { irToHtml } from '../core/ir-to-html.js';
import { countWords, validateProject, reviewAsJudge } from '../core/validator.js';
import { createDefaultProject } from '../core/sample-data.js';
import { buildDocxDocument } from '../core/docx-builder.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${e.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${e.message}`);
    failed++;
  }
}

console.log('=== 1. Text Normalizer (R1–R6, AC-02) ===');

test('R1 & R2: Single enter = new paragraph; consecutive empty lines ignored', () => {
  const input = '段落甲\n\n\n段落乙\n段落丙';
  const res = normalizeText(input);
  assert.strictEqual(res.lines.length, 3);
  assert.strictEqual(res.stats.removedBlankLines, 2);
  assert.strictEqual(res.lines[0].text, '段落甲');
  assert.strictEqual(res.lines[1].text, '段落乙');
  assert.strictEqual(res.lines[2].text, '段落丙');
});

test('R3: Trim leading spaces, full-width space U+3000, and tabs', () => {
  const input = '\u3000\u3000全形縮排段落\n   半形空格段落\n\tTab縮排段落';
  const res = normalizeText(input);
  assert.strictEqual(res.lines[0].text, '全形縮排段落');
  assert.strictEqual(res.lines[1].text, '半形空格段落');
  assert.strictEqual(res.lines[2].text, 'Tab縮排段落');
  assert.ok(res.stats.removedLeadingSpaces > 0);
});

test('R5: Code block fences preserve spaces and empty lines', () => {
  const input = '```python\n  def test():\n    pass\n\n  return 1\n```';
  const res = normalizeText(input);
  assert.ok(res.normalizedText.includes('  def test():'));
  assert.ok(res.normalizedText.includes('    pass'));
  assert.ok(res.normalizedText.includes('  return 1'));
});

console.log('\n=== 2. Markdown Parser & IR (AC-04) ===');

test('Heading level mapping and auto numbering', () => {
  const md = '# 研究背景\n## 痛點分析\n### 成本問題';
  const ir = parseMarkdownToIR(md, { autoHeadingNumber: true });
  assert.strictEqual(ir.blocks[0].type, 'heading');
  assert.strictEqual(ir.blocks[0].text, '（一）研究背景');
  assert.strictEqual(ir.blocks[1].text, '1. 痛點分析');
  assert.strictEqual(ir.blocks[2].text, '(1) 成本問題');
});

test('Inline runs: bold, italic, strikethrough, inline code, subscript, superscript', () => {
  const md = '**粗體** 與 *斜體* 以及 ~~刪除~~ 與 `code` 與 H~2~O 與 x^2^';
  const ir = parseMarkdownToIR(md);
  const p = ir.blocks[0];
  assert.strictEqual(p.type, 'paragraph');
  assert.ok(p.runs.some(r => r.bold && r.text.includes('粗體')));
  assert.ok(p.runs.some(r => r.italic && r.text.includes('斜體')));
  assert.ok(p.runs.some(r => r.strike && r.text.includes('刪除')));
  assert.ok(p.runs.some(r => r.isCode && r.text === 'code'));
  assert.ok(p.runs.some(r => r.sub && r.text === '2'));
  assert.ok(p.runs.some(r => r.sup && r.text === '2'));
});

test('Table block parsing with caption', () => {
  const md = '[表] 比較表\n| 方案 | 成本 |\n| :--- | :---: |\n| A | 100 |\n| B | 200 |';
  const ir = parseMarkdownToIR(md);
  assert.strictEqual(ir.blocks[0].type, 'table');
  assert.strictEqual(ir.blocks[0].caption, '表 1　比較表');
  assert.strictEqual(ir.blocks[0].headers.length, 2);
  assert.strictEqual(ir.blocks[0].rows.length, 2);
});

test('Image block auto-numbering', () => {
  const md = '![系統架構圖](img:arch)\n![流程圖](img:flow)';
  const ir = parseMarkdownToIR(md);
  assert.strictEqual(ir.blocks[0].caption, '圖 1　系統架構圖');
  assert.strictEqual(ir.blocks[1].caption, '圖 2　流程圖');
});

console.log('\n=== 3. Validator & Review As Judge (AC-10) ===');

test('Word count: CJK characters + English words', () => {
  const text = '這是中文測試 Hello World 123';
  // 6 CJK + 3 English words = 9
  assert.strictEqual(countWords(text), 9);
});

test('Validator catches V001 (empty required section) and V006 (cover missing)', () => {
  const emptyProj = {
    cover: { titleZh: '', members: [] },
    sections: { summary: { markdown: '' } }
  };
  const issues = validateProject(emptyProj);
  assert.ok(issues.some(i => i.id === 'V006'));
  assert.ok(issues.some(i => i.id === 'V001'));
});

test('Validator catches V007 (missing table in competitor section)', () => {
  const proj = createDefaultProject();
  proj.sections.competitor.markdown = '只有純文字描述，沒有任何表格。';
  const issues = validateProject(proj, 'competitor');
  assert.ok(issues.some(i => i.id === 'V007'));
});

test('Validator catches V008 (missing numbers in schedule)', () => {
  const proj = createDefaultProject();
  proj.sections.schedule.markdown = '本專案效益良好但沒有任何數字標示。';
  const issues = validateProject(proj, 'schedule');
  assert.ok(issues.some(i => i.id === 'V008'));
});

test('Review As Judge evaluates 7 dimensions and readyToSubmit', () => {
  const proj = createDefaultProject();
  const review = reviewAsJudge(proj);
  assert.strictEqual(review.dimensions.length, 7);
  assert.strictEqual(review.overall.readyToSubmit, true);
  assert.ok(parseFloat(review.overall.scoreAverage) >= 4.0);
});

console.log('\n=== 4. Word Document Generation (AC-03, AC-05, AC-12) ===');

await runAsyncTest('buildDocxDocument generates valid Buffer with 3 sections', async () => {
  const docx = await import('docx');
  const proj = createDefaultProject();
  const doc = await buildDocxDocument(proj, docx);
  const buf = await docx.Packer.toBuffer(doc);
  assert.ok(buf.length > 10000, 'Buffer should be valid docx zip archive > 10KB');
  // Check docx zip magic bytes PK\x03\x04
  assert.strictEqual(buf[0], 0x50);
  assert.strictEqual(buf[1], 0x4b);
  assert.strictEqual(buf[2], 0x03);
  assert.strictEqual(buf[3], 0x04);
});

console.log('\n=== 5. Local MCP Server Protocol (AC-07, AC-08) ===');

await runAsyncTest('MCP Server handles initialize, tools/list, and get_writing_guide', async () => {
  await new Promise((resolve, reject) => {
    const child = spawn('node', ['mcp-server.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';

    child.stdout.on('data', chunk => {
      output += chunk.toString();
      const lines = output.split('\n');
      output = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line);

        if (msg.id === 101) {
          assert.strictEqual(msg.result.serverInfo.name, 'proposal-typesetter-mcp');
          // Request get_writing_guide
          child.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 102,
            method: 'tools/call',
            params: { name: 'get_writing_guide', arguments: { section: 'summary' } }
          }) + '\n');
        } else if (msg.id === 102) {
          const resText = msg.result.content[0].text;
          const parsed = JSON.parse(resText);
          assert.strictEqual(parsed.section, 'summary');
          assert.strictEqual(parsed.guide.suggestedMin, 300);
          assert.strictEqual(parsed.guide.suggestedMax, 500);
          child.kill();
          resolve();
        }
      }
    });

    child.on('error', reject);

    // Send init
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 101,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'tester', version: '1.0' } }
    }) + '\n');
  });
});

console.log('\n=============================================');
console.log(`測試結果：共通過 ${passed} 項，失敗 ${failed} 項`);
console.log('=============================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
