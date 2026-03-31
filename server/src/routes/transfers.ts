import { Router, Request, Response } from 'express'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()

// ── Not Implemented ───────────────────────────────────────────────────
// Internal stock transfers between warehouse locations are not modelled
// in the current warehouse schema.  The InventoryTransaction model
// (type: adjustment) should be used for manual stock corrections until a
// dedicated Transfer model and migration are added.
// ─────────────────────────────────────────────────────────────────────
const notImplemented = (_req: Request, res: Response): void => {
  res.status(501).json({
    error: 'Internal stock transfers are not implemented in the current warehouse schema.',
    hint: 'Use POST /api/inventory/transactions with type "adjustment" for stock corrections.',
  })
}

router.get('/', requireAuth, requirePermission('transfers.read'), notImplemented)
router.get('/:id', requireAuth, requirePermission('transfers.read'), notImplemented)
router.post('/', requireAuth, requirePermission('transfers.write'), notImplemented)
router.post('/:id/confirm', requireAuth, requirePermission('transfers.write'), notImplemented)
router.patch('/:id/cancel', requireAuth, requirePermission('transfers.write'), notImplemented)

export default router
