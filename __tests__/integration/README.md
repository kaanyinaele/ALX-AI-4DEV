# Poll Integration Tests

This directory contains integration tests for the poll functionality in our Next.js application.

## Test Files

- **poll-flow.test.ts**: Tests the basic flow of creating and updating polls
- **poll-integration.test.ts**: Simple integration test for poll actions
- **poll-management.test.ts**: Tests for poll management features
- **simple-poll.test.js**: Simple integration test for poll workflow
- **poll-user-journey.test.ts**: Comprehensive integration test for the entire poll user journey (create, update, vote, view)
- **poll-voting.test.ts**: Focused integration tests for the voting functionality

## Running the Tests

To run all tests:

```bash
npm test
```

To run a specific test file:

```bash
npx jest __tests__/integration/poll-user-journey.test.ts
```

## Coverage

Current test coverage is around 84.12% for the poll action files.

## Test Approach

Our integration tests use Jest mocks to simulate Supabase database interactions, allowing us to test the full flow of:

1. Creating polls
2. Updating polls
3. Voting on polls
4. Viewing poll results

The mocks maintain a simple in-memory state that simulates how the database would behave, allowing us to verify that the business logic works correctly across multiple API calls.
