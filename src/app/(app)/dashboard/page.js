import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata = {
  title: 'Dashboard',
  description: 'Your code quality trend, findings breakdown and recent reviews.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
