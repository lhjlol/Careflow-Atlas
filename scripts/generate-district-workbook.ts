/** Rebuild the district workbook with the bundled spreadsheet authoring runtime.
 * Run: node --import tsx scripts/generate-district-workbook.ts
 * CAREFLOW_ARTIFACT_RUNTIME can override the bundled node directory.
 */
import { copyFile, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { districtDemo } from '../src/data/districtDemo';
import { workflowSheets } from '../src/data/workflowFormat';
import { validateSnapshot } from '../src/domain/schema';

validateSnapshot(districtDemo);
const runtime = process.env.CAREFLOW_ARTIFACT_RUNTIME ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node');
const temporary = await mkdtemp(join(tmpdir(), 'careflow-district-excel-'));
const outputDirectory = resolve('outputs/excel-workflow');
const specs = workflowSheets(districtDemo);
specs[0].note = '街區擴展 mock。地圖形狀取自底圖；人名、地址身份、樓層及外展記錄均為合成。';
specs[0].rows.push(
  ['街區規模', `${districtDemo.buildings.length} 幢大廈、${districtDemo.floors.length} 個已建模樓層、${districtDemo.units.length} 個單位、${districtDemo.people.length} 位合成人物、${districtDemo.observations.length} 筆觀察。`],
  ['場景邊界', districtDemo.notice],
  ['資料完整性', '保留完整歷史、家庭關係、居住歷程及會員狀態。地點與需要均為演示情境，不代表真實大廈或住戶。'],
);
await symlink(join(runtime, 'node_modules'), join(temporary, 'node_modules'), 'dir');
await writeFile(join(temporary, 'sheets.json'), JSON.stringify(specs));
await writeFile(join(temporary, 'build.mjs'), await readFile('scripts/district-workbook-builder.mjs'));
const result = spawnSync(join(runtime, 'bin/node'), [join(temporary, 'build.mjs'), join(temporary, 'sheets.json'), outputDirectory], { stdio: 'inherit' });
if (result.status !== 0) throw new Error(`Spreadsheet authoring failed: ${result.error?.message ?? result.status}`);
await mkdir('public/demo', { recursive: true });
await copyFile(join(outputDirectory, 'CareFlow_街區擴展_mock.xlsx'), 'public/demo/careflow-district-demo.xlsx');
console.log(`Saved district workbook: ${districtDemo.buildings.length} buildings, ${districtDemo.observations.length} observations.`);
