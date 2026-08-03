import { HistoryView } from '@/components/history/history-view';

export const metadata = {
  title: 'Review history',
  description: 'Every review you have run, with scores, findings and exports.',
};

export default function HistoryPage() {
  return <HistoryView />;
}
