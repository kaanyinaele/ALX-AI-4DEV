import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/polls');
  
  // This return is a fallback and won't be rendered due to the redirect above
  return null;
}
