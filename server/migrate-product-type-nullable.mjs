// One-time migration: make products.product_type nullable
import mysql from 'mysql2/promise'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse DATABASE_URL from .env
const envContent = readFileSync(join(__dirname, '.env'), 'utf-8')
const match = envContent.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)
if (!match) throw new Error('DATABASE_URL not found in .env')
const dbUrl = match[1].trim()

// Parse mysql url: mysql://user:pass@host:port/db
const url = new URL(dbUrl.replace(/^mysql:/, 'http:'))
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
})

console.log('Connected to MySQL.')

// Check current column nullability
const [cols] = await connection.execute(
  `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'product_type'`,
  [url.pathname.slice(1)]
)
console.log('Current column info:', cols[0])

if (cols[0]?.IS_NULLABLE === 'YES') {
  console.log('Column is already nullable. No changes needed.')
  await connection.end()
  process.exit(0)
}

// Find FK name
const [fks] = await connection.execute(
  `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'product_type' AND REFERENCED_TABLE_NAME IS NOT NULL`,
  [url.pathname.slice(1)]
)
console.log('FK constraints on product_type:', fks)

for (const fk of fks) {
  console.log(`Dropping FK: ${fk.CONSTRAINT_NAME}`)
  await connection.execute(`ALTER TABLE products DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``)
}

console.log('Altering column to NULL...')
await connection.execute('ALTER TABLE products MODIFY COLUMN product_type BIGINT UNSIGNED NULL')

console.log('Re-adding FK with ON DELETE SET NULL...')
await connection.execute(
  `ALTER TABLE products ADD CONSTRAINT products_product_type_fkey FOREIGN KEY (product_type) REFERENCES product_classifications(id) ON DELETE SET NULL ON UPDATE CASCADE`
)

console.log('Done! products.product_type is now nullable.')
await connection.end()
