import { SettingsView } from '@/components/settings/settings-view';

export const metadata = {
  title: 'Settings',
  description: 'Configure the review engine, editor preferences and your API key.',
};

export default function SettingsPage() {
  return <SettingsView />;
}
