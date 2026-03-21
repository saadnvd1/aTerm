import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  isOpen: boolean;
  projectName: string;
  activePtyCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeactivateConfirmDialog({ isOpen, projectName, activePtyCount, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {projectName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This project has <strong>{activePtyCount}</strong> active terminal
            {activePtyCount === 1 ? " session" : " sessions"} running.
            <br /><br />
            Deactivating will <strong>kill all processes</strong> (dev servers, Claude sessions, etc.)
            for this project.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Kill All & Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
