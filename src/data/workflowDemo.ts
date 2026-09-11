import { demoSnapshot } from './demoFixture';
import type { OutreachSnapshot } from '../domain/types';

/** Fictional scenarios inspired by workflow needs; not extracted resident records. */
export const workflowDemo: OutreachSnapshot = {
  ...demoSnapshot,
  visits: [...demoSnapshot.visits, { isSynthetic: true, provisional: true, id: 'demo-paper-visit-0910', occurredAt: '2026-09-10', recordedAt: '2026-09-11T09:00:00+08:00', workerName: '演示工作員乙' }],
  observations: [...demoSnapshot.observations,
    { isSynthetic: true, provisional: true, id: 'demo-paper-housing', visitId: 'demo-paper-visit-0910', buildingId: 'bldg-yu-an', floorId: 'bldg-yu-an-f5', unitId: 'bldg-yu-an-f5-B', occurredAt: '2026-09-10', recordedAt: '2026-09-11T09:00:00+08:00', workerName: '演示工作員乙', coverage: 'ATTEMPTED', contactOutcome: 'CONTACTED', assessment: 'NOT_UPDATED', sourceType: 'RESIDENT_REPORT', note: '合成示例：住戶表示業主可能收回單位。具體安排和通知日期未確認。', evidence: ['合成居民口述，未見書面通知'], paperRef: 'DEMO-0910-01', paperLine: '1', followUp: { action: '再聯絡住戶，確認搬遷安排及需要的住屋支援', status: 'OPEN', category: 'HOUSING_CHANGE', assignee: '演示工作員乙', timingNote: '「明年二月」為示範原話，年份及日期待核實' } },
    { isSynthetic: true, provisional: true, id: 'demo-paper-health', visitId: 'demo-paper-visit-0910', buildingId: 'bldg-hoi-king', occurredAt: '2026-09-10', recordedAt: '2026-09-11T09:05:00+08:00', workerName: '演示工作員乙', coverage: 'PARTIAL', contactOutcome: 'CONTACTED', assessment: 'NOT_UPDATED', sourceType: 'RESIDENT_REPORT', note: '合成示例：街坊提到腳部不適及走路困難。只記錄表述，不推定病名。', evidence: ['合成居民口述'], paperRef: 'DEMO-0910-02', paperLine: '1', followUp: { action: '聯絡中心護士同事，確認可提供的關懷安排', status: 'OPEN', category: 'HEALTH_SUPPORT', assignee: '演示工作員乙', timingNote: '翌日午後（實際日期及到場安排待確認）' } },
    { isSynthetic: true, provisional: true, id: 'demo-paper-invite', visitId: 'demo-paper-visit-0910', buildingId: 'bldg-hoi-king', occurredAt: '2026-09-10', recordedAt: '2026-09-11T09:10:00+08:00', workerName: '演示工作員乙', coverage: 'PARTIAL', contactOutcome: 'CONTACTED', assessment: 'NOT_UPDATED', sourceType: 'STAFF_OBSERVATION', note: '合成示例：已介紹社區客廳服務，街坊有興趣了解；未表示已入會。', evidence: [], paperRef: 'DEMO-0910-02', paperLine: '2', followUp: { action: '確認街坊到訪意願及是否需要協助前來', status: 'OPEN', category: 'SERVICE_INVITATION', timingNote: '有口頭邀約，未確認到場' } },
  ],
};
