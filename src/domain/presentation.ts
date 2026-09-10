import type { CoverageStatus } from './types';

export const coverageLabels: Record<CoverageStatus, string> = {
  UNKNOWN: '暫無可靠記錄', UNVISITED: '確認尚未到訪', ATTEMPTED: '已嘗試接觸',
  PARTIAL: '部分有記錄', VISITED_NO_FINDING: '已查看・無發現',
  VISITED_WITH_FINDING: '已查看・有線索', INACCESSIBLE: '未能進入',
};
export const coverageColors: Record<CoverageStatus, string> = {
  UNKNOWN: '#acb8b2', UNVISITED: '#acb8b2', ATTEMPTED: '#d4a35e', PARTIAL: '#78a899',
  VISITED_NO_FINDING: '#78a899', VISITED_WITH_FINDING: '#659788', INACCESSIBLE: '#a3837b',
};
