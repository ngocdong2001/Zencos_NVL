# Test script for two-step product confirmation workflow
$ApiUrl = "http://localhost:4000"
$Email = "admin@aibiz.local"
$Password = "Admin@12345"

# Login
Write-Host "=== LOGIN ===" -ForegroundColor Cyan
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$ApiUrl/api/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
$token = $login.token
Write-Host "✓ Logged in" -ForegroundColor Green

# Test 1: Ambiguous product name -> Should return candidates
Write-Host "`n=== TEST: AMBIGUOUS PRODUCT NAME ===" -ForegroundColor Cyan
Write-Host "Message: 'Đổi giá bán sua thanh 60000'"
$body1 = @{ message = "Đổi giá bán sua thanh 60000"; history = @() } | ConvertTo-Json
$res1 = Invoke-RestMethod -Uri "$ApiUrl/api/ai/chat" -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -Body $body1

Write-Host "AI Reply:" -ForegroundColor Yellow
Write-Host $res1.reply
Write-Host ""

$candidates = $null
if ($res1.actions -and $res1.actions.Count -gt 0) { 
  $candidates = $res1.actions[0].result.candidates
}

if ($candidates -and $candidates.Count -gt 0) {
  Write-Host "✓ Candidates returned: $($candidates.Count) products" -ForegroundColor Green
  for ($i = 0; $i -lt $candidates.Count; $i++) {
    Write-Host "  $($i + 1). $($candidates[$i].name) ($($candidates[$i].code)) - Price: $($candidates[$i].sellPrice)"
  }
} else {
  Write-Host "⚠ No candidates or auto-selected" -ForegroundColor Yellow
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Cyan
