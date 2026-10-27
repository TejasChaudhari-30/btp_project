import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full bg-card p-8 rounded-2xl border shadow-sm space-y-5">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-3xl">
          🚗
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ride or Page Not Found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The ride you are looking for may have been completed, cancelled, or the link is invalid.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild variant="default">
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
