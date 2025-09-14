import { browserSupabase } from '@/lib/supabase/browser';
import { castVoteClient, getPollResultsClient } from '@/lib/services/poll-client';
import { UnauthorizedError } from '@/lib/types';

jest.mock('@/lib/supabase/browser', () => ({
  browserSupabase: {
    getClient: jest.fn(),
  },
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

(browserSupabase.getClient as jest.Mock).mockReturnValue(mockSupabase);

describe('Poll Client Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('castVoteClient', () => {
    it('should cast a vote successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      mockSupabase.select.mockResolvedValue({ data: [], error: null });
      mockSupabase.insert.mockResolvedValue({ error: null });

      const result = await castVoteClient('poll-1', ['option-1']);

      expect(result.data).toEqual({ success: true });
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('votes');
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        { poll_id: 'poll-1', option_id: 'option-1', voter_id: 'user-123' },
      ]);
    });

    it('should return an error if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });

      const result = await castVoteClient('poll-1', ['option-1']);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(UnauthorizedError);
    });

    it('should return an error if user has already voted', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
        mockSupabase.select.mockResolvedValue({ data: [{ id: 'vote-1' }], error: null });
  
        const result = await castVoteClient('poll-1', ['option-1']);
  
        expect(result.data).toBeNull();
        expect(result.error?.message).toBe('You have already voted on this poll');
      });
  });

  describe('getPollResultsClient', () => {
    it('should fetch poll results successfully', async () => {
        const mockPollData = {
            id: 'poll-1',
            poll_options: [
              { id: 'option-1', option_text: 'Option 1', votes: [{ count: 10 }] },
              { id: 'option-2', option_text: 'Option 2', votes: [{ count: 5 }] },
            ],
          };
      mockSupabase.single.mockResolvedValue({ data: mockPollData, error: null });

      const result = await getPollResultsClient('poll-1');

      expect(result.data).toEqual({
        pollId: 'poll-1',
        options: [
          { id: 'option-1', option_text: 'Option 1', count: 10 },
          { id: 'option-2', option_text: 'Option 2', count: 5 },
        ],
      });
      expect(result.error).toBeNull();
    });

    it('should return an error if poll is not found', async () => {
        mockSupabase.single.mockResolvedValue({ data: null, error: new Error('Poll not found') });
  
        const result = await getPollResultsClient('poll-1');
  
        expect(result.data).toBeNull();
        expect(result.error?.message).toBe('Poll not found');
      });
  });
});
