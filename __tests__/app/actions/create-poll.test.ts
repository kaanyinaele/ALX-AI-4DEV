// Import the function we're testing
import { createPoll } from '@/app/actions/create-poll';
import { PollFormData } from '@/lib/schemas/poll';
import { createServerClient } from '@supabase/ssr';

describe('createPoll', () => {
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
      title: 'Test Poll',
      description: 'Test Description',
      options: ['Option 1', 'Option 2'],
      isMultipleChoice: false,
      isAnonymous: false,
    };

    await expect(createPoll(pollData)).rejects.toThrow('Unauthorized');
  });

  it('should create a poll successfully', async () => {
    // Mock user authentication
    const mockUser = { id: 'user-123' };
    
    // Mock poll creation
    const mockPoll = { id: 'poll-123', title: 'Test Poll' };
    
    // Create a mock for the poll insert function with all needed methods
    const mockPollInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockPoll, error: null }),
      }),
    });
    
    // Create a mock for the options insert function
    const mockOptionsInsert = jest.fn().mockResolvedValue({ error: null });
    
    // Create a Supabase mock client
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockImplementation((table) => {
        if (table === 'polls') {
          return { insert: mockPollInsert };
        } else if (table === 'poll_options') {
          return { insert: mockOptionsInsert };
        }
        return {};
      }),
    };
    
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
    
    const pollData: PollFormData = {
      title: 'Test Poll',
      description: 'Test Description',
      options: ['Option 1', 'Option 2'],
      isMultipleChoice: false,
      isAnonymous: false,
    };

    const result = await createPoll(pollData);
    expect(result).toEqual({ poll: mockPoll });
    
    // Verify auth was checked
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    
    // Verify poll was created with correct data
    expect(mockPollInsert).toHaveBeenCalledWith({
      title: pollData.title,
      description: pollData.description,
      created_by: mockUser.id,
      is_multiple_choice: pollData.isMultipleChoice,
      is_anonymous: pollData.isAnonymous,
      expires_at: undefined,
    });
    
    // Verify options were created with correct data
    expect(mockOptionsInsert).toHaveBeenCalledWith([
      { poll_id: mockPoll.id, option_text: 'Option 1' },
      { poll_id: mockPoll.id, option_text: 'Option 2' },
    ]);
  });
  
  it('should throw an error if poll creation fails', async () => {
    // Mock user authentication
    const mockUser = { id: 'user-123' };
    
    // Mock poll creation with error
    const mockPollError = new Error('Failed to create poll');
    const mockPollInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: mockPollError }),
      }),
    });
    
    // Create a Supabase mock client with the error
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockReturnValue({ insert: mockPollInsert }),
    };
    
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
    
    const pollData: PollFormData = {
      title: 'Test Poll',
      description: 'Test Description',
      options: ['Option 1', 'Option 2'],
      isMultipleChoice: false,
      isAnonymous: false,
    };

    // Assert that the function throws the error
    await expect(createPoll(pollData)).rejects.toThrow();
    
    // Verify that insert was called
    expect(mockPollInsert).toHaveBeenCalled();
  });
});
