"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface DropOffPassengerButtonProps {
  bookingId: string;
  passengerName: string;
}

export default function DropOffPassengerButton({
  bookingId,
  passengerName,
}: DropOffPassengerButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDropOff = async () => {
    if (!confirm(`Confirm drop-off for ${passengerName}? This will end the ride for this passenger.`)) {
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DROP_OFF" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to drop off passenger");
      }

      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Drop-off failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleDropOff}
        disabled={loading}
        className="h-6 px-2 text-[10px] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-medium"
      >
        <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
        {loading ? "Ending..." : "Drop Off"}
      </Button>
      {error && <span className="text-[9px] text-destructive">{error}</span>}
    </div>
  );
}
