import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAppStore } from "@/lib/store";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function SOS() {
  const { sendSOS, contacts } = useAppStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-5 z-30">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <button className="h-12 w-12 rounded-full bg-red-600 text-white shadow-elevated ring-4 ring-red-500/30">
            <ShieldAlert className="mx-auto h-6 w-6" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send SOS?</AlertDialogTitle>
            <AlertDialogDescription>
              This will notify your {contacts.length} emergency contact(s) with your current details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const n = sendSOS();
              toast.success(`SOS sent to ${n} contact(s)`);
              setOpen(false);
            }}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
