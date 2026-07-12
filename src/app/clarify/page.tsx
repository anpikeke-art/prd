import { getAuthSession } from '@/auth';
import { redirect } from 'next/navigation';
import { PrdWizard } from '@/components/prd-wizard';

export default async function ClarifyPage() {
  const session = await getAuthSession();
  if (!session) redirect('/login');
  return <PrdWizard session={session} />;
}
