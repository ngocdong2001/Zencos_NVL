param(
  [string]$ApiUrl = "http://localhost:4001",
  [string]$DbContainer = "zencos-db",
  [string]$ApiContainer = "zencos-api",
  [string]$OrderId = "",
  [Parameter(Mandatory = $true)][string]$ProductId,
  [Parameter(Mandatory = $true)][string]$LocationId,
  [Parameter(Mandatory = $true)][string]$AsOfDate,
  [Parameter(Mandatory = $true)][string]$AdminEmail,
  [Parameter(Mandatory = $true)][string]$AdminPassword
)

$ErrorActionPreference = 'Stop'

function Write-Section([string]$Title) {
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

Require-Command docker

function Invoke-ApiJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers,
    [object]$Body
  )

  $params = @{
    Method = $Method
    Uri = $Uri
    ErrorAction = 'Stop'
  }
  if ($Headers) { $params.Headers = $Headers }
  if ($null -ne $Body) {
    $params.ContentType = 'application/json'
    $params.Body = ($Body | ConvertTo-Json -Compress)
  }

  return Invoke-RestMethod @params
}

function Convert-ToVietnamDateInfo {
  param([string]$IsoString)

  if (-not $IsoString) { return $null }
  try {
    $dto = [System.DateTimeOffset]::Parse($IsoString)
    $utcPlus7 = [System.TimeSpan]::FromHours(7)
    $vn = $dto.ToOffset($utcPlus7)
    return [PSCustomObject]@{
      Utc = $dto.ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss K')
      Vietnam = $vn.ToString('yyyy-MM-dd HH:mm:ss K')
      SuggestedAsOfDate = $vn.ToString('yyyy-MM-dd')
    }
  } catch {
    return $null
  }
}

Write-Section "1) API container clock/timezone"
try {
  docker exec $ApiContainer sh -lc 'date; echo "TZ=$TZ"'
} catch {
  Write-Warning "Cannot read API container timezone: $($_.Exception.Message)"
}

Write-Section "2) DB timezone + time diff"
try {
  docker exec -e MYSQL_PWD=root123 $DbContainer mysql -uroot -N -e @"
SELECT
  @@global.time_zone AS global_tz,
  @@session.time_zone AS session_tz,
  @@system_time_zone AS system_tz,
  NOW() AS db_now,
  UTC_TIMESTAMP() AS db_utc,
  TIMEDIFF(NOW(), UTC_TIMESTAMP()) AS db_now_minus_utc;
"@
} catch {
  Write-Warning "Cannot query DB timezone: $($_.Exception.Message)"
}

Write-Section "3) Login get JWT"
$loginResp = Invoke-ApiJson -Method 'POST' -Uri "$ApiUrl/api/auth/login" -Body @{ email = $AdminEmail; password = $AdminPassword }

if (-not $loginResp.token) {
  throw "Login failed. Response: $($loginResp | ConvertTo-Json -Depth 5 -Compress)"
}

$token = [string]$loginResp.token
Write-Host "Login OK" -ForegroundColor Green

if ($OrderId) {
  Write-Section "3.1) Draft order snapshot (optional)"
  $orderRaw = ''
  try {
    $orderObj = Invoke-ApiJson -Method 'GET' -Uri "$ApiUrl/api/production-orders/$OrderId" -Headers @{ Authorization = "Bearer $token" }
    $step1ProcessedInfo = Convert-ToVietnamDateInfo -IsoString $orderObj.step1ProcessedAt
    $step1 = @()
    if ($orderObj.lines) {
      $step1 = $orderObj.lines | Where-Object { $_.step -eq 1 -and $_.direction -eq 'out' } | ForEach-Object {
        [PSCustomObject]@{
          productId  = $_.productId
          productCode = $_.productCode
          lotNo = $_.lotNo
          actualQty = $_.actualQty
          locationId = $_.locationId
          exportDate = $_.exportDate
        }
      }
    }
    [PSCustomObject]@{
      id = $orderObj.id
      orderRef = $orderObj.orderRef
      status = $orderObj.status
      step1ProcessedAt = $orderObj.step1ProcessedAt
      step1ProcessedAtUtc = $step1ProcessedInfo.Utc
      step1ProcessedAtVietnam = $step1ProcessedInfo.Vietnam
      suggestedAsOfDate = $step1ProcessedInfo.SuggestedAsOfDate
      nvlExportedAt = $orderObj.nvlExportedAt
      lines = $step1
    } | ConvertTo-Json -Depth 6

    if ($step1ProcessedInfo -and $AsOfDate -ne $step1ProcessedInfo.SuggestedAsOfDate) {
      Write-Warning "AsOfDate dang test la $AsOfDate nhung ngay local suy ra tu step1ProcessedAt la $($step1ProcessedInfo.SuggestedAsOfDate). Nen chay lai voi AsOfDate=$($step1ProcessedInfo.SuggestedAsOfDate) de giong UI."
    }
  } catch {
    Write-Warning "Cannot read order snapshot: $($_.Exception.Message)"
    if ($orderRaw) { Write-Host $orderRaw }
  }
}

Write-Section "4) Inventory stock as-of date"
$stockUrl = "$ApiUrl/api/inventory/stock?productId=$ProductId&locationId=$LocationId&asOfDate=$AsOfDate"
Write-Host $stockUrl

try {
  $stockObj = Invoke-ApiJson -Method 'GET' -Uri $stockUrl -Headers @{ Authorization = "Bearer $token" }
  $stockObj | Select-Object id, lotNo, currentQtyBase, location, expiryDate | ConvertTo-Json -Depth 5
} catch {
  Write-Warning "Cannot read stock JSON: $($_.Exception.Message)"
}

Write-Section "5) FEFO suggestions as-of date"
$fefoUrl = "$ApiUrl/api/inventory/fefo-suggestions?productId=$ProductId&locationId=$LocationId&asOfDate=$AsOfDate&limit=20"
Write-Host $fefoUrl

try {
  $fefoObj = Invoke-ApiJson -Method 'GET' -Uri $fefoUrl -Headers @{ Authorization = "Bearer $token" }
  $fefoObj | Select-Object id, lotNo, currentQtyBase, location, expiryDate | ConvertTo-Json -Depth 5
} catch {
  Write-Warning "Cannot read FEFO JSON: $($_.Exception.Message)"
}

Write-Section "DONE"
Write-Host "If stock/fefo returns empty or qty=0 unexpectedly on deploy, timezone mismatch is likely." -ForegroundColor Yellow
