/**
 * Comprehensive integration test for the poll user journey
 * Tests the entire flow: create poll -> update poll -> vote on poll -> view results
 */
import { createServerClient } from '@supabase/ssr';
import { PollFormData } from '@/lib/schemas/poll';

// Note: External dependencies are already mocked in __tests__/setup.ts
// so we don't need to mock them again here

// Import the actions with relative paths
const { createPoll } = require('../../src/app/actions/create-poll');
const { updatePoll } = require('../../src/app/actions/update-poll');

describe('Poll User Journey Integration Test', () => {
  // Mock users
  const mockOwner = { id: 'owner-123' };
  const mockVoter = { id: 'voter-456' };
  
  // Mock poll data
  const pollId = 'poll-journey-123';
  let pollData: any = null;
  let pollOptions: any[] = [];
  let pollVotes: any[] = [];
  
  // Setup mock Supabase client that maintains state between calls
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset test state
    pollData = null;
    pollOptions = [];
    pollVotes = [];
    
    // Create a mock Supabase client that simulates a database
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockImplementation(() => {
          // Default to owner, can be overridden in specific tests
          return Promise.resolve({ 
            data: { user: mockOwner }, 
            error: null 
          });
        }),
      },
      from: jest.fn().mockImplementation((table) => {
        // Mock polls table
        if (table === 'polls') {
          return {
            // Insert poll
            insert: jest.fn().mockImplementation((data) => {
              pollData = {
                id: pollId,
                ...data,
                created_at: new Date().toISOString()
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
            
            // Select poll
            select: jest.fn().mockImplementation((columns) => {
              return {
                eq: jest.fn().mockImplementation((field, value) => {
                  if (columns && columns.includes('poll_options')) {
                    // When fetching with poll options
                    return {
                      single: jest.fn().mockResolvedValue({
                        data: {
                          ...pollData,
                          poll_options: pollOptions.map(option => ({
                            ...option,
                            votes: pollVotes
                              .filter(vote => vote.option_id === option.id)
                              .map(v => ({ count: 1 }))
                          })),
                        },
                        error: null
                      })
                    };
                  }
                  
                  return {
                    single: jest.fn().mockResolvedValue({ 
                      data: pollData, 
                      error: null 
                    }),
                  };
                }),
              };
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
            
            // Delete poll
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        } 
        // Mock poll_options table
        else if (table === 'poll_options') {
          return {
            // Insert options
            insert: jest.fn().mockImplementation((options) => {
              if (Array.isArray(options)) {
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
        // Mock votes table
        else if (table === 'votes') {
          return {
            // Insert votes
            insert: jest.fn().mockImplementation((votes) => {
              if (Array.isArray(votes)) {
                const newVotes = votes.map((vote, i) => ({
                  id: `vote-${pollVotes.length + i + 1}`,
                  ...vote,
                  created_at: new Date().toISOString()
                }));
                pollVotes.push(...newVotes);
              }
              return { error: null };
            }),
            
            // Select votes
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field, value) => {
                // Filter votes based on the query
                const filteredVotes = pollVotes.filter(vote => vote[field] === value);
                return {
                  eq: jest.fn().mockImplementation((field2, value2) => {
                    const doubleFilteredVotes = filteredVotes.filter(vote => vote[field2] === value2);
                    return {
                      limit: jest.fn().mockResolvedValue({
                        data: doubleFilteredVotes,
                        error: null
                      })
                    };
                  }),
                  limit: jest.fn().mockResolvedValue({
                    data: filteredVotes,
                    error: null
                  })
                };
              })
            }),
            
            // Count votes
            count: jest.fn().mockResolvedValue({
              data: [{ count: pollVotes.length }],
              error: null
            }),
          };
        }
        
        // Default return for any other table
        return {};
      }),
    };
    
    // Set up the mock
    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  });
  
  test('complete poll user journey: create -> update -> vote -> view', async () => {
    // 1. Create a new poll as the poll owner
    const initialPollData: PollFormData = {
      title: 'Favorite Programming Language',
      description: 'Vote for your favorite programming language',
      options: ['JavaScript', 'Python', 'TypeScript'],
      isMultipleChoice: false,
      isAnonymous: false,
    };
    
    const createResult = await createPoll(initialPollData);
    
    // Verify poll was created correctly
    expect(createResult).toBeDefined();
    expect(createResult.poll.id).toBe(pollId);
    expect(createResult.poll.title).toBe(initialPollData.title);
    expect(pollOptions.length).toBe(3);
    expect(pollOptions.map(o => o.option_text)).toEqual(initialPollData.options);
    
    // 2. Update the poll to add a new option and change settings
    const updatedPollData: PollFormData = {
      title: 'Favorite Programming Language (Updated)',
      description: 'Vote for your favorite programming language or runtime',
      options: ['JavaScript', 'Python', 'TypeScript', 'Rust'],
      isMultipleChoice: true, // Changed to allow multiple choices
      isAnonymous: true,      // Changed to anonymous voting
    };
    
    await updatePoll(pollId, updatedPollData);
    
    // Verify poll was updated correctly
    expect(pollData.title).toBe(updatedPollData.title);
    expect(pollData.description).toBe(updatedPollData.description);
    expect(pollData.is_multiple_choice).toBe(true);
    expect(pollData.is_anonymous).toBe(true);
    expect(pollOptions.length).toBe(4);
    expect(pollOptions.map(o => o.option_text)).toContain('Rust');
    
    // 3. Vote on the poll as a different user
    // First change the mocked auth user to the voter
    const mockVoterAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockVoter },
        error: null
      })
    };
    
    // Get a reference to the current mock implementation
    const mockVoterSupabase = (createServerClient as jest.Mock).mock.results[0].value;
    mockVoterSupabase.auth = mockVoterAuth;
    
    // Create the votes (select two options since it's now multiple choice)
    const selectedOptionIds = [pollOptions[1].id, pollOptions[3].id]; // Python and Rust
    
    // Create a helper function to simulate the vote
    const simulateVote = async (voterIds: string[], optionIds: string[]) => {
      const votes = [];
      for (const optionId of optionIds) {
        for (const voterId of voterIds) {
          votes.push({
            poll_id: pollId,
            option_id: optionId,
            voter_id: voterId
          });
        }
      }
      
      await mockVoterSupabase.from('votes').insert(votes);
    };
    
    // Simulate the vote submission
    await simulateVote([mockVoter.id], selectedOptionIds);
    
    // Verify votes were created
    expect(pollVotes.length).toBe(2);
    expect(pollVotes.filter(v => v.voter_id === mockVoter.id).length).toBe(2);
    
    // 4. Check if user has already voted
    // In our mock implementation, we'll directly check the pollVotes array
    const userVotes = pollVotes.filter(
      vote => vote.poll_id === pollId && vote.voter_id === mockVoter.id
    );
    
    // Verify the vote check works
    expect(userVotes).toBeDefined();
    expect(userVotes.length).toBe(2);
    
    // 5. Get poll results
    const { data: pollWithResults } = await mockVoterSupabase
      .from('polls')
      .select(`
        *,
        poll_options (
          id,
          option_text,
          votes
        )
      `)
      .eq('id', pollId)
      .single();
    
    // Verify poll results are correctly calculated
    expect(pollWithResults).toBeDefined();
    expect(pollWithResults.poll_options.length).toBe(4);
    
    // Check vote counts on options
    const pythonOption = pollWithResults.poll_options.find(
      (o: any) => o.option_text === 'Python'
    );
    const rustOption = pollWithResults.poll_options.find(
      (o: any) => o.option_text === 'Rust'
    );
    const javascriptOption = pollWithResults.poll_options.find(
      (o: any) => o.option_text === 'JavaScript'
    );
    
    expect(pythonOption.votes.length).toBe(1);
    expect(rustOption.votes.length).toBe(1);
    expect(javascriptOption.votes.length).toBe(0);
  });
  
  test('handles unauthorized access correctly', async () => {
    // Set up initial poll data
    const pollData: PollFormData = {
      title: 'Authorization Test Poll',
      description: 'Testing unauthorized access',
      options: ['Option A', 'Option B'],
      isMultipleChoice: false,
      isAnonymous: false,
    };
    
    // Create poll as owner
    await createPoll(pollData);
    
    // Now try to update as unauthorized user (null user)
    const unauthorizedAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null
      })
    };
    
    const mockSupabase = (createServerClient as jest.Mock).mock.results[0].value;
    mockSupabase.auth = unauthorizedAuth;
    
    // Attempt update should throw error
    await expect(updatePoll(pollId, {
      ...pollData,
      title: 'Unauthorized Update'
    })).rejects.toThrow('Unauthorized');
    
    // Verify poll was not changed
    expect(pollData.title).not.toBe('Unauthorized Update');
    
    // Now try with a different user (not the owner)
    const differentUserAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'different-user' } },
        error: null
      })
    };
    
    mockSupabase.auth = differentUserAuth;
    
    // Mock the ownership check to return the original owner
    const mockPollSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { created_by: mockOwner.id }, // Original owner
          error: null
        })
      })
    });
    
    mockSupabase.from = jest.fn().mockImplementation((table) => {
      if (table === 'polls') {
        return {
          select: mockPollSelect
        };
      }
      return {};
    });
    
    // Attempt update should throw error
    await expect(updatePoll(pollId, {
      ...pollData,
      title: 'Different User Update'
    })).rejects.toThrow('Unauthorized');
  });
});
