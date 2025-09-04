// Import the function we're testing
import { updatePoll } from '@/app/actions/update-poll';
import { PollFormData } from '@/lib/schemas/poll';
import { createServerClient } from '@supabase/ssr';

describe('updatePoll', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if user is not authenticated', async () => {
    // Setup mocks to simulate unauthenticated user
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
    
    const pollData: PollFormData = {
      title: 'Updated Poll',
      description: 'Updated Description',
      options: ['Option 1', 'Option 2'],
      isMultipleChoice: false,
      isAnonymous: false,
    };

    await expect(updatePoll('poll-123', pollData)).rejects.toThrow('Unauthorized');
  });

  it('should throw an error if user is not the poll owner', async () => {
    // Mock user authentication
    const mockUser = { id: 'user-123' };
    
    // Set up the mock Supabase client
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'polls') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: { created_by: 'different-user-id' }, 
                  error: null 
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
    
    const pollData: PollFormData = {
      title: 'Updated Poll',
      description: 'Updated Description',
      options: ['Option 1', 'Option 2'],
      isMultipleChoice: false,
      isAnonymous: false,
    };

    await expect(updatePoll('poll-123', pollData)).rejects.toThrow('Unauthorized');
  });

  it('should update poll successfully', async () => {
    // Mock user authentication and poll data
    const mockUser = { id: 'user-123' };
    const pollId = 'poll-123';
    
    // Set up mock options
    const existingOptions = [
      { id: 'option-1', option_text: 'Option 1' },
      { id: 'option-2', option_text: 'Option 2' },
      { id: 'option-to-remove', option_text: 'Option to Remove' },
    ];
    
    // Create mocks for each specific operation
    const mockPollSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user-123' },
          error: null
        }),
      }),
    });
    
    const mockPollUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    
    const mockOptionsSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: existingOptions,
        error: null
      }),
    });
    
    const mockOptionsDelete = jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ error: null }),
    });
    
    const mockOptionsInsert = jest.fn().mockResolvedValue({ error: null });
    
    // Track which table/operation is being requested to return appropriate mock
    let pollsCallCount = 0;
    let optionsCallCount = 0;
    
    // Create a Supabase mock with specific implementations for each function
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'polls') {
          pollsCallCount++;
          if (pollsCallCount === 1) {
            // First call checks ownership
            return { select: mockPollSelect };
          } else {
            // Second call updates poll
            return { update: mockPollUpdate };
          }
        } 
        else if (table === 'poll_options') {
          optionsCallCount++;
          if (optionsCallCount === 1) {
            // First call gets existing options
            return { select: mockOptionsSelect };
          } else if (optionsCallCount === 2) {
            // Second call deletes removed options
            return { delete: mockOptionsDelete };
          } else {
            // Third call inserts new options
            return { insert: mockOptionsInsert };
          }
        }
        return {};
      }),
    };
    
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
    
    const pollData: PollFormData = {
      title: 'Updated Poll',
      description: 'Updated Description',
      options: ['Option 1', 'Option 2', 'New Option'], // Removed "Option to Remove", added "New Option"
      isMultipleChoice: true,
      isAnonymous: true,
    };

    await updatePoll(pollId, pollData);
    
    // Verify poll ownership was checked
    expect(mockPollSelect).toHaveBeenCalled();
    expect(mockPollSelect().eq).toHaveBeenCalledWith('id', pollId);
    
    // Verify poll was updated with correct data
    expect(mockPollUpdate).toHaveBeenCalledWith({
      title: pollData.title,
      description: pollData.description,
      is_multiple_choice: pollData.isMultipleChoice,
      is_anonymous: pollData.isAnonymous,
      expires_at: undefined,
    });
    expect(mockPollUpdate().eq).toHaveBeenCalledWith('id', pollId);
    
    // Verify options were managed correctly
    expect(mockOptionsSelect).toHaveBeenCalled();
    expect(mockOptionsDelete).toHaveBeenCalled();
    expect(mockOptionsInsert).toHaveBeenCalledWith([
      { poll_id: pollId, option_text: 'New Option' }
    ]);
  });
  
  it('should throw an error if poll update fails', async () => {
    // Mock user authentication
    const mockUser = { id: 'user-123' };
    const pollId = 'poll-123';
    
    // Create mock for poll ownership check
    const mockPollSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { created_by: 'user-123' },
          error: null
        }),
      }),
    });
    
    // Create mock for poll update with error
    const mockUpdateError = new Error('Failed to update poll');
    const mockPollUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: mockUpdateError }),
    });
    
    // Create Supabase mock client with error on update
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'polls') {
          return mockSupabase.from.mock.calls.length === 1
            ? { select: mockPollSelect }
            : { update: mockPollUpdate };
        }
        return {};
      }),
    };
    
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
    
    const pollData: PollFormData = {
      title: 'Updated Poll',
      description: 'Updated Description',
      options: ['Option 1', 'Option 2'],
      isMultipleChoice: true,
      isAnonymous: true,
    };

    // Assert that the function throws the error
    await expect(updatePoll(pollId, pollData)).rejects.toThrow();
  });
});
