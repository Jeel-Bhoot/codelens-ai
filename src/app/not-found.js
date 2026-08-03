import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
          <FileQuestion className="h-7 w-7" aria-hidden="true" />
        </span>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          That route doesn&rsquo;t exist. It may have moved, or the link may be out of date.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/">
              <ArrowLeft />
              Back home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/review">Open the workspace</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
