import fs from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const specs = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const out = process.argv[3];
const wb = Workbook.create();
function column(n) { let s=''; for(n++; n; n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; }
for (const spec of specs) {
  const sheet = wb.worksheets.add(spec.name);
  sheet.showGridLines = false;
  const last = column(spec.headers.length-1);
  const end = Math.max(spec.rows.length+6+(spec.name==='紙本回錄'?12:0),12);
  sheet.getRange(`A1:${last}${end}`).format.font = { name: 'Arial', size: 11, color:'#213E32' };
  sheet.getRange(`A1:${last}${end}`).format.rowHeight=25;
  sheet.getRange(`A1:${last}${end}`).format.verticalAlignment='center';
  spec.widths.forEach((w,c) => { sheet.getRange(`${column(c)}1:${column(c)}${end}`).format.columnWidth=w; });
  sheet.getRange('A2').values=[[spec.name==='使用說明'?'街區擴展 mock':spec.name]];
  sheet.getRange('A2').format.font={name:'Arial',size:17,bold:true,color:'#213E32'};
  sheet.getRange('A2').format.rowHeight=34;
  sheet.getRange('A3').values=[[spec.note]];
  sheet.getRange('A3').format.font={name:'Arial',size:11,color:'#5B7063'};
  sheet.getRange(`A6:${last}6`).values=[spec.headers];
  sheet.getRange(`A6:${last}6`).format={fill:'#285C49',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:34,wrapText:true,verticalAlignment:'center',horizontalAlignment:'center'};
  const safeRows = spec.rows.map(row=>row.map(v=> typeof v==='string' && v.startsWith('=') ? "'"+v : v));
  if(safeRows.length) sheet.getRange(`A7:${last}${safeRows.length+6}`).values=safeRows;
  if(spec.name!=='關聯封存') {
    sheet.getRange(`A7:${last}${end}`).format.wrapText=true;
    for(let r=7;r<=end;r++) sheet.getRange(`A${r}:${last}${r}`).format.fill=r%2===0?'#F2F6F3':'#FFFFFF';
    const table=sheet.tables.add(`A6:${last}${end}`,true,`Workflow${specs.indexOf(spec)+1}`);
    table.style='TableStyleLight1';
    table.showFilterButton=true;
    sheet.freezePanes.freezeRows(6);
    sheet.freezePanes.freezeColumns(spec.headers.length>2?2:1);
    for(const h of spec.editable??[]) { const c=column(spec.headers.indexOf(h)); sheet.getRange(`${c}7:${c}${end}`).format.font.color='#245EA3'; }
    for(const [h, values] of Object.entries(spec.choices??{})) { const c=column(spec.headers.indexOf(h)); sheet.getRange(`${c}7:${c}500`).dataValidation={rule:{type:'list',values}}; }
    for(const h of spec.dates??[]) { const c=column(spec.headers.indexOf(h)); sheet.getRange(`${c}7:${c}${end}`).setNumberFormat('yyyy-mm-dd'); sheet.getRange(`${c}7:${c}${end}`).format.horizontalAlignment='center'; }
    if(spec.name==='個人名冊') sheet.getRange('C7:C500').setNumberFormat('@');
    if(spec.name==='紙本回錄') {
      sheet.getRange(`A7:${last}${end}`).format.rowHeight=56;
      sheet.getRange(`A7:${last}${spec.rows.length+6}`).format.font.color='#213E32';
      sheet.getRange(`B1:B${end}`).format.columnWidth=32;
      sheet.getRange(`C7:C${end}`).format.horizontalAlignment='center';
      sheet.getRange('F7:F500').setNumberFormat('@');
      sheet.getRange('F7:F500').format.horizontalAlignment='center';
    }
    if(spec.name==='大廈總表') spec.rows.forEach((row,i)=>{sheet.getRange(`A${i+7}:${last}${i+7}`).format.rowHeight=Math.max(48,18*Math.max(...row.map(v=>String(v??'').split('\n').length))+12);});
    if(spec.name==='個人名冊'||spec.name==='待跟進') sheet.getRange(`A7:${last}${spec.rows.length+6}`).format.rowHeight=60;
    if(spec.name==='使用說明') { sheet.getRange(`A7:B${end}`).format.rowHeight=45; sheet.getRange(`A${spec.rows.length+5}:B${spec.rows.length+5}`).format.rowHeight=78; }
  } else {
    sheet.getRange('A5').values=[['保留全部分段；不需在這一頁回錄。']];
    sheet.getRange(`B7:B${end}`).format.wrapText=false;
    sheet.getRange(`B7:B${end}`).format.font.color='#7A867E';
  }
}
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'紙本回錄!D7:K10',include:'values',tableMaxRows:4,tableMaxCols:8,maxChars:1800})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',options:{useRegex:true,maxResults:10},maxChars:1000})).ndjson);
await fs.mkdir(`${out}/district-previews`,{recursive:true});
for (const [name,range] of [['使用說明','A1:B12'],['使用說明','A19:B23'],['大廈總表','A10:E14'],['個人名冊','A10:G15'],['紙本回錄','A31:K36'],['待跟進','A1:H12'],['關聯封存','A1:B7'],['紙本回錄','M31:V36']]) {
  const preview=await wb.render({sheetName:name,range,scale:1,format:'png'});
  await fs.writeFile(`${out}/district-previews/${name}-${range.replace(':','-')}.png`,new Uint8Array(await preview.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(`${out}/CareFlow_街區擴展_mock.xlsx`);
console.log('Exported workbook and verified previews.');
