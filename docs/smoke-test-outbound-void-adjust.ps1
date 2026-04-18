$ErrorActionPreference = 'Stop'
$api = 'http://localhost:4000'

$health = Invoke-RestMethod -Uri "$api/api/health" -Method Get
if (-not $health.ok) { throw 'Health check failed' }

$customers = Invoke-RestMethod -Uri "$api/api/master-data/customers" -Method Get
$customerId = $null
if ($customers -and $customers.Count -gt 0) { $customerId = [string]$customers[0].id }

$allStock = Invoke-RestMethod -Uri "$api/api/inventory/stock" -Method Get
$batch = $allStock | Where-Object { [double]$_.currentQtyBase -gt 3 } | Select-Object -First 1
if (-not $batch) { throw 'No batch with stock > 3 found for smoke test.' }

$productId = [string]$batch.product.id
$batchId = [string]$batch.id
$initialQty = [double]$batch.currentQtyBase
$qty = 1.0

$payload = @{
  orderRef = "SMOKE-XK-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  customerId = $customerId
  exportedAt = (Get-Date).ToString('o')
  notes = 'Smoke test void-adjust outbound'
  items = @(
    @{
      productId = $productId
      batchId = $batchId
      quantityBase = $qty
      unitUsed = 'kg'
      quantityDisplay = $qty
      unitPriceSnapshot = 0
    }
  )
} | ConvertTo-Json -Depth 8

$created = Invoke-RestMethod -Uri "$api/api/sales" -Method Post -ContentType 'application/json' -Body $payload
$orderId = [string]$created.id

$pendingDetail = Invoke-RestMethod -Uri "$api/api/sales/$orderId" -Method Get
if ($pendingDetail.status -ne 'pending') { throw "Expected pending after create, got $($pendingDetail.status)" }

$null = Invoke-RestMethod -Uri "$api/api/sales/$orderId/fulfil" -Method Patch
$fulfilledDetail = Invoke-RestMethod -Uri "$api/api/sales/$orderId" -Method Get
if ($fulfilledDetail.status -ne 'fulfilled') { throw "Expected fulfilled for source order, got $($fulfilledDetail.status)" }

$stockAfterFulfilList = Invoke-RestMethod -Uri "$api/api/inventory/stock?productId=$productId" -Method Get
$batchAfterFulfil = $stockAfterFulfilList | Where-Object { [string]$_.id -eq $batchId } | Select-Object -First 1
if (-not $batchAfterFulfil) { throw 'Batch not found after fulfil.' }
$qtyAfterFulfil = [double]$batchAfterFulfil.currentQtyBase

$adjustCreated = Invoke-RestMethod -Uri "$api/api/sales/$orderId/void-rerelease" -Method Post
$adjustId = [string]$adjustCreated.id

$adjPendingDetail = Invoke-RestMethod -Uri "$api/api/sales/$adjustId" -Method Get
if ($adjPendingDetail.status -ne 'pending') { throw "Expected pending for adjustment order, got $($adjPendingDetail.status)" }
if (-not $adjPendingDetail.sourceOrder -or [string]$adjPendingDetail.sourceOrder.id -ne $orderId) {
  throw 'Adjustment order is not linked to source order correctly.'
}

$sourceAfterAdjustCreate = Invoke-RestMethod -Uri "$api/api/sales/$orderId" -Method Get
if (-not $sourceAfterAdjustCreate.adjustedByOrder -or [string]$sourceAfterAdjustCreate.adjustedByOrder.id -ne $adjustId) {
  throw 'Source order adjustedByOrder link is missing after adjustment create.'
}

$null = Invoke-RestMethod -Uri "$api/api/sales/$adjustId/fulfil" -Method Patch

$sourceFinal = Invoke-RestMethod -Uri "$api/api/sales/$orderId" -Method Get
$adjustFinal = Invoke-RestMethod -Uri "$api/api/sales/$adjustId" -Method Get
if ($sourceFinal.status -ne 'cancelled') { throw "Expected source order cancelled after adjustment fulfil, got $($sourceFinal.status)" }
if ($adjustFinal.status -ne 'fulfilled') { throw "Expected adjustment order fulfilled, got $($adjustFinal.status)" }

$stockFinalList = Invoke-RestMethod -Uri "$api/api/inventory/stock?productId=$productId" -Method Get
$batchFinal = $stockFinalList | Where-Object { [string]$_.id -eq $batchId } | Select-Object -First 1
if (-not $batchFinal) { throw 'Batch not found after adjustment fulfil.' }
$qtyFinal = [double]$batchFinal.currentQtyBase

$sourceHistory = Invoke-RestMethod -Uri "$api/api/sales/$orderId/history" -Method Get
$adjustHistory = Invoke-RestMethod -Uri "$api/api/sales/$adjustId/history" -Method Get
$hasAdjustmentCreated = @($sourceHistory | Where-Object { $_.actionType -eq 'adjustment_created' }).Count -gt 0
$hasAdjusted = @($sourceHistory | Where-Object { $_.actionType -eq 'adjusted' }).Count -gt 0
$adjustHasCreated = @($adjustHistory | Where-Object { $_.actionType -eq 'created' }).Count -gt 0
$adjustHasFulfilled = @($adjustHistory | Where-Object { $_.actionType -eq 'fulfilled' }).Count -gt 0

if (-not $hasAdjustmentCreated) { throw 'Source history missing adjustment_created.' }
if (-not $hasAdjusted) { throw 'Source history missing adjusted.' }
if (-not $adjustHasCreated) { throw 'Adjustment history missing created.' }
if (-not $adjustHasFulfilled) { throw 'Adjustment history missing fulfilled.' }

$expectedAfterFulfil = [Math]::Round(($initialQty - $qty), 6)
$deltaAfterFulfil = [Math]::Abs([Math]::Round(($qtyAfterFulfil - $expectedAfterFulfil), 6))
if ($deltaAfterFulfil -gt 0.0001) {
  throw "Unexpected stock after source fulfil. Expected $expectedAfterFulfil, got $qtyAfterFulfil"
}

$deltaFinalVsAfterFulfil = [Math]::Abs([Math]::Round(($qtyFinal - $qtyAfterFulfil), 6))
if ($deltaFinalVsAfterFulfil -gt 0.0001) {
  throw "Unexpected final stock after adjustment fulfil. Expected same as after fulfil ($qtyAfterFulfil), got $qtyFinal"
}

$result = [ordered]@{
  ok = $true
  sourceOrderId = $orderId
  adjustmentOrderId = $adjustId
  productId = $productId
  batchId = $batchId
  qtyExported = $qty
  initialQty = [Math]::Round($initialQty, 6)
  qtyAfterSourceFulfil = [Math]::Round($qtyAfterFulfil, 6)
  qtyAfterAdjustmentFulfil = [Math]::Round($qtyFinal, 6)
  sourceStatusFinal = $sourceFinal.status
  adjustmentStatusFinal = $adjustFinal.status
  sourceHistoryChecks = [ordered]@{
    adjustment_created = $hasAdjustmentCreated
    adjusted = $hasAdjusted
  }
  adjustmentHistoryChecks = [ordered]@{
    created = $adjustHasCreated
    fulfilled = $adjustHasFulfilled
  }
}

$result | ConvertTo-Json -Depth 8
