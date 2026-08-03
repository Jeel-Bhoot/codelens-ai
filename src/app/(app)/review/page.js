import { ReviewWorkspace } from '@/components/review/review-workspace';

export const metadata = {
  title: 'Review workspace',
  description:
    'Paste or upload frontend code and stream a full review across performance, accessibility, security and React correctness.',
};

export default function ReviewPage() {
  return <ReviewWorkspace />;
}
