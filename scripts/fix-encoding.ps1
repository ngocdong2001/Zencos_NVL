$path = "d:\!Project\Zencos_NVL\src\pages\ProductionBomPage.tsx"
$text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

$text = $text.Replace("MÃ£ nguyÃªn liá»‡u", "Mã nguyên liệu")
$text = $text.Replace("TÃªn nguyÃªn liá»‡u", "Tên nguyên liệu")
$text = $text.Replace("TÃ¬m mÃ£...", "Tìm mã...")
$text = $text.Replace("TÃ¬m tÃªn...", "Tìm tên...")

[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Done"
