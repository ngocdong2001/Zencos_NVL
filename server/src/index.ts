import 'dotenv/config'
import 'express-async-errors'
import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import masterDataRouter from './routes/masterData.js'
import productsRouter from './routes/products.js'
import inventoryRouter from './routes/inventory.js'
import salesRouter from './routes/sales.js'
import purchasesRouter from './routes/purchases.js'
import reportsRouter from './routes/reports.js'
import posRouter from './routes/pos.js'
import transfersRouter from './routes/transfers.js'
import quotesRouter from './routes/quotes.js'
import promotionsRouter from './routes/promotions.js'
import systemOpsRouter from './routes/systemOps.js'
import aiRouter from './routes/ai.js'
import catalogRouter from './routes/catalog.js'
import inventoryOpeningRouter from './routes/inventoryOpening.js'
import inboundDraftsRouter from './routes/inboundDrafts.js'
import inboundRouter from './routes/inbound.js'

// Normalize BigInt values in API responses to avoid JSON serialization failures.
if (!(BigInt.prototype as any).toJSON) {
  ;(BigInt.prototype as any).toJSON = function () {
    return this.toString()
  }
}

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-biz-api', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/master-data', masterDataRouter)
app.use('/api/products', productsRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/sales', salesRouter)
app.use('/api/purchases', purchasesRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/pos', posRouter)
app.use('/api/transfers', transfersRouter)
app.use('/api/quotes', quotesRouter)
app.use('/api/promotions', promotionsRouter)
app.use('/api/system', systemOpsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/catalog', catalogRouter)
app.use('/api/inventory-opening', inventoryOpeningRouter)
app.use('/api/inbound-drafts', inboundDraftsRouter)
app.use('/api/inbound', inboundRouter)

// Global error handler — prevents unhandled DB/Prisma errors from crashing the process
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err.message)
  const isPrismaError = err.constructor.name.startsWith('Prisma') || err.message.includes('prisma')
  // MySQL constraint errors (NOT NULL, UNIQUE, FK) should be 400/409, not 503
  const isConstraintError = isPrismaError && (
    err.message.includes('ER_NO_DEFAULT_FOR_FIELD') ||
    err.message.includes('ER_BAD_NULL_ERROR') ||
    err.message.includes('Duplicate entry') ||
    err.message.includes('ER_DUP_ENTRY') ||
    err.message.includes('foreign key constraint')
  )
  if (isConstraintError) {
    res.status(400).json({ error: err.message })
  } else if (isPrismaError) {
    res.status(503).json({ error: 'Database unavailable. Please check your DATABASE_URL and MySQL server.' })
  } else {
    res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
})

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason)
})

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  console.log(`AI Biz API listening on http://localhost:${port}`)
})
