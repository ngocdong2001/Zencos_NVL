$path = (Resolve-Path "d:\!Project\Zencos_NVL\src\pages\ProductionBomPage.tsx").Path
$fileLines = [System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)

# Find start: <Column followed by a line with 'M' and 'nguy' (Mã nguyên liệu)
$startIdx = -1
for ($i = 0; $i -lt $fileLines.Length; $i++) {
    if ($fileLines[$i] -match '^\s+<Column\s*$' -and $fileLines[$i+1] -match 'M.* nguy') {
        $startIdx = $i; break
    }
}

# Find end: <Column followed by header with 'inh m' (Định mức)
$endIdx = -1
for ($i = $startIdx + 1; $i -lt $fileLines.Length; $i++) {
    if ($fileLines[$i] -match '^\s+<Column\s*$' -and $fileLines[$i+1] -match 'outputProduct') {
        $endIdx = $i; break
    }
}

Write-Host "startIdx=$startIdx  endIdx=$endIdx"
if ($startIdx -lt 0 -or $endIdx -lt 0) { Write-Error "Could not find bounds"; exit 1 }

$newCols = @"
            <Column
              header="Mã nguyên liệu"
              style={{ minWidth: '180px' }}
              body={(row: LineRow) =>
                isReadonly ? (
                  <strong>{row.productCode}</strong>
                ) : (
                  <AutoComplete
                    value={row.productCode || ''}
                    suggestions={nvlSuggestions}
                    completeMethod={searchNvl}
                    field="code"
                    dropdown
                    itemTemplate={(item: MaterialRow) => (
                      <span>{item.code} – {item.materialName} <span className="text-color-secondary">({item.unit})</span></span>
                    )}
                    onChange={(e) => {
                      const v = e.value
                      if (typeof v === 'string') updateLine(row._key, { productCode: v })
                    }}
                    onSelect={(e) => {
                      const m = e.value as MaterialRow
                      const wasNewRow = lines[lines.length - 1]?._key === row._key && !row.productCode
                      updateLine(row._key, {
                        productId:   m.id,
                        productCode: m.code,
                        productName: m.materialName,
                        unit:        m.unit,
                      })
                      if (wasNewRow) {
                        setLines((prev) => [...prev, blankLine(row.lineType)])
                      }
                    }}
                    placeholder="Tìm mã..."
                    style={{ width: '100%' }}
                  />
                )
              }
            />
            <Column
              header="Tên nguyên liệu"
              style={{ minWidth: '220px' }}
              body={(row: LineRow) =>
                isReadonly ? (
                  <span>{row.productName}</span>
                ) : (
                  <AutoComplete
                    value={row.productName || ''}
                    suggestions={nvlSuggestions}
                    completeMethod={searchNvl}
                    field="materialName"
                    dropdown
                    itemTemplate={(item: MaterialRow) => (
                      <span>{item.code} – {item.materialName} <span className="text-color-secondary">({item.unit})</span></span>
                    )}
                    onChange={(e) => {
                      const v = e.value
                      if (typeof v === 'string') updateLine(row._key, { productName: v })
                    }}
                    onSelect={(e) => {
                      const m = e.value as MaterialRow
                      const wasNewRow = lines[lines.length - 1]?._key === row._key && !row.productCode
                      updateLine(row._key, {
                        productId:   m.id,
                        productCode: m.code,
                        productName: m.materialName,
                        unit:        m.unit,
                      })
                      if (wasNewRow) {
                        setLines((prev) => [...prev, blankLine(row.lineType)])
                      }
                    }}
                    placeholder="Tìm tên..."
                    style={{ width: '100%' }}
                  />
                )
              }
            />
"@

$newColLines = ($newCols -split "`n") | ForEach-Object { $_.TrimEnd("`r") }
# Remove leading/trailing empty lines
while ($newColLines.Count -gt 0 -and $newColLines[0] -eq '') { $newColLines = $newColLines[1..($newColLines.Count-1)] }
while ($newColLines.Count -gt 0 -and $newColLines[-1] -eq '') { $newColLines = $newColLines[0..($newColLines.Count-2)] }

$result = @($fileLines[0..($startIdx-1)]) + $newColLines + @($fileLines[$endIdx..($fileLines.Length-1)])
[System.IO.File]::WriteAllLines($path, $result, [System.Text.Encoding]::UTF8)
Write-Host "Done. Lines: $($result.Length) (was $($fileLines.Length))"
