// Runs before each test file. Every Jest worker gets its own throwaway database,
// so test files running in parallel never share (or drop) each other's data,
// and a MONGODB_DB_NAME left over from development can't point tests at real data.
process.env.NODE_ENV = 'test';
process.env.MONGODB_DB_NAME = `fleet_test_${process.env.JEST_WORKER_ID ?? '1'}`;
