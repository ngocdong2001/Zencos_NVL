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
  orderRef = "SMOKE-XK-CANCEL-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  customerId = $customerId
  exportedAt = (Get-Date).ToString('o')
  notes = 'Smoke test cancel pending adjustment outbound'
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

$null = Invoke-RestMethod -Uri "$api/api/sales/$orderId/fulfil" -Method Patch
$sourceFulfilled = Invoke-RestMethod -Uri "$api/api/sales/$orderId" -Method Get
if ($sourceFulfilled.status -ne 'fulfilled') { throw "Expected source fulfilled, got $($sourceFulfilled.status)" }

$stockAfterSourceFulfilList = Invoke-RestMethod -Uri "$api/api/inventory/stock?productId=$productId" -Method Get
$batchAfterSourceFulfil = $stockAfterSourceFulfilList | Where-Object { [string]$_.id -eq $batchId } | Select-Object -First 1
if (-not $batchAfterSourceFulfil) { throw 'Batch not found after source fulfil.' }
$qtyAfterSourceFulfil = [double]$batchAfterSourceFulfil.currentQtyBase

$adjustCreated = Invoke-RestMethod -Uri "$api/api/sales/$orderId/void-rerelease" -Method Post
$adjustId = [string]$adjustCreated.id

$adjustPending = Invoke-RestMethod -Uri "$api/api/sales/$adjustId" -Method Get
if ($adjustPending.status -ne 'pending') { throw "Expected adjustment pending, got $($adjustPending.status)" }
if (-not $adjustPending.sourceOrder -or [string]$adjustPending.sourceOrder.id -ne $orderId) {
  throw 'Adjustment source link mismatch.'
}

$sourceAfterAdjustCreate = Invoke-RestMethod -Uri "$api/api/sales/$orderId" -Method Get
if (-not $sourceAfterAdjustCreate.adjustedByOrder -or [string]$sourceAfterAdjustCreate.adjustedByOrder.id -ne $adjustId) {
  throw 'Source adjustedByOrder missing before cancel adjustment.'
}

$null = Invoke-RestMethod -Uri "$api/api/sales/$adjustId/cancel" -Method Patch

$sourceFinal = Invoke-RestMethod -Uri "$api/api/sales/$orderId" -Method Get
$adjustFinal = Invoke-RestMethod -Uri "$api/api/sales/$adjustId" -Method Get

if ($sourceFinal.status -ne 'fulfilled') {
  throw "Expected source order remain fulfilled after cancel pending adjustment, got $($sourceFinal.status)"
}
if ($sourceFinal.adjustedByOrder) {
  throw 'Expected source adjustedByOrder cleared after cancel adjustment.'
}
if ($adjustFinal.status -ne 'cancelled') {
  throw "Expected adjustment order cancelled, got $($adjustFinal.status)"
}

$stockFinalList = Invoke-RestMethod -Uri "$api/api/inventory/stock?productId=$productId" -Method Get
$batchFinal = $stockFinalList | Where-Object { [string]$_.id -eq $batchId } | Select-Object -First 1
if (-not $batchFinal) { throw 'Batch not found at final step.' }
$qtyFinal = [double]$batchFinal.currentQtyBase

$sourceHistory = Invoke-RestMethod -Uri "$api/api/sales/$orderId/history" -Method Get
$adjustHistory = Invoke-RestMethod -Uri "$api/api/sales/$adjustId/history" -Method Get

$hasAdjustmentCreated = @($sourceHistory | Where-Object { $_.actionType -eq 'adjustment_created' }).Count -gt 0
$hasAdjustmentRestored = @($sourceHistory | Where-Object { $_.actionType -eq 'adjustment_restored' }).Count -gt 0
$adjustHasCancelled = @($adjustHistory | Where-Object { $_.actionType -eq 'cancelled' }).Count -gt 0

if (-not $hasAdjustmentCreated) { throw 'Source history missing adjustment_created.' }
if (-not $hasAdjustmentRestored) { throw 'Source history missing adjustment_restored.' }
if (-not $adjustHasCancelled) { throw 'Adjustment history missing cancelled.' }

$expectedAfterFulfil = [Math]::Round(($initialQty - $qty), 6)
$deltaAfterFulfil = [Math]::Abs([Math]::Round(($qtyAfterSourceFulfil - $expectedAfterFulfil), 6))
if ($deltaAfterFulfil -gt 0.0001) {
  throw "Unexpected stock after source fulfil. Expected $expectedAfterFulfil, got $qtyAfterSourceFulfil"
}

$deltaFinal = [Math]::Abs([Math]::Round(($qtyFinal - $qtyAfterSourceFulfil), 6))
if ($deltaFinal -gt 0.0001) {
  throw "Unexpected stock after cancel pending adjustment. Expected $qtyAfterSourceFulfil, got $qtyFinal"
}

$result = [ordered]@{
  ok = $true
  sourceOrderId = $orderId
  adjustmentOrderId = $adjustId
  productId = $productId
  batchId = $batchId
  qtyExported = $qty
  initialQty = [Math]::Round($initialQty, 6)
  qtyAfterSourceFulfil = [Math]::Round($qtyAfterSourceFulfil, 6)
  qtyAfterCancelPendingAdjustment = [Math]::Round($qtyFinal, 6)
  sourceStatusFinal = $sourceFinal.status
  sourceAdjustedByCleared = (-not [bool]$sourceFinal.adjustedByOrder)
  adjustmentStatusFinal = $adjustFinal.status
  sourceHistoryChecks = [ordered]@{
    adjustment_created = $hasAdjustmentCreated
    adjustment_restored = $hasAdjustmentRestored
  }
  adjustmentHistoryChecks = [ordered]@{
    cancelled = $adjustHasCancelled
  }
}

$result | ConvertTo-Json -Depth 8
