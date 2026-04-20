'use client';

import { create } from 'zustand';

export const useOfflineQueue = create((set, get) => ({
  queue: [],
  
  // Add to queue with priority
  enqueue: (action, payload, priority = 'medium') => {
    set((state) => ({
      queue: [...state.queue, {
        id: crypto.randomUUID(),
        action,
        payload,
        priority, // 'high', 'medium', 'low'
        retries: 0,
        nextRetryAt: Date.now(),
        timestamp: Date.now()
      }].sort((a, b) => {
        const pLevels = { high: 3, medium: 2, low: 1 };
        return pLevels[b.priority] - pLevels[a.priority] || a.timestamp - b.timestamp;
      })
    }));
  },

  // Remove processed item
  dequeue: (id) => {
    set((state) => ({
      queue: state.queue.filter(item => item.id !== id)
    }));
  },

  // Update retry limits (exponential backoff wrapper logic fits here)
  markRetry: (id, failCount, nextTime) => {
    set((state) => ({
      queue: state.queue.map(item => 
        item.id === id ? { ...item, retries: failCount, nextRetryAt: nextTime } : item
      )
    }));
  }
}));

// Process offline queue worker
export const processOfflineQueue = async (isOnline) => {
  if (!isOnline) return;
  const { queue, dequeue, markRetry } = useOfflineQueue.getState();
  
  const now = Date.now();
  const pending = queue.filter(item => item.nextRetryAt <= now);
  
  for (const item of pending) {
    try {
      console.log(`[OfflineSync] Syncing ${item.action}...`);
      // Simulating API sync using fetch dynamically
      const res = await fetch(item.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload)
      });
      
      if (res.ok) {
        dequeue(item.id);
      } else {
        throw new Error("Sync failed");
      }
    } catch (err) {
      console.log(`[OfflineSync] Failed, applying backoff`);
      // Exponential backoff logic
      const nextTime = Date.now() + (Math.pow(2, item.retries) * 1000); // 1s, 2s, 4s...
      markRetry(item.id, item.retries + 1, nextTime);
    }
  }
};
