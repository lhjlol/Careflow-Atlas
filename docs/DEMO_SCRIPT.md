# Demo script

Target duration: about 90 seconds. Use only the bundled synthetic workbook.

## Prepare

```bash
npm ci
npm run demo:generate
npm run dev
```

Open the Vite URL on a laptop with network access. Clear this site's local storage or use a fresh browser profile if the import-first screen should appear. Keep the building list available as the fallback if map resources fail.

## Main path

1. Point out `DEMO DATA · Synthetic records only`. Explain that the map context is real, while highlighted locations, residents, footprints, floors, units, and outreach events are illustrative.
2. Select **匯入示範 Excel**, then **載入合成範例**. Explain that the browser is parsing an actual workbook rather than playing an animation.
3. Review the sheet counts and validation result, then choose **確認取代資料**. Mention that the workbook shape is provisional and the real NGO columns are still unknown.
4. Select **裕安樓** from the map marker or building list. Let the camera settle into the pitched view. Point out that the selected object remains at its geographic location.
5. Choose **展開樓層**. Select the amber **5F** floor, then **5F B室**.
6. Read the earlier event as separate facts: the visit was attempted, nobody answered, a housing clue remains suspected, and follow-up is open. Emphasise that one result does not erase the others.
7. Choose **記錄今次結果**. Set coverage to **已到訪，有記錄**, contact to **已接觸**, keep the housing judgement as **今次未更新**, enter a synthetic note, select the existing revisit under **同時結束既有復訪**, and save.
8. Show that the new event appears above the old event and the earlier record remains visible. Show 裕安樓 completed units changing from **16/32 to 17/32**, its open follow-ups changing from **1 to 0**, and total open follow-ups from **2 to 1**. Return to the building list and point out that counts are derived from records; an unknown denominator does not show a fabricated percentage.

## Useful secondary cases

- Show a location with an explicit negative observation and compare it with an untouched unit. This demonstrates `visited with no finding` versus `no reliable record`.
- Show an inaccessible building-level event. Explain that it does not mark all floors as investigated.
- Select **清單** or disable network access to demonstrate that records and forms do not depend on the basemap.
- Download the sample workbook, then re-import it from disk to demonstrate the upload path.
- Export the workspace JSON and show that both old and newly appended observations are present.

## Claims to avoid

Do not call the prototype an NGO deployment, adopted, approved, secure for resident data, connected to government records, compatible with the NGO's real Excel, multi-user, or offline-first. Do not present any KPI percentage, efficiency gain, building layout, address, household, or membership result as real.

## Questions for staff

- Which field or status does not match the paper form?
- What exactly counts as checking a floor or building?
- When should no answer lead to a revisit, phone call, discussion, or no action?
- Which history must the next worker see before going out?
- Which records need review, and who performs it?
- What should happen to the two Excel files during a pilot?
