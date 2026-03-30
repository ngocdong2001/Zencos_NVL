#!/usr/bin/env node

const API_BASE = 'http://localhost:4000/api'
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW1xZ2czNGswMDBvcjR1YzFlY241NTBvIiwiZW1haWwiOiJhZG1pbkBhaWJpei5sb2NhbCIsInBlcm1pc3Npb25zIjpbImN1c3RvbWVycy5yZWFkIiwiY3VzdG9tZXJzLndyaXRlIiwic3VwcGxpZXJzLnJlYWQiLCJzdXBwbGllcnMud3JpdGUiLCJwcm9kdWN0cy5yZWFkIiwicHJvZHVjdHMud3JpdGUiLCJpbnZlbnRvcnkucmVhZCIsImludmVudG9yeS53cml0ZSIsInNhbGVzLnJlYWQiLCJzYWxlcy53cml0ZSIsInB1cmNoYXNlcy5yZWFkIiwicHVyY2hhc2VzLndyaXRlIiwicmVwb3J0cy5yZWFkIiwicG9zLnJlYWQiLCJwb3Mud3JpdGUiLCJ0cmFuc2ZlcnMucmVhZCIsInRyYW5zZmVycy53cml0ZSIsInF1b3Rlcy5yZWFkIiwicXVvdGVzLndyaXRlIiwicHJvbW90aW9ucy5yZWFkIiwicHJvbW90aW9ucy53cml0ZSIsInNldHRpbmdzLnJlYWQiLCJzZXR0aW5ncy53cml0ZSJdLCJpYXQiOjE3NzM3NTg2MTMsImV4cCI6MTc3Mzc4NzQxM30._FgNuoNi14tdRdIbh_OOEG_K-_Z0w5n9YvQBIFIPzcI'

async function main() {
  try {
    console.log('📊 Verifying database state...\n')
    
    const res = await fetch(`${API_BASE}/products?limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    let products = await res.json()
    if (products.data) products = products.data
    
    const dutch = products.find(p => p.code === 'FUZZY001')
    if (!dutch) {
      console.log('❌ Product FUZZY001 not found')
      return
    }
    
    console.log('✓ Product found:')
    console.log(`  ID: ${dutch.id}`)
    console.log(`  Name: ${dutch.name}`)
    console.log(`  Code: ${dutch.code}`)
    console.log(`  Current sellPrice: ${dutch.sellPrice}`)
    console.log(`  Current costPrice: ${dutch.costPrice}`)
    console.log('')
    
    // Now test AI update
    console.log('🧪 Testing AI update flow...\n')
    
    // Step 1: Request update
    const msg1 = 'cập nhật giá Sữa tươi Dutch Lady 180ml thành 555000'
    console.log(`User: "${msg1}"`)
    
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
    console.log(`AI reply: ${data1.reply?.substring(0, 80)}...`)
    console.log(`Actions: ${data1.actions?.length || 0}`)
    
    let candidates = []
    if (data1.actions) {
      for (const action of data1.actions) {
        if (Array.isArray(action.result.candidates)) {
          candidates = action.result.candidates
          break
        }
      }
    }
    
    if (candidates.length > 0) {
      console.log(`Candidates found: ${candidates.length}`)
      
      // Step 2: Confirm
      const msg2 = 'Chọn 1'
      console.log(`\nUser: "${msg2}"`)
      
      const history1 = [
        { role: 'user', content: msg1 },
        { role: 'assistant', content: data1.reply },
      ]
      
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
      console.log(`AI reply: ${data2.reply?.substring(0, 80)}...`)
      console.log(`Actions: ${data2.actions?.length || 0}`)
      
      if (data2.actions && data2.actions[0]) {
        const action = data2.actions[0]
        console.log(`Action tool: ${action.tool}`)
        console.log(`Success: ${action.result.success}`)
      }
    }
    
    // Wait 2 seconds and check database again
    console.log('\n⏳ Waiting 2 seconds...')
    await new Promise(r => setTimeout(r, 2000))
    
    console.log('\n📊 Checking database after action...')
    const res3 = await fetch(`${API_BASE}/products?limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    let products2 = await res3.json()
    if (products2.data) products2 = products2.data
    
    const dutchAfter = products2.find(p => p.code === 'FUZZY001')
    if (dutchAfter) {
      console.log(`  sellPrice now: ${dutchAfter.sellPrice}`)
      
      if (Number(dutchAfter.sellPrice) === 555000) {
        console.log('\n✅✅✅ DATABASE UPDATED SUCCESSFULLY!')
      } else {
        console.log(`\n❌ Database NOT updated (expected 555000, got ${dutchAfter.sellPrice})`)
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message)
  }
}

main()
