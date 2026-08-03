import { ReviewDetail } from '@/components/history/review-detail';

export const metadata = {
  title: 'Review detail',
  description: 'A saved review, with every finding and the source it was run against.',
};

export default function ReviewDetailPage() {
  return <ReviewDetail />;
}
