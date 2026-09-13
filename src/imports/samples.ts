/** Regression samples for W0 recognition — three per candidate format.
 *
 * Every format in the closed list needs a success, an ambiguous and a rejected
 * sample (BACKEND_GAP_ANALYSIS §8.1.2). These are synthetic and tiny on purpose:
 * they ship with the code and run on every test pass, so the detector cannot
 * silently regress. Nothing here is imported by the application bundle.
 */
import * as XLSX from 'xlsx';
import { exportWorkflowWorkbook } from '../data/workflowWorkbook';
import { workflowDemo } from '../data/workflowDemo';
import type { ProfileId } from './profiles';

export type SampleKind = 'success' | 'ambiguous' | 'rejected';

export interface RegressionSample {
  id: string;
  profileId: ProfileId;
  kind: SampleKind;
  label: string;
  workbook: XLSX.WorkBook;
}

export function sampleBuffer(sample: RegressionSample): ArrayBuffer {
  return XLSX.write(sample.workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

/** Header row of the real six-sheet export: title, note and spacer rows precede it. */
const SIX_SHEET_HEADER_ROW = 5;
const SIX_SHEET_PAPER_COLUMNS = 22;

function book(sheets: Record<string, unknown[][]>): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  return workbook;
}

/** The workbook the workbench itself exports, byte for byte. */
function exportedSixSheet(): XLSX.WorkBook {
  return XLSX.read(exportWorkflowWorkbook(workflowDemo), { type: 'array' });
}

function sixSheetWithDuplicateWorkerColumn(): XLSX.WorkBook {
  const workbook = exportedSixSheet();
  XLSX.utils.sheet_add_aoa(workbook.Sheets['紙本回錄'], [['工作人員']], { origin: { r: SIX_SHEET_HEADER_ROW, c: SIX_SHEET_PAPER_COLUMNS } });
  return workbook;
}

/** Headers that share no alias with any profile: recognition must refuse, not guess. */
const alienHeaders = ['欄位一', '欄位二', '欄位三'];

export const REGRESSION_SAMPLES: RegressionSample[] = [
  {
    id: 'careflow-six-sheet/success', profileId: 'careflow-six-sheet', kind: 'success', label: '本工作台匯出的六表工作簿',
    workbook: exportedSixSheet(),
  },
  {
    id: 'careflow-six-sheet/ambiguous', profileId: 'careflow-six-sheet', kind: 'ambiguous', label: '紙本回錄同時出現「工作員」與「工作人員」',
    workbook: sixSheetWithDuplicateWorkerColumn(),
  },
  {
    id: 'careflow-six-sheet/rejected', profileId: 'careflow-six-sheet', kind: 'rejected', label: '保留工作表名稱但表頭無法辨認',
    workbook: book({ 使用說明: [['項目', '內容']], 大廈總表: [alienHeaders], 紙本回錄: [alienHeaders, ['a', 'b', 'c']] }),
  },
  {
    id: 'legacy-synthetic/success', profileId: 'legacy-synthetic', kind: 'success', label: '舊英文演示活頁簿',
    workbook: book({
      Metadata: [['key', 'value'], ['synthetic', 'true']],
      Buildings: [['id', 'name', 'address', 'lng', 'lat', 'layoutDeclared'], ['b1', '合成大廈', '合成地址', 114.14, 22.28, 'true']],
      People: [['id', 'displayName'], ['p1', '合成住戶']],
      Visits: [['id', 'occurredAt', 'recordedAt', 'workerName'], ['v1', '2026-09-10T10:00:00+08:00', '2026-09-10T12:00:00+08:00', '合成工作員']],
      Observations: [
        ['id', 'visitId', 'buildingId', 'occurredAt', 'recordedAt', 'workerName', 'coverage', 'evidence'],
        ['o1', 'v1', 'b1', '2026-09-10T10:00:00+08:00', '2026-09-10T12:00:00+08:00', '合成工作員', 'UNVISITED', '合成依據'],
      ],
    }),
  },
  {
    id: 'legacy-synthetic/ambiguous', profileId: 'legacy-synthetic', kind: 'ambiguous', label: 'Observations 出現重複的 id 欄',
    workbook: book({
      Observations: [
        ['id', 'visitId', 'buildingId', 'occurredAt', 'recordedAt', 'workerName', 'coverage', 'evidence', 'id'],
        ['o1', 'v1', 'b1', '2026-09-10T10:00:00+08:00', '2026-09-10T12:00:00+08:00', '合成工作員', 'UNVISITED', '合成依據', 'o1'],
      ],
    }),
  },
  {
    id: 'legacy-synthetic/rejected', profileId: 'legacy-synthetic', kind: 'rejected', label: 'Observations 表頭無法辨認',
    workbook: book({ Observations: [alienHeaders, ['a', 'b', 'c']] }),
  },
  {
    id: 'one-person-per-row/success', profileId: 'one-person-per-row', kind: 'success', label: '一人一行個人表',
    workbook: book({ 個人名冊: [['個人編號', '姓名／稱呼', '電話', '住址原文', '接觸備註'], ['p1', '合成住戶', '0012345678', '合成住址', '合成備註']] }),
  },
  {
    id: 'one-person-per-row/ambiguous', profileId: 'one-person-per-row', kind: 'ambiguous', label: '同時出現「姓名／稱呼」與「姓名」',
    workbook: book({ 個人名冊: [['個人編號', '姓名／稱呼', '姓名', '電話'], ['p1', '合成住戶', '合成住戶', '0012345678']] }),
  },
  {
    id: 'one-person-per-row/rejected', profileId: 'one-person-per-row', kind: 'rejected', label: '個人名冊表頭無法辨認',
    workbook: book({ 個人名冊: [alienHeaders, ['a', 'b', 'c']] }),
  },
  {
    id: 'one-building-per-row/success', profileId: 'one-building-per-row', kind: 'success', label: '一幢建築一行大廈表',
    workbook: book({ 大廈總表: [['大廈編號', '大廈名稱', '地址', '備註'], ['b1', '合成大廈', '合成地址', '合成備註']] }),
  },
  {
    id: 'one-building-per-row/ambiguous', profileId: 'one-building-per-row', kind: 'ambiguous', label: '同時出現「大廈名稱」與「大廈」',
    workbook: book({ 大廈總表: [['大廈編號', '大廈名稱', '大廈', '地址'], ['b1', '合成大廈', '合成大廈', '合成地址']] }),
  },
  {
    id: 'one-building-per-row/rejected', profileId: 'one-building-per-row', kind: 'rejected', label: '大廈總表表頭無法辨認',
    workbook: book({ 大廈總表: [alienHeaders, ['a', 'b', 'c']] }),
  },
  {
    id: 'one-visit-per-row/success', profileId: 'one-visit-per-row', kind: 'success', label: '一處一次探訪一行明細',
    workbook: book({ 探訪記錄: [['到訪日期', '大廈編號', '工作員', '樓層', '單位', '覆蓋結果'], ['2026-09-10', 'b1', '合成工作員', '5F', '5F A室', '已嘗試接觸']] }),
  },
  {
    id: 'one-visit-per-row/ambiguous', profileId: 'one-visit-per-row', kind: 'ambiguous', label: '同時出現「工作員」與「工作人員」',
    workbook: book({ 探訪記錄: [['到訪日期', '大廈編號', '工作員', '工作人員'], ['2026-09-10', 'b1', '合成工作員', '合成工作員']] }),
  },
  {
    id: 'one-visit-per-row/rejected', profileId: 'one-visit-per-row', kind: 'rejected', label: '探訪記錄表頭無法辨認',
    workbook: book({ 探訪記錄: [alienHeaders, ['a', 'b', 'c']] }),
  },
];
