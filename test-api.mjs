#!/usr/bin/env node

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW1xZ2czNGswMDBvcjR1YzFlY241NTBvIiwiZW1haWwiOiJhZG1pbkBhaWJpei5sb2NhbCIsInBlcm1pc3Npb25zIjpbImN1c3RvbWVycy5yZWFkIiwiY3VzdG9tZXJzLndyaXRlIiwic3VwcGxpZXJzLnJlYWQiLCJzdXBwbGllcnMud3JpdGUiLCJwcm9kdWN0cy5yZWFkIiwicHJvZHVjdHMud3JpdGUiLCJpbnZlbnRvcnkucmVhZCIsImludmVudG9yeS53cml0ZSIsInNhbGVzLnJlYWQiLCJzYWxlcy53cml0ZSIsInB1cmNoYXNlcy5yZWFkIiwicHVyY2hhc2VzLndyaXRlIiwicmVwb3J0cy5yZWFkIiwicG9zLnJlYWQiLCJwb3Mud3JpdGUiLCJ0cmFuc2ZlcnMucmVhZCIsInRyYW5zZmVycy53cml0ZSIsInF1b3Rlcy5yZWFkIiwicXVvdGVzLndyaXRlIiwicHJvbW90aW9ucy5yZWFkIiwicHJvbW90aW9ucy53cml0ZSIsInNldHRpbmdzLnJlYWQiLCJzZXR0aW5ncy53cml0ZSJdLCJpYXQiOjE3NzM3NTg2MTMsImV4cCI6MTc3Mzc4NzQxM30._FgNuoNi14tdRdIbh_OOEG_K-_Z0w5n9YvQBIFIPzcI'

async function test() {
  try {
    console.log('📞 Testing AI chat endpoint...')
    const resp = await fetch('http://localhost:4000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: 'sửa giá vốn sữa dutch',
        history: [],
      }),
    })
    
    console.log(`Status: ${resp.status}`)
    const data = await resp.json()
    console.log('✅ Response:', data)
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

test()
