/**
 * Integration test for poll creation and update flow
 */
import { createServerClient } from '@supabase/ssr';

// Mock the external dependencies
jest.mock('next/headers');
jest.mock('next/cache');
jest.mock('next/navigation');
jest.mock('@supabase/ssr');

// Import the actions with relative paths to avoid module mapper issues
const { createPoll } = require('../../src/app/actions/create-poll');
const { updatePoll } = require('../../src/app/actions/update-poll');

describe('Poll Creation and Update Integration', () => {
  // Mock user
  const mockUser = { id: 'test-user-123' };
  
  // Mock data
  const pollId = 'test-poll-123';
  let pollData = null;
  let pollOptions = [];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset test data
    pollData = null;
    pollOptions = [];
    
    // Create a mock Supabase client that simulates DB state
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: mockUser }, 
          error: null 
        }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'polls') {
          return {
            // Insert poll
            insert: jest.fn().mockImplementation((data) => {
              pollData = {
                id: pollId,
                ...data
              };
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: pollData, 
                    error: null 
                  }),
                }),
              };
            }),
            
            // Select poll (for ownership check)
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: { created_by: mockUser.id }, 
                  error: null 
                }),
              }),
            }),
            
            // Update poll
            update: jest.fn().mockImplementation((data) => {
              pollData = {
                ...pollData,
                ...data
              };
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        } 
        else if (table === 'poll_options') {
          return {
            // Insert options
            insert: jest.fn().mockImplementation((options) => {
              if (Array.isArray(options)) {
                // Add IDs to simulate DB insertion
                const newOptions = options.map((opt, i) => ({
                  id: `option-${pollOptions.length + i + 1}`,
                  ...opt
                }));
                pollOptions.push(...newOptions);
              }
              return { error: null };
            }),
            
            // Select options
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ 
                data: pollOptions, 
                error: null 
              }),
            }),
            
            // Delete options
            delete: jest.fn().mockReturnValue({
              in: jest.fn().mockImplementation((field, ids) => {
                pollOptions = pollOptions.filter(o => !ids.includes(o.id));
                return { error: null };
              }),
            }),
          };
        }
        return {};
      }),
    };
    
    // Set up the mock
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  });
  
  test('should create and update a poll in a complete workflow', async () => {
    // 1. Define initial poll data
    const initialPoll = {
      title: 'Initial Integration Poll',
      description: 'Testing the integration flow',
      options: ['First Option', 'Second Option'],
      isMultipleChoice: false,
      isAnonymous: false,
    };
    
    // 2. Create the poll
    const result = await createPoll(initialPoll);
    
    // 3. Verify poll was created correctly
    expect(result).toBeDefined();
    expect(result.poll.id).toBe(pollId);
    expect(result.poll.title).toBe(initialPoll.title);
    expect(result.poll.description).toBe(initialPoll.description);
    expect(result.poll.is_multiple_choice).toBe(initialPoll.isMultipleChoice);
    expect(result.poll.is_anonymous).toBe(initialPoll.isAnonymous);
    expect(pollOptions.length).toBe(2);
    
    // 4. Define updated poll data
    const updatedPoll = {
      title: 'Updated Integration Poll',
      description: 'Updated description for testing',
      options: ['First Option', 'Second Option', 'Third Option'],
      isMultipleChoice: true,
      isAnonymous: true,
    };
    
    // 5. Update the poll
    await updatePoll(pollId, updatedPoll);
    
    // 6. Verify poll was updated correctly
    expect(pollData.title).toBe(updatedPoll.title);
    expect(pollData.description).toBe(updatedPoll.description);
    expect(pollData.is_multiple_choice).toBe(updatedPoll.isMultipleChoice);
    expect(pollData.is_anonymous).toBe(updatedPoll.isAnonymous);
    expect(pollOptions.length).toBe(3);
    
    // 7. Verify options were updated correctly
    const optionTexts = pollOptions.map(o => o.option_text);
    expect(optionTexts).toContain('First Option');
    expect(optionTexts).toContain('Second Option');
    expect(optionTexts).toContain('Third Option');
  });
});
