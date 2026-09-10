import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";

export interface ImportIssueView { sheet?: string; row?: number; field?: string; message: string; severity?: "error" | "warning"; }
export interface ImportReview { fileName: string; issues: ImportIssueView[]; counts: Record<string, number>; canReplace: boolean; }
export interface ImportDialogProps {
  open: boolean;
  review?: ImportReview;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onFile: (file: File) => Promise<void> | void;
  onLoadSample: () => Promise<void> | void;
  onDownloadSample: () => void;
  onConfirmReplace: () => Promise<void> | void;
}

export function ImportDialog({ open, review, loading = false, error, onClose, onFile, onLoadSample, onDownloadSample, onConfirmReplace }: ImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  if (confirmError) error = confirmError;
  if (review) review = { ...review, counts: { "大廈": review.counts.Buildings ?? 0, "個人": review.counts.People ?? 0, "單位": review.counts.Units ?? 0, "觀察": review.counts.Observations ?? 0 } };
  useEffect(() => { if (open) setConfirmError(""); }, [open]);
  useEffect(() => { const dialog = dialogRef.current; if (!dialog) return; if (open && !dialog.open) { triggerRef.current = document.activeElement as HTMLElement; dialog.showModal(); } else if (!open && dialog.open) dialog.close(); }, [open]);
  const close = () => { if (loading || confirming) return; dialogRef.current?.close(); onClose(); requestAnimationFrame(() => triggerRef.current?.focus()); };
  const accept = (files: FileList | null) => { const file = files?.[0]; if (file) void onFile(file); };
  const drop = (event: DragEvent) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files); };
  const confirm = async () => {
    setConfirming(true); setConfirmError("");
    try {
      await onConfirmReplace();
      dialogRef.current?.close(); onClose(); requestAnimationFrame(() => triggerRef.current?.focus());
    } catch (reason) {
      setConfirmError(reason instanceof Error ? reason.message : "未能套用匯入資料，原有資料仍然保留。");
    } finally { setConfirming(false); }
  };
  return <dialog aria-labelledby="import-title" ref={dialogRef} className="cf-dialog cf-dialog--import" onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { if (open && !loading && !confirming) onClose(); }}><div className="cf-import"><header className="cf-dialog__header"><div><span className="cf-eyebrow">資料匯入</span><h2 id="import-title">先驗證，再取代示範資料</h2></div><button className="cf-icon-button" onClick={close} aria-label="關閉"><X /></button></header><p className="cf-callout"><AlertTriangle size={18} />匯入內容只用於合成示範。確認前可逐項查看所有錯誤與警告。</p>
    {!review && <><button type="button" disabled={loading} className={`cf-dropzone ${dragging ? "is-dragging" : ""}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}><Upload size={28} /><strong>{loading ? "正在解析…" : "拖放 Excel 檔案到這裡"}</strong><span>或按此選擇 .xlsx 檔案</span></button><input ref={inputRef} className="cf-visually-hidden" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => accept(event.currentTarget.files)} /><div className="cf-import-actions"><button className="cf-button cf-button--ghost" onClick={onDownloadSample}><Download size={17} />下載範本</button><button className="cf-button cf-button--secondary" disabled={loading} onClick={() => void onLoadSample()}><FileSpreadsheet size={17} />載入合成範例</button></div></>}
    {review && <section className="cf-review"><div className="cf-review__summary"><div><FileSpreadsheet /><span><strong>{review.fileName}</strong><small>已解析，尚未套用</small></span></div>{review.canReplace ? <span className="cf-ready"><CheckCircle2 />可以匯入</span> : <span className="cf-not-ready"><AlertTriangle />需要修正</span>}</div><dl className="cf-counts">{Object.entries(review.counts).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="cf-issues"><h3>驗證結果 <span>{review.issues.length}</span></h3>{review.issues.length === 0 ? <p className="cf-success"><CheckCircle2 />未發現格式問題。</p> : <div className="cf-issue-table" role="table" aria-label="所有匯入問題"><div role="row" className="cf-issue-row cf-issue-row--head"><span role="columnheader">工作表</span><span role="columnheader">行</span><span role="columnheader">欄位</span><span role="columnheader">問題</span></div>{review.issues.map((issue, index) => <div role="row" className={`cf-issue-row is-${issue.severity ?? "error"}`} key={`${issue.sheet}-${issue.row}-${issue.field}-${index}`}><span role="cell">{issue.sheet ?? "—"}</span><span role="cell">{issue.row ?? "—"}</span><span role="cell">{issue.field ?? "—"}</span><span role="cell">{issue.message}</span></div>)}</div>}</div><footer className="cf-dialog__footer"><span>取代本機演示記錄；需要時請先匯出備份。</span><div><button className="cf-button cf-button--ghost" onClick={close}>取消</button><button className="cf-button cf-button--primary" disabled={!review.canReplace || confirming} onClick={() => void confirm()}>{confirming ? "套用中…" : "確認取代資料"}</button></div></footer></section>}{error && <p className="cf-error" role="alert"><AlertTriangle />{error}</p>}</div></dialog>;
}
