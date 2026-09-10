import { AlertCircle, CalendarDays, FileText, Save, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ContactOutcome, CoverageStatus, HousingAssessment, OpenFollowUp } from "../domain/types";

export interface ObservationDraft {
  subjectId: string;
  occurredAt: string;
  coverage: CoverageStatus;
  contactOutcome?: ContactOutcome;
  assessment?: HousingAssessment;
  sourceType?: "STAFF_OBSERVATION" | "RESIDENT_REPORT" | "UNKNOWN";
  note: string;
  evidence: string[];
  followUp?: { action: string; dueDate?: string; status: "OPEN" };
  resolvesObservationId?: string;
}

export interface ObservationEditorProps {
  open: boolean;
  targetLabel: string;
  subjectId: string;
  subjectType?: "UNIT" | "BUILDING";
  openFollowUps?: OpenFollowUp[];
  onClose: () => void;
  onSubmit: (draft: ObservationDraft) => Promise<void> | void;
}

const nowLocal = () => {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
};

export function ObservationEditor({ open, targetLabel, subjectId, openFollowUps = [], onClose, onSubmit }: ObservationEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      triggerRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    if (saving) return;
    dialogRef.current?.close();
    onClose();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      await onSubmit({
        subjectId,
        coverage: String(data.get("coverageStatus")) as CoverageStatus,
        contactOutcome: String(data.get("contactOutcome")) as ContactOutcome,
        assessment: String(data.get("housingAssessment")) as HousingAssessment,
        sourceType: String(data.get("sourceType")) as ObservationDraft["sourceType"],
        occurredAt: new Date(String(data.get("occurredAt"))).toISOString(),
        note: [String(data.get("finding") ?? ""), String(data.get("note") ?? "")].filter(Boolean).join("\n"),
        evidence: String(data.get("evidence") ?? "").split(/\n|；/).map((item) => item.trim()).filter(Boolean),
        followUp: String(data.get("followUpReason") ?? "") ? { action: String(data.get("followUpReason")), dueDate: String(data.get("followUpDueAt") ?? "") || undefined, status: "OPEN" } : undefined,
        resolvesObservationId: String(data.get("resolvesObservationId") ?? "") || undefined,
      });
      dialogRef.current?.close();
      onClose();
      requestAnimationFrame(() => triggerRef.current?.focus());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "未能儲存，草稿仍保留在表格中。請稍後再試。");
    } finally { setSaving(false); }
  };

  return (
    <dialog aria-labelledby="observation-title" ref={dialogRef} className="cf-dialog" onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { if (open && !saving) onClose(); }}>
      <form className="cf-editor" onSubmit={submit}>
        <header className="cf-dialog__header"><div><span className="cf-eyebrow">追加現場記錄</span><h2 id="observation-title">{targetLabel}</h2></div><button type="button" className="cf-icon-button" onClick={close} aria-label="關閉"><X /></button></header>
        <p className="cf-callout"><AlertCircle size={17} />三個結果分開記錄；「無人應門」不會清除住房線索。</p>
        <div className="cf-form-grid">
          <label><span>覆蓋狀態</span><select name="coverageStatus" defaultValue="ATTEMPTED"><option value="UNKNOWN">未能確定</option><option value="UNVISITED">尚未到訪</option><option value="ATTEMPTED">曾嘗試</option><option value="PARTIAL">部分完成</option><option value="VISITED_NO_FINDING">已到訪，未記錄發現</option><option value="VISITED_WITH_FINDING">已到訪，有記錄</option><option value="INACCESSIBLE">未能進入</option></select></label>
          <label><span>接觸結果</span><select name="contactOutcome" defaultValue="NO_ANSWER"><option value="NOT_ATTEMPTED">未嘗試接觸</option><option value="NO_ANSWER">無人應門</option><option value="DECLINED">住戶婉拒</option><option value="CONTACTED">已接觸</option><option value="UNKNOWN">未能確定</option></select></label>
          <label><span>住房判斷</span><select name="housingAssessment" defaultValue="NOT_UPDATED"><option value="NOT_UPDATED">今次未更新</option><option value="UNKNOWN">未能確定</option><option value="SUSPECTED">疑似劏房，待核實</option><option value="NO_INDICATION">今次未見相關跡象</option><option value="STAFF_VERIFIED">工作人員已確認</option></select></label>
          <label><span>資料來源</span><select name="sourceType" defaultValue="STAFF_OBSERVATION"><option value="STAFF_OBSERVATION">工作人員觀察</option><option value="RESIDENT_REPORT">居民口述</option><option value="UNKNOWN">來源未明</option></select></label>
          <label className="cf-field--wide"><span>發生時間</span><input type="datetime-local" name="occurredAt" defaultValue={nowLocal()} required /></label>
          <label className="cf-field--wide"><span>觀察／發現</span><textarea name="finding" rows={2} placeholder="只寫下看到、聽到或獲告知的內容；保留不確定性。" /></label>
          <label className="cf-field--wide"><span><FileText size={15} />補充備註</span><textarea name="note" rows={2} placeholder="例如：敲門次數、未能定位的樓層線索" /></label>
          <label className="cf-field--wide"><span>證據說明</span><input name="evidence" placeholder="例如：門牌細分；居民口述（不會自動判定）" /></label>
        </div>
        <fieldset className="cf-followup-fields"><legend><CalendarDays size={17} />可選跟進</legend><label><span>跟進行動</span><input name="followUpReason" placeholder="例如：與同事討論後再訪" /></label><label><span>限期</span><input type="date" name="followUpDueAt" /></label></fieldset>
        {openFollowUps.length > 0 && <label className="cf-resolve-field"><span>同時結束既有復訪（可選）</span><select name="resolvesObservationId" defaultValue=""><option value="">保留所有待跟進項目</option>{openFollowUps.map((item) => <option key={item.observationId} value={item.observationId}>{item.action}{item.dueDate ? ` · ${item.dueDate}` : ""}</option>)}</select><small>舊記錄仍保留；這次新增的事件會註明已結束哪一項復訪。</small></label>}
        {error && <p role="alert" className="cf-error"><AlertCircle size={17} />{error}</p>}
        <footer className="cf-dialog__footer"><span>儲存會追加新事件，不會覆蓋舊記錄。</span><div><button type="button" className="cf-button cf-button--ghost" onClick={close}>取消</button><button className="cf-button cf-button--primary" disabled={saving}><Save size={17} />{saving ? "儲存中…" : "儲存記錄"}</button></div></footer>
      </form>
    </dialog>
  );
}
