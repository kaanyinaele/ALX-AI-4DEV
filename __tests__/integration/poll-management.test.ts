/**
 * Integration test for poll creation and management flow
 * 
 * This test validates the end-to-end flow of:
 * 1. Creating a new poll
 * 2. Updating the poll
 * 3. Verifying that both operations work correctly together
 */

import { createPoll } from '../../src/app/actions/create-poll';
import { updatePoll } from '../../src/app/actions/update-poll';
import { PollFormData } from '../../src/lib/schemas/poll';
import { createServerClient } from '@supabase/ssr';

// Mock modules are already set up in __tests__/setup.ts

describe('Poll management flow integration', () => {
  // Mock user data
  const mockUser = { id: 'test-user-123' };
  
  // Mock poll data
  let createdPoll: any;
  const pollId = 'poll-integration-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock created poll object for our test flow
    createdPoll = {
      id: pollId,
      title: 'Original Poll Title',
      description: 'Original description',
      created_by: mockUser.id,
      is_multiple_choice: false,
      is_anonymous: false,
    };

    // Set up initial mock options
    const initialOptions = [
      { id: 'option-1', option_text: 'Option 1', poll_id: pollId },
      { id: 'option-2', option_text: 'Option 2', poll_id: pollId },
    ];

    // Track state across different calls to simulate a database
    let currentOptions = [...initialOptions];

    // Create a more sophisticated mock that maintains state between calls
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockImplementation((table) => {
        // Handle polls table
        if (table === 'polls') {
          return {
            // For creating a poll
            insert: jest.fn().mockImplementation((pollData) => {
              // Update createdPoll with data from the insert call
              createdPoll = {
                id: pollId,
                ...pollData,
              };
              
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: createdPoll, error: null }),
                }),
              };
            }),
            
            // For selecting a poll (ownership check in updatePoll)
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: { created_by: mockUser.id },
                  error: null,
                }),
              }),
            }),
            
            // For updating a poll
            update: jest.fn().mockImplementation((pollData) => {
              // Update createdPoll with data from the update call
              createdPoll = {
                ...createdPoll,
                ...pollData,
              };
              
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        // Handle poll_options table
        else if (table === 'poll_options') {
          return {
            // For inserting options
            insert: jest.fn().mockImplementation((newOptions) => {
              if (Array.isArray(newOptions)) {
                // Add IDs to simulate database insertion
                const optionsWithIds = newOptions.map((opt, index) => ({
                  id: `new-option-${index + currentOptions.length + 1}`,
                  ...opt
                }));
                
                // Add new options to our "database"
                currentOptions = [...currentOptions, ...optionsWithIds];
              }
              return { error: null };
            }),
            
            // For selecting options
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: currentOptions,
                error: null,
              }),
            }),
            
            // For deleting options
            delete: jest.fn().mockReturnValue({
              in: jest.fn().mockImplementation((_, optionIds) => {
                // Remove options with the specified IDs from our "database"
                currentOptions = currentOptions.filter(opt => !optionIds.includes(opt.id));
                return { error: null };
              }),
            }),
          };
        }
        return {};
      }),
    };
    
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should create and update a poll successfully', async () => {
    // 1. Create a new poll
    const createPollData: PollFormData = {
      title: 'Integration Test Poll',
      description: 'Testing the full poll workflow',
      options: ['Option A', 'Option B'],
      isMultipleChoice: false,
      isAnonymous: false,
    };

    const createResult = await createPoll(createPollData);
    
    // Verify poll was created with correct data
    expect(createResult).toBeDefined();
    expect(createResult.poll.id).toBe(pollId);
    expect(createResult.poll.title).toBe(createPollData.title);
    
    // 2. Update the poll
    const updatePollData: PollFormData = {
      title: 'Updated Integration Test Poll',
      description: 'Updated description',
      options: ['Option A', 'Option B', 'Option C'], // Added a new option
      isMultipleChoice: true, // Changed from false to true
      isAnonymous: true, // Changed from false to true
    };

    await updatePoll(pollId, updatePollData);
    
    // 3. Verify the poll was updated correctly
    expect(createdPoll.title).toBe(updatePollData.title);
    expect(createdPoll.description).toBe(updatePollData.description);
    expect(createdPoll.is_multiple_choice).toBe(updatePollData.isMultipleChoice);
    expect(createdPoll.is_anonymous).toBe(updatePollData.isAnonymous);
  });

  it('should correctly handle updating poll options', async () => {
    // First create a poll with initial options
    const createPollData: PollFormData = {
      title: 'Poll with Options',
      description: 'Testing option management',
      options: ['First Option', 'Second Option'],
      isMultipleChoice: false,
      isAnonymous: false,
    };

    await createPoll(createPollData);
    
    // Then update the poll with modified options (remove one, add one)
    const updatePollData: PollFormData = {
      title: 'Poll with Updated Options',
      description: 'Testing option management',
      options: ['Second Option', 'Third Option'], // Removed 'First Option', added 'Third Option'
      isMultipleChoice: false,
      isAnonymous: false,
    };

    await updatePoll(pollId, updatePollData);
    
    // Get the current supabase mock
    const supabase = createServerClient();
    const mockFrom = supabase.from as any;
    const { data: optionsAfterUpdate } = await mockFrom('poll_options').select().eq('poll_id', pollId);
    expect(optionsAfterUpdate).toBeDefined();
    const opts = optionsAfterUpdate as Array<{ option_text: string }>;
    
    // Verify the options were correctly modified
    expect(opts.length).toBe(2);
    expect(opts.some(opt => opt.option_text === 'Second Option')).toBe(true);
    expect(opts.some(opt => opt.option_text === 'Third Option')).toBe(true);
    expect(opts.some(opt => opt.option_text === 'First Option')).toBe(false);
  });
});
