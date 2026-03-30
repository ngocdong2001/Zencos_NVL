import axios from 'axios';

async function test() {
  const apiUrl = 'http://localhost:4000';
  
  console.log('\n=== Testing Two-Step Product Confirmation ===\n');
  
  try {
    // Get token first
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${apiUrl}/api/auth/login`, {
      email: 'admin@aibiz.local',
      password: 'Admin@12345'
    });
    const authToken = loginRes.data.token;
    console.log('✓ Logged in\n');
    
    // Test 2: Ambiguous request
    console.log('2. Testing ambiguous product request: "Đổi giá bán sua thanh 100000"');
    const t1 = await axios.post(
      `${apiUrl}/api/ai/chat`,
      { message: 'Đổi giá bán sua thanh 100000', history: [] },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log(`AI Reply: ${t1.data.reply.substring(0, 100)}...\n`);
    
    const candidates = t1.data.actions?.[0]?.result?.candidates || [];
    if (candidates.length > 0) {
      console.log(`✓ Candidates returned: ${candidates.length}`);
      candidates.forEach((c, i) => {
        console.log(`  ${i+1}. ${c.name} (${c.code}) - Price: ${c.sellPrice}`);
      });
    } else {
      console.log('! No candidates returned');
    }
    
    // Test 3: User confirms
    console.log('\n3. Testing product selection: "Chọn 1"');
    const hist = [
      { role: 'user', content: 'Đổi giá bán sua thanh 100000' },
      { role: 'assistant', content: t1.data.reply }
    ];
    
    const t2 = await axios.post(
      `${apiUrl}/api/ai/chat`,
      { 
        message: 'Chọn 1',
        history: hist,
        pendingCandidates: candidates
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log(`AI Reply: ${t2.data.reply.substring(0, 100)}...\n`);
    
    if (t2.data.actions?.[0]?.result?.success) {
      console.log('✓ UPDATE SUCCESSFUL!');
      const prod = t2.data.actions[0].result.product;
      console.log(`  Product: ${prod.name}`);
      console.log(`  New Price: ${prod.sellPrice}`);
    } else {
      console.log('✗ UPDATE FAILED');
      if (t2.data.actions?.[0]?.result?.error) {
        console.log(`  Error: ${t2.data.actions[0].result.error}`);
      }
    }
    
  } catch (err) {
    console.error('✗ Test failed:', err.message);
    if (err.response?.data) {
      console.error('Response:', err.response.data);
    }
  }
}

test();
