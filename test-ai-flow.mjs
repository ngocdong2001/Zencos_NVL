#!/usr/bin/env node

const API_BASE = 'http://localhost:4000/api'
let token = ''

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@aibiz.local', password: 'Admin@12345' }),
  })
  const data = await res.json()
  token = data.token
  console.log('✅ Logged in, token:', token.substring(0, 20) + '...')
}

async function listProducts() {
  console.log('\n--- List available products ---')
  const res = await fetch(`${API_BASE}/products?limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  
  let products = await res.json()
  
  // Handle paginated response
  if (products.data) {
    products = products.data
  }
  
  if (!Array.isArray(products)) {
    console.log('❌ Products endpoint did not return an array!')
    return null
  }
  
  console.log('Found', products.length, 'products:')
  products.forEach((p, i) => {
    console.log(`${i + 1}. "${p.name}" (${p.code}) - Price: ${p.sellPrice}`)
  })
  return products[0]
}

async function testAiFlow(product) {
  console.log('\n--- Test Step 1: Send update request ---')
  
  // Skip products with emoji or weird characters, use Dutch Lady
  let testProduct = product
  if (testProduct.name.includes('❓') || testProduct.name.includes('🔗')) {
    // Use Dutch Lady product instead
    const res = await fetch(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    let allProducts = await res.json()
    if (allProducts.data) allProducts = allProducts.data
    testProduct = allProducts.find(p => p.code === 'FUZZY001') || allProducts[1]
  }
  
  // Step 1: Send initial message to update product
  const msg1 = `cập nhật giá ${testProduct.name} thành 125000`
  console.log('Testing message:', msg1)
  console.log('Target product ID:', testProduct.id)
  const res1 = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: msg1,
      history: [],
    }),
  })
  
  const data1 = await res1.json()
  console.log('🔹 Response 1:')
  console.log('   Reply:', data1.reply?.substring(0, 100) || 'none')
  console.log('   Actions:', data1.actions?.length || 0, 'action(s)')
  console.log('   Candidates:', data1.actions?.some(a => Array.isArray(a.result.candidates)) ? 'Yes' : 'No')
  
  // Extract candidates if present
  let candidates = []
  if (data1.actions) {
    for (const action of data1.actions) {
      if (Array.isArray(action.result.candidates)) {
        candidates = action.result.candidates
        console.log('   >>> Found', candidates.length, 'product candidates')
        candidates.forEach((c, i) => {
          console.log(`        ${i + 1}. ${c.name} (${c.code}) - Price: ${c.sellPrice}`)
        })
        break
      }
    }
  }
  
  if (candidates.length === 0) {
    console.log('❌ No candidates found! Cannot continue test.')
    return
  }
  
  // Build history from first response
  const history1 = [
    { role: 'user', content: msg1 },
    { role: 'assistant', content: data1.reply },
  ]
  
  console.log('\n--- Test Step 2: Confirm product selection ---')
  
  // Step 2: Send confirmation message
  const msg2 = 'Chọn 1'
  const res2 = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: msg2,
      history: history1,
      pendingCandidates: candidates,
    }),
  })
  
  const data2 = await res2.json()
  console.log('🔹 Response 2 (Confirmation):')
  console.log('   Reply:', data2.reply?.substring(0, 100) || 'none')
  console.log('   Actions:', data2.actions?.length || 0, 'action(s)')
  
  if (data2.actions && data2.actions.length > 0) {
    const action = data2.actions[0]
    console.log('   Action tool:', action.tool)
    console.log('   Action args:', JSON.stringify(action.args).substring(0, 100))
    console.log('   Result:', JSON.stringify(action.result).substring(0, 150))
  }
  
  // Check database
  console.log('\n--- Verify database update ---')
  const res3 = await fetch(`${API_BASE}/products`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  let allProducts = await res3.json()
  
  if (allProducts.data) {
    allProducts = allProducts.data
  }
  
  // Find the target product - use the first response's action
  let targetId = null
  if (data1.actions && data1.actions.length > 0) {
    const action = data1.actions[0]
    if (action.result.product && action.result.product.id) {
      targetId = action.result.product.id
    }
  }
  
  if (targetId) {
    const updated = allProducts.find(p => p.id === targetId)
    if (updated) {
      console.log('✅ Product found in database:')
      console.log('   Name:', updated.name)
      console.log('   Current price:', updated.sellPrice)
      if (Number(updated.sellPrice) === 125000) {
        console.log('   ✓✓✓ Price was SUCCESSFULLY updated to 125000!')
        console.log('\n🎉 TEST PASSED: Database update working correctly!')
      } else {
        console.log('   ❌ Price NOT updated (still', updated.sellPrice, ')')
      }
    } else {
      console.log('❌ Product not found in database after update')
    }
  } else {
    console.log('ℹ️  Product was auto-updated by the system (no candidates for confirmation)')
    console.log('   This means the fuzzy matching found a high-confidence match and executed immediately')
    console.log('   Response indicated success:', data1.reply?.includes('cap nhat') ? '✓ Yes' : '✗ No')
  }
}

async function main() {
  try {
    console.log('🚀 Testing AI Chatbox Confirmation Flow\n')
    await login()
    const product = await listProducts()
    if (product) {
      await testAiFlow(product)
    } else {
      console.log('❌ No products available')
    }
  } catch (err) {
    console.error('❌ Error:', err.message)
    console.error(err.stack)
  }
}

main()
