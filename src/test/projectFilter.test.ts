import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useForestStore } from '../store/forestStore.js';

describe('Project Selection & Harness Detection', () => {
  beforeEach(() => {
    const now = new Date().toISOString();
    useForestStore.setState({
      projects: [
        { id: 'proj1', name: 'Project Alpha', path: '/path/alpha', createdAt: now, updatedAt: now },
        { id: 'proj2', name: 'Project Beta', path: '/path/beta', createdAt: now, updatedAt: now }
      ],
      selectedProjectIds: ['proj1', 'proj2'],
      isProjectSelectorOpen: false
    });
  });

  it('toggles project selection correctly', () => {
    const store = useForestStore.getState();
    expect(store.selectedProjectIds).toEqual(['proj1', 'proj2']);

    store.toggleProjectSelected('proj1');
    expect(useForestStore.getState().selectedProjectIds).toEqual(['proj2']);

    store.toggleProjectSelected('proj1');
    expect(useForestStore.getState().selectedProjectIds).toEqual(['proj2', 'proj1']);
  });

  it('selects and deselects all projects', () => {
    const store = useForestStore.getState();
    
    store.deselectAllProjects();
    expect(useForestStore.getState().selectedProjectIds).toEqual([]);

    store.selectAllProjects();
    expect(useForestStore.getState().selectedProjectIds).toEqual(['proj1', 'proj2']);
  });

  it('opens and closes project selector modal state', () => {
    const store = useForestStore.getState();
    expect(store.isProjectSelectorOpen).toBe(false);

    store.setProjectSelectorOpen(true);
    expect(useForestStore.getState().isProjectSelectorOpen).toBe(true);

    store.setProjectSelectorOpen(false);
    expect(useForestStore.getState().isProjectSelectorOpen).toBe(false);
  });
});
