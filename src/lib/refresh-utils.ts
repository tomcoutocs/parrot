// Simple global refresh utility
type RefreshCallback = () => void

class RefreshManager {
  private callbacks: RefreshCallback[] = []

  subscribe(callback: RefreshCallback) {
    this.callbacks.push(callback)
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  trigger() {
    console.log('🔄 RefreshManager: Triggering refresh for', this.callbacks.length, 'subscribers')
    this.callbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in refresh callback:', error)
      }
    })
  }
}

// Global instance
export const refreshManager = new RefreshManager()

// Convenience function
export const triggerGlobalRefresh = () => {
  refreshManager.trigger()
}
