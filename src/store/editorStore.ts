import { create } from 'zustand';

export type TransformMode = 'translate' | 'rotate' | 'scale';

interface EditorState {
  mode: TransformMode;
  snapEnabled: boolean;
  gridVisible: boolean;
  
  setMode: (mode: TransformMode) => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: 'translate',
  snapEnabled: false,
  gridVisible: true,

  setMode: (mode) => set({ mode }),
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
}));
