import { create } from "zustand";

type UIState = {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
};

// Tracks whether a page-level dialog (add habit, add goal, ...) is open so the
// AppShell can hide the mobile nav overlay while it's up — otherwise the fixed
// bottom nav can visually sit on top of the dialog's action buttons on mobile.
export const useUIStore = create<UIState>((set) => ({
  dialogOpen: false,
  setDialogOpen: (open) => set({ dialogOpen: open }),
}));
