import { ArrowLeft, Building2, ClipboardPlus, DoorOpen, Grid2X2, List, MapPin, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { getCoverageStatus, getCoverageSummary, type CoverageStatus, type OutreachSnapshot } from "../domain/types";
import { ObservationHistory } from "./ObservationHistory";

export interface BuildingDetailProps { snapshot: OutreachSnapshot; selectedBuildingId?: string; selectedFloorId?: string; selectedUnitId?: string; onBack?: () => void; onSelectFloor: (floorId: string) => void; onSelectUnit: (unitId: string) => void; onStartObservation: (subject: { buildingId: string; floorId?: string; unitId?: string; label: string }) => void; }
const labels: Record<CoverageStatus, string> = { UNKNOWN: "未能確定", UNVISITED: "未到訪", ATTEMPTED: "曾嘗試", PARTIAL: "部分完成", VISITED_NO_FINDING: "已訪，無記錄發現", VISITED_WITH_FINDING: "已訪，有記錄", INACCESSIBLE: "未能進入" };

export function BuildingDetail(props: BuildingDetailProps) {
  const { snapshot, selectedBuildingId, selectedFloorId, selectedUnitId, onBack, onSelectFloor, onSelectUnit, onStartObservation } = props;
  const [view, setView] = useState<"grid" | "list">("grid");
  const building = snapshot.buildings.find((item) => item.id === selectedBuildingId);
  const floors = useMemo(() => snapshot.floors.filter((item) => item.buildingId === selectedBuildingId).sort((a, b) => b.level - a.level), [snapshot.floors, selectedBuildingId]);
  const activeFloorId = selectedFloorId;
  const units = snapshot.units.filter((item) => item.floorId === activeFloorId);
  const selectedUnit = units.find((item) => item.id === selectedUnitId);
  if (!building) return <aside className="cf-building-panel cf-empty"><Building2 size={28} /><p>從地圖選擇一幢大廈，查看樓層和單位記錄。</p></aside>;
  const summary = getCoverageSummary(snapshot, building.id);
  return <aside className="cf-building-panel" aria-label={`${building.name} 詳情`}>
    <header className="cf-building-header">{onBack && <button className="cf-icon-button" onClick={onBack} aria-label="返回地圖"><ArrowLeft /></button>}<div><span className="cf-eyebrow">大廈檔案 · 合成示例</span><h2>{building.name}</h2><p><MapPin size={14} />{building.address}</p></div></header>
    <section className="cf-stats" aria-label="覆蓋統計"><div><strong>{summary.completed}<small> / {summary.total ?? "?"}</small></strong><span>完成單位</span></div><div><strong>{summary.recorded}</strong><span>有記錄位置</span></div><div className={summary.followUps ? "cf-stat--alert" : ""}><strong>{summary.followUps}</strong><span>待跟進</span></div></section>
    <section className="cf-floor-section"><div className="cf-section-heading"><div><span className="cf-eyebrow">樓層導航</span><h3>選擇樓層</h3></div><span>{building.layoutDeclared ? "示範佈局" : "佈局未核實"}</span></div>{floors.length ? <div className="cf-floor-strip" role="group" aria-label="樓層選擇">{floors.map((floor) => { const revisit = getCoverageSummary(snapshot, building.id, floor.id).followUps > 0; return <button key={floor.id} className={activeFloorId === floor.id ? "is-active" : ""} onClick={() => onSelectFloor(floor.id)}>{floor.label}{revisit && <span title="有待跟進"><RotateCcw size={12} />復訪</span>}</button>; })}</div> : <p className="cf-layout-note">尚未有已聲明的樓層或單位佈局，仍可記錄大廈層面的到訪。</p>}</section>
    {activeFloorId ? <section className="cf-unit-section"><div className="cf-section-heading"><div><span className="cf-eyebrow">單位狀態</span><h3>{floors.find((item) => item.id === activeFloorId)?.label}</h3></div><div className="cf-view-toggle" aria-label="切換單位顯示"><button className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="方格顯示"><Grid2X2 /></button><button className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="列表顯示"><List /></button></div></div><div className={`cf-units cf-units--${view}`}>{units.map((unit) => { const coverage = getCoverageStatus(snapshot, building.id, unit.id); return <button key={unit.id} className={`${selectedUnitId === unit.id ? "is-active" : ""} cf-status-${coverage.toLowerCase()}`} onClick={() => onSelectUnit(unit.id)}><span><DoorOpen size={17} />{unit.label}</span><small>{labels[coverage]}</small></button>; })}</div></section> : floors.length > 0 && <p className="cf-selection-prompt">請先選擇樓層，再查看各單位狀態。</p>}
    {selectedUnit && <section className="cf-selected-unit"><div className="cf-section-heading"><div><span className="cf-eyebrow">已選單位</span><h3>{selectedUnit.label}</h3></div></div><ObservationHistory snapshot={snapshot} subjectId={selectedUnit.id} /><button className="cf-button cf-button--primary cf-button--full" onClick={() => onStartObservation({ buildingId: building.id, floorId: activeFloorId, unitId: selectedUnit.id, label: `${building.name} · ${selectedUnit.label}` })}><ClipboardPlus size={18} />記錄今次結果</button></section>}
    {!selectedUnit && <section className="cf-selected-unit"><div className="cf-section-heading"><div><span className="cf-eyebrow">大廈層面</span><h3>到訪歷史</h3></div></div><ObservationHistory snapshot={snapshot} subjectId={building.id} subjectType="BUILDING" /><button className="cf-button cf-button--primary cf-button--full" onClick={() => onStartObservation({ buildingId: building.id, label: `${building.name} · 大廈到訪` })}><ClipboardPlus size={18} />記錄大廈到訪</button></section>}
  </aside>;
}
