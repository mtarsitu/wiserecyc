import { create } from 'zustand'

interface DialogState {
  isOpen: boolean
  editId: string | null
}

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Search/Filter states per entity
  searchQueries: Record<string, string>
  setSearchQuery: (entity: string, query: string) => void
  getSearchQuery: (entity: string) => string

  // Dialogs per entity
  dialogs: Record<string, DialogState>
  openDialog: (entity: string, editId?: string | null) => void
  closeDialog: (entity: string) => void
  getDialog: (entity: string) => DialogState

  // Delete confirmations
  deleteConfirm: Record<string, string | null>
  setDeleteConfirm: (entity: string, id: string | null) => void
  getDeleteConfirm: (entity: string) => string | null
}

const defaultDialogState: DialogState = { isOpen: false, editId: null }

export const useUIStore = create<UIState>()((set, get) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Search
  searchQueries: {},
  setSearchQuery: (entity, query) =>
    set((s) => ({
      searchQueries: { ...s.searchQueries, [entity]: query },
    })),
  getSearchQuery: (entity) => get().searchQueries[entity] || '',

  // Dialogs
  dialogs: {},
  openDialog: (entity, editId = null) =>
    set((s) => ({
      dialogs: { ...s.dialogs, [entity]: { isOpen: true, editId } },
    })),
  closeDialog: (entity) =>
    set((s) => ({
      dialogs: { ...s.dialogs, [entity]: defaultDialogState },
    })),
  getDialog: (entity) => get().dialogs[entity] || defaultDialogState,

  // Delete confirm
  deleteConfirm: {},
  setDeleteConfirm: (entity, id) =>
    set((s) => ({
      deleteConfirm: { ...s.deleteConfirm, [entity]: id },
    })),
  getDeleteConfirm: (entity) => get().deleteConfirm[entity] || null,
}))
