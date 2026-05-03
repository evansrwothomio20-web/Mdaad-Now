const assert = require('assert');
const { createServer } = require('http');
const handler = require('./index.js');

/**
 * Mdaad API Test Suite
 * Standalone verification for production-ready routes.
 */

async function runTests() {
  console.log('🚀 Starting Mdaad API Verification Suite...');
  
  const mockRes = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; },
    setHeader: function(name, value) { this.headers = this.headers || {}; this.headers[name] = value; return this; }
  };

  // Test 1: Health Check
  console.log('Test 1: Health Check...');
  await handler({ url: '/api/health', method: 'GET' }, mockRes);
  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.data.status, 'online');
  console.log('✅ Health Check Passed');

  // Test 2: Normalize Path (Trailing Slash)
  console.log('Test 2: Path Normalization...');
  await handler({ url: '/api/campaigns/', method: 'GET' }, mockRes);
  assert.strictEqual(mockRes.statusCode, 200);
  assert(Array.isArray(mockRes.data));
  console.log('✅ Path Normalization Passed');

  // Test 3: Campaigns POST
  console.log('Test 3: Campaigns POST handler...');
  await handler({ url: '/api/campaigns', method: 'POST' }, mockRes);
  assert.strictEqual(mockRes.statusCode, 201);
  assert(mockRes.data.success);
  assert(mockRes.data.id);
  console.log('✅ Campaigns POST Passed');

  // Test 4: External Proxy Fallback
  console.log('Test 4: External Proxy Fallback...');
  await handler({ url: '/api/external/unhcr/population', method: 'GET' }, mockRes);
  assert.strictEqual(mockRes.statusCode, 200);
  assert(Array.isArray(mockRes.data));
  console.log('✅ External Proxy Passed');

  console.log('\n✨ ALL TESTS PASSED SUCCESSFULLY');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED');
  console.error(err);
  process.exit(1);
});
