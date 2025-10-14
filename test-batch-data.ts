// Quick test to verify the batch generation endpoint receives data correctly

const testData = {
  rows: [
    { Email: 'test1@example.com', Name: 'Test 1' },
    { Email: 'test2@example.com', Name: 'Test 2' },
    { Email: 'test3@example.com', Name: 'Test 3' },
  ],
  mapping: { Email: 'Email' },
  designName: 'Test Batch',
}

console.log('Test data:')
console.log(JSON.stringify(testData, null, 2))
console.log('\nFirst row:', testData.rows[0])
console.log('Row count:', testData.rows.length)

// Simulate what axios would do
const serialized = JSON.stringify(testData)
const deserialized = JSON.parse(serialized)

console.log('\nAfter serialization:')
console.log('First row:', deserialized.rows[0])
console.log('Row count:', deserialized.rows.length)
