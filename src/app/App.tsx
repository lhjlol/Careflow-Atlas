import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Building2, Check, ChevronRight, CircleHelp, ClipboardList, FileSpreadsheet, Footprints, Map, MapPin, RotateCcw, Search, ShieldCheck, Upload } from 'lucide-react';
import { useWorkspace } from './store';
import { registerWorkspaceTools } from './webmcp';
import { getCoverageSummary, getOpenFollowUps, type OutreachSnapshot } from '../domain/types';
import { coverageColors, coverageLabels } from '../domain/presentation';
import type { MapBuilding } from '../map/mapModel';
import { BuildingDetail } from '../components/BuildingDetail';
import { ObservationEditor, type ObservationDraft } from '../components/ObservationEditor';
import { ImportDialog, type ImportReview } from '../components/ImportDialog';
import '../components/workflow.css';
import '../styles.css';

const MapScene = lazy(() => import('../map/MapScene'));
interface EditTarget { buildingId: string; floorId?: string; unitId?: string; label: string; eventId: string; visitId: string; }

function download(url: string, name: string) {
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
}

export default function App() {
  const workspace = useWorkspace();
  const { snapshot, selectedBuildingId, selectedFloorId, selectedUnitId, expanded } = workspace;
  const [importOpen, setImportOpen] = useState(false);
  const [importReview, setImportReview] = useState<ImportReview>();
  const [pendingSnapshot, setPendingSnapshot] = useState<OutreachSnapshot>();
  const [importError, setImportError] = useState<string>();
  const [importLoading, setImportLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>();
  const [activeVisitId] = useState(() => `visit-${crypto.randomUUID()}`);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'FOLLOWUP'>('ALL');
  const [toast, setToast] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [listMode, setListMode] = useState(false);

  useEffect(registerWorkspaceTools, []);
  useEffect(() => { workspace.initialize(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5500); return () => clearTimeout(timer); }, [toast]);

  const mapBuildings = useMemo<MapBuilding[]>(() => snapshot?.buildings.map(building => {
    const summary = getCoverageSummary(snapshot, building.id);
    return {
      id: building.id, name: building.name, longitude: building.coordinates.lng, latitude: building.coordinates.lat,
      footprint: building.footprint, status: coverageLabels[summary.status], color: summary.followUps ? '#d4a35e' : coverageColors[summary.status],
      floors: snapshot.floors.filter(f => f.buildingId === building.id).sort((a, b) => a.level - b.level).map(floor => {
        const scoped = getCoverageSummary(snapshot, building.id, floor.id);
        return { id: floor.id, label: floor.label, level: floor.level, hasFollowUp: scoped.followUps > 0, recorded: scoped.recorded, total: scoped.total ?? 0 };
      }),
    };
  }) ?? [], [snapshot]);

  const buildings = snapshot?.buildings.filter(building => `${building.name} ${building.address}`.includes(query) && (filter === 'ALL' || getCoverageSummary(snapshot, building.id).followUps > 0)) ?? [];
  const followupCount = snapshot?.buildings.reduce((sum, b) => sum + getCoverageSummary(snapshot, b.id).followUps, 0) ?? 0;

  const openImport = () => { setImportReview(undefined); setPendingSnapshot(undefined); setImportError(undefined); setImportOpen(true); };
  const parseFile = async (buffer: ArrayBuffer, fileName: string) => {
    const { parseWorkbook } = await import('../data/workbookImport');
    const result = parseWorkbook(buffer);
    setPendingSnapshot(result.snapshot);
    setImportReview({ fileName, issues: result.issues, counts: result.counts, canReplace: !!result.snapshot });
  };
  const loadFile = async (file: File) => {
    setImportLoading(true); setImportError(undefined);
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('請選擇 .xlsx 活頁簿。');
      if (file.size > 5 * 1024 * 1024) throw new Error('示範匯入上限為 5 MB。');
      await parseFile(await file.arrayBuffer(), file.name);
    } catch (error) { setImportError(error instanceof Error ? error.message : '未能解析檔案。'); }
    finally { setImportLoading(false); }
  };
  const loadSample = async () => {
    setImportLoading(true); setImportError(undefined);
    try {
      const response = await fetch('/demo/careflow-field-outreach-demo.xlsx');
      if (!response.ok) throw new Error('示範活頁簿未能載入，請重試。');
      await parseFile(await response.arrayBuffer(), 'CareFlow 外展・合成示範.xlsx');
    } catch (error) { setImportError(error instanceof Error ? error.message : '未能載入示範資料。'); }
    finally { setImportLoading(false); }
  };
  const confirmImport = () => {
    if (!pendingSnapshot) return;
    try { workspace.importSnapshot(pendingSnapshot); setImportOpen(false); setToast(`已匯入 ${pendingSnapshot.buildings.length} 幢大廈；只儲存在這個瀏覽器。`); }
    catch (error) { throw error instanceof Error ? error : new Error('未能儲存，原有資料未改動。'); }
  };
  const saveObservation = async (draft: ObservationDraft) => {
    if (!editTarget) return;
    workspace.saveObservation({
      id: editTarget.eventId, visitId: editTarget.visitId,
      buildingId: editTarget.buildingId, floorId: editTarget.floorId, unitId: editTarget.unitId,
      occurredAt: draft.occurredAt, recordedAt: new Date().toISOString(), workerName: '示範工作員',
      coverage: draft.coverage, assessment: draft.assessment, contactOutcome: draft.contactOutcome,
      sourceType: draft.sourceType, note: draft.note, evidence: draft.evidence, followUp: draft.followUp, resolvesObservationId: draft.resolvesObservationId,
    });
    setEditTarget(undefined);
    setToast('已追加本次記錄，之前的觀察仍保留在時間線。');
  };
  const startObservation = (target: Omit<EditTarget, 'eventId' | 'visitId'>) => setEditTarget({ ...target, eventId: crypto.randomUUID(), visitId: activeVisitId });
  const exportData = () => {
    if (!snapshot) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
    download(url, 'careflow-synthetic-records.json');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('已匯出演示資料，包含完整觀察歷史。');
  };

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); workspace.selectBuilding(); }} aria-label="CareFlow 街區總覽"><span className="brand-symbol"><Footprints size={21} strokeWidth={1.8} /></span><strong>CareFlow<span>Atlas</span></strong></a>
      <div className="product-divider" /><span className="product-name">外展工作台</span>
      <span className="demo-badge"><span />DEMO DATA · Synthetic records only</span>
      <button className="help-button icon-button" aria-label="示範說明" onClick={() => setHelpOpen(!helpOpen)}><CircleHelp size={19} /></button>
      <div className="worker-avatar" title="合成示範工作員">CF</div>
    </header>
    <main className={`workspace ${selectedBuildingId ? 'has-selection' : ''} ${listMode ? 'list-mode' : ''}`}>
      <aside className="district-sidebar" aria-label="外展大廈清單">
        <div className={`sidebar-heading ${snapshot ? "has-records" : ""}`}><span className="eyebrow">FIELD OUTREACH</span><h1>{snapshot ? "街區外展" : <>每一次到訪，<br /><span>都有跡可循。</span></>}</h1><p>西營盤社區客廳 · 洗樓示範</p></div>
        <div className="workspace-tabs"><button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}><Building2 size={16} />大廈<span>{snapshot?.buildings.length ?? '—'}</span></button><button className={filter === 'FOLLOWUP' ? 'active' : ''} onClick={() => setFilter('FOLLOWUP')}><RotateCcw size={15} />待跟進<span>{followupCount}</span></button></div>
        {snapshot ? <>
          <label className="building-search"><Search size={17} /><input aria-label="搜尋大廈或地址" placeholder="搜尋大廈或地址" value={query} onChange={e => setQuery(e.target.value)} /><kbd>⌕</kbd></label>
          <div className="list-heading"><span>{filter === 'FOLLOWUP' ? '需要繼續跟進' : '街區大廈'}</span><span>{buildings.length} 幢</span></div>
          <div className="building-list">{buildings.map((building, index) => {
            const summary = getCoverageSummary(snapshot, building.id);
            const selected = selectedBuildingId === building.id;
            return <button key={building.id} className={`building-card ${selected ? 'selected' : ''}`} onClick={() => workspace.selectBuilding(building.id)} aria-pressed={selected}>
              <div className="building-card-top"><span className="building-index">{String(index + 1).padStart(2, '0')}</span><strong>{building.name}</strong><ArrowUpRight size={16} /></div>
              <div className="building-address">{building.address}</div>
              <div className="building-status"><span className={`status-pill status-${summary.status.toLowerCase()}`}><i style={{ background: coverageColors[summary.status] }} />{coverageLabels[summary.status]}</span>{summary.followUps > 0 && <span className="revisit-count"><RotateCcw size={12} />{summary.followUps} 待跟進</span>}</div>
              <div className="building-progress"><span style={{ width: `${summary.total ? Math.min(100, summary.completed / summary.total * 100) : 0}%` }} /></div>
              <div className="building-card-meta"><span>{summary.total ? `${summary.completed} / ${summary.total} 個單位已查看` : '單位範圍待確認'}</span><span>{building.floorCount ? `${building.floorCount} 層 · 示意` : '樓層未知'}</span></div>
            </button>;
          })}{!buildings.length && <div className="list-empty"><Search size={24} /><p>{query ? '找不到相符的大廈' : '暫無待跟進大廈'}</p><button onClick={() => { setQuery(''); setFilter('ALL'); }}>查看所有大廈</button></div>}</div>
          <div className="sidebar-context"><ShieldCheck size={17} /><p>「沒有記錄」不等於「沒有發現」。<br /><span>查看上次結果，再決定下一步。</span></p></div>
        </> : <div className="start-import"><span className="import-file-icon"><FileSpreadsheet size={30} strokeWidth={1.4} /></span><h2>從現有記錄開始</h2><p>把大廈和個人資料帶到同一張地圖，接續每一次外展。</p><button className="primary-button" onClick={openImport}><Upload size={16} />匯入示範 Excel<ChevronRight size={16} /></button><span className="import-hint">內附合成資料 · 欄位待機構確認</span><div className="import-steps"><span><b>01</b>檢視資料</span><span><b>02</b>探索樓層</span><span><b>03</b>記錄到訪</span></div></div>}
        <div className="sidebar-footer"><button onClick={openImport}><Upload size={16} />匯入資料</button><button disabled={!snapshot} onClick={exportData} aria-label="匯出合成資料及歷史"><ArrowDownToLine size={16} /></button></div>
      </aside>
      <section className="spatial-workspace" aria-label="街區探索">
        <div className="map-topbar"><div><MapPin size={15} /><span>西營盤</span>{selectedBuildingId && <><ChevronRight size={13} /><strong>{snapshot?.buildings.find(b => b.id === selectedBuildingId)?.name}</strong></>}</div><div className="map-view-switch"><button className={!listMode ? 'active' : ''} onClick={() => setListMode(false)}><Map size={15} />地圖</button><button className={listMode ? 'active' : ''} onClick={() => setListMode(true)}><ClipboardList size={15} />清單</button></div></div>
        <div className="spatial-content"><Suspense fallback={<div className="map-loading">正在準備地圖…</div>}><MapScene buildings={mapBuildings} selectedBuildingId={selectedBuildingId} selectedFloorId={selectedFloorId} expanded={expanded} onSelectBuilding={workspace.selectBuilding} onSelectFloor={workspace.selectFloor} onToggleExpanded={workspace.toggleExpanded} onOverview={() => workspace.selectBuilding()} /></Suspense></div>
        {!selectedBuildingId && snapshot && !listMode && <div className="map-prompt"><span><Building2 size={19} /></span><div><strong>從一幢大廈開始</strong><p>選擇地圖標記，讓每一層的記錄展開。</p></div><ChevronRight size={18} /></div>}
      </section>
      {snapshot && selectedBuildingId && <BuildingDetail snapshot={snapshot} selectedBuildingId={selectedBuildingId} selectedFloorId={selectedFloorId} selectedUnitId={selectedUnitId} onBack={() => workspace.selectBuilding()} onSelectFloor={workspace.selectFloor} onSelectUnit={workspace.selectUnit} onStartObservation={startObservation} />}
      {listMode && !selectedBuildingId && <div className="list-instruction"><ClipboardList size={30} /><h2>大廈與樓層清單</h2><p>從大廈清單選擇地點，即可查看及新增到訪記錄。</p><button className="primary-button" onClick={() => snapshot?.buildings[0] && workspace.selectBuilding(snapshot.buildings[0].id)}>查看第一幢大廈<ChevronRight size={17} /></button></div>}
    </main>
    <footer className="app-statusbar"><span><i />{snapshot ? '示範資料儲存於本機瀏覽器' : '準備匯入合成資料'}</span><span>欄位、住戶及樓層均為示範 · 非真實機構記錄</span><span>FIELD NOTES, CONNECTED.</span></footer>
    {workspace.storageError && <div className="storage-banner" role="alert">{workspace.storageError}</div>}
    {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    {helpOpen && <div className="help-popover"><strong>這是一個外展流程示範</strong><p>所有業務記錄、住戶及樓層結構均為合成。地圖底圖由 OpenFreeMap / OpenStreetMap 提供。</p><ol><li>匯入附帶的 Excel 並檢視欄位提示。</li><li>選擇大廈，展開樓層並找出待跟進單位。</li><li>追加結果，查看歷史和覆蓋狀態的變化。</li></ol><p>只在這個瀏覽器儲存，尚未提供跨裝置同步。</p><button onClick={() => setHelpOpen(false)}>知道了</button></div>}
    <ImportDialog open={importOpen} review={importReview} loading={importLoading} error={importError} onClose={() => setImportOpen(false)} onFile={loadFile} onLoadSample={loadSample} onDownloadSample={() => download('/demo/careflow-field-outreach-demo.xlsx', 'careflow-demo.xlsx')} onConfirmReplace={confirmImport} />
    {editTarget && <ObservationEditor open openFollowUps={snapshot ? getOpenFollowUps(snapshot).filter(task => task.buildingId === editTarget.buildingId && task.floorId === editTarget.floorId && task.unitId === editTarget.unitId) : []} targetLabel={editTarget.label} subjectId={editTarget.unitId ?? editTarget.buildingId} subjectType={editTarget.unitId ? 'UNIT' : 'BUILDING'} onClose={() => setEditTarget(undefined)} onSubmit={saveObservation} />}
  </div>;
}
