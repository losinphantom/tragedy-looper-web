import { create } from 'zustand';

type BoardUiStore = {
  selectedHandCard: number | null;
  previewCardId: string | null;
  leaderModeDialogOpen: boolean;
  acknowledgedLeaderStepKey: string | null;
  setSelectedHandCard: (idx: number | null) => void;
  setPreviewCardId: (cardId: string | null) => void;
  setLeaderModeDialogOpen: (open: boolean) => void;
  setAcknowledgedLeaderStepKey: (stepKey: string | null) => void;
  syncLeaderModeStep: (stepKey: string | null) => void;
  acknowledgeLeaderStep: (stepKey: string | null) => void;
  clearTransientCardUi: () => void;
};

export const useBoardUiStore = create<BoardUiStore>((set) => ({
  selectedHandCard: null,
  previewCardId: null,
  leaderModeDialogOpen: false,
  acknowledgedLeaderStepKey: null,
  setSelectedHandCard: (selectedHandCard) => set({ selectedHandCard }),
  setPreviewCardId: (previewCardId) => set({ previewCardId }),
  setLeaderModeDialogOpen: (leaderModeDialogOpen) => set({ leaderModeDialogOpen }),
  setAcknowledgedLeaderStepKey: (acknowledgedLeaderStepKey) => set({ acknowledgedLeaderStepKey }),
  syncLeaderModeStep: (stepKey) => set((state) => {
    if (!stepKey) {
      return { leaderModeDialogOpen: false };
    }
    if (state.acknowledgedLeaderStepKey === stepKey) {
      return { leaderModeDialogOpen: false };
    }
    return { leaderModeDialogOpen: true };
  }),
  acknowledgeLeaderStep: (stepKey) => set({
    acknowledgedLeaderStepKey: stepKey,
    leaderModeDialogOpen: false,
  }),
  clearTransientCardUi: () => set({
    selectedHandCard: null,
    previewCardId: null,
  }),
}));
