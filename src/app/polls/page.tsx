import { Button } from '@/components/ui/button';
import { Poll } from '@/components/poll';
import { serverSupabase } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function PollsPage() {
  const supabase = serverSupabase.getClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Fetch polls with options and votes count
  const { data: polls, error: pollsError } = await supabase
    .from('polls')
    .select(`
      *,
      poll_options (count),
      votes (count)
    `)
    .order('created_at', { ascending: false });

  if (pollsError) {
    console.error('Error fetching polls:', pollsError);
    return <div>Error loading polls</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Polls</h1>
        <Button asChild>
          <Link href="/polls/create">Create Poll</Link>
        </Button>
      </div>
      
      {polls?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No polls found</p>
          <Button asChild>
            <Link href="/polls/create">Create your first poll</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {polls?.map((poll) => (
            <Poll
              key={poll.id}
              id={poll.id}
              title={poll.title}
              description={poll.description}
              createdAt={poll.created_at}
              isOwner={poll.created_by === user.id}
              optionsCount={poll.poll_options?.[0]?.count ?? 0}
              votesCount={poll.votes?.[0]?.count ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
