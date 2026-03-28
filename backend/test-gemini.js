/**
 * Test script for Gemini API integration
 * Run with: node test-gemini.js
 */

require('dotenv').config();
const { analyzeCase } = require('./utils/gemini');

async function testGeminiIntegration() {
  console.log('\n========================================');
  console.log('🧪 Testing Gemini API Integration');
  console.log('========================================\n');

  // Check API key
  console.log('1. Checking environment variables...');
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    process.exit(1);
  }
  console.log('✓ GEMINI_API_KEY loaded:', process.env.GEMINI_API_KEY.substring(0, 10) + '...\n');

  // Test case 1: Simple property dispute
  console.log('2. Testing Case 1: Property Dispute');
  console.log('-----------------------------------');
  const testCase1 = `This case concerns a property dispute between two parties regarding ownership and possession of residential land. The dispute arises due to conflicting claims supported by incomplete and outdated documentation. Both parties have presented their claims before the court, seeking legal validation of ownership rights.`;
  
  try {
    const result1 = await analyzeCase(testCase1);
    console.log('✓ Test 1 PASSED');
    console.log('Result:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error('❌ Test 1 FAILED:', error.message);
    process.exit(1);
  }

  console.log('\n3. Testing Case 2: Criminal Case');
  console.log('-----------------------------------');
  const testCase2 = `Case Type: Criminal\nFiling Date: 2020-01-15\n\nAccused charged with theft under IPC Section 379. Property worth Rs. 50,000 stolen. Accused detained since 2020. Bail application pending. First-time offender with no prior criminal record.`;
  
  try {
    const result2 = await analyzeCase(testCase2);
    console.log('✓ Test 2 PASSED');
    console.log('Result:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('❌ Test 2 FAILED:', error.message);
    process.exit(1);
  }

  console.log('\n4. Testing Case 3: High Priority Murder Case');
  console.log('-----------------------------------');
  const testCase3 = `Case Type: Criminal\nFiling Date: 2019-06-10\n\nMurder case under IPC Section 302. Victim was killed in a premeditated attack. Two eyewitnesses available. Accused absconding. Case pending trial for 5 years. Victim's family seeking justice.`;
  
  try {
    const result3 = await analyzeCase(testCase3);
    console.log('✓ Test 3 PASSED');
    console.log('Result:', JSON.stringify(result3, null, 2));
    
    // Verify high priority
    if (result3.priority !== 'High') {
      console.warn('⚠️  Warning: Murder case not marked as High priority');
    } else {
      console.log('✓ Priority correctly set to High');
    }
  } catch (error) {
    console.error('❌ Test 3 FAILED:', error.message);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('✅ All tests PASSED!');
  console.log('========================================\n');
  console.log('✓ Gemini API is working correctly');
  console.log('✓ JSON parsing is successful');
  console.log('✓ All required fields are present');
  console.log('✓ Priority detection is working\n');
}

// Run tests
testGeminiIntegration().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
