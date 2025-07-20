/**
 * Popup JavaScript for Prompt Enhancer Extension
 */

class PopupManager {
  constructor() {
    this.settings = {
      enableExtension: true,
      showKeyboardShortcuts: true,
      showNotifications: true
    };
    
    this.stats = {
      totalEnhancements: 0,
      favoriteAction: 'Improve',
      actionCounts: {}
    };
    
    this.init();
  }

  async init() {
    // Load saved settings and stats
    await this.loadSettings();
    await this.loadStats();
    
    // Set up UI
    this.updateUI();
    this.attachEventListeners();
    
    // Update stats display
    this.updateStatsDisplay();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['promptEnhancerSettings']);
      if (result.promptEnhancerSettings) {
        this.settings = { ...this.settings, ...result.promptEnhancerSettings };
      }
    } catch (error) {
      console.log('Settings loaded from defaults due to:', error.message);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ promptEnhancerSettings: this.settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  async loadStats() {
    try {
      const result = await chrome.storage.local.get(['promptEnhancerStats']);
      if (result.promptEnhancerStats) {
        this.stats = { ...this.stats, ...result.promptEnhancerStats };
      }
    } catch (error) {
      console.log('Stats loaded from defaults due to:', error.message);
    }
  }

  async saveStats() {
    try {
      await chrome.storage.local.set({ promptEnhancerStats: this.stats });
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }

  updateUI() {
    // Update checkbox states
    document.getElementById('enableExtension').checked = this.settings.enableExtension;
    document.getElementById('showKeyboardShortcuts').checked = this.settings.showKeyboardShortcuts;
    document.getElementById('showNotifications').checked = this.settings.showNotifications;
  }

  updateStatsDisplay() {
    // Update total enhancements
    document.getElementById('totalEnhancements').textContent = this.stats.totalEnhancements;
    
    // Update favorite action
    document.getElementById('favoriteAction').textContent = this.stats.favoriteAction;
  }

  attachEventListeners() {
    // Setting checkboxes
    document.getElementById('enableExtension').addEventListener('change', (e) => {
      this.settings.enableExtension = e.target.checked;
      this.saveSettings();
      this.updateExtensionState();
    });

    document.getElementById('showKeyboardShortcuts').addEventListener('change', (e) => {
      this.settings.showKeyboardShortcuts = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('showNotifications').addEventListener('change', (e) => {
      this.settings.showNotifications = e.target.checked;
      this.saveSettings();
    });

    // Footer buttons
    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    document.getElementById('exportSettings').addEventListener('click', () => {
      this.exportSettings();
    });

    // Platform items (for future use)
    const platformItems = document.querySelectorAll('.platform-item');
    platformItems.forEach(item => {
      if (!item.classList.contains('coming-soon')) {
        item.addEventListener('click', () => {
          this.selectPlatform(item);
        });
      }
    });

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
  }

  async updateExtensionState() {
    try {
      // Send message to content script to enable/disable
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url.includes('claude.ai')) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'toggleExtension',
          enabled: this.settings.enableExtension
        });
      }
    } catch (error) {
      console.log('Could not communicate with content script:', error.message);
    }
  }

  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      this.settings = {
        enableExtension: true,
        showKeyboardShortcuts: true,
        showNotifications: true
      };
      
      this.updateUI();
      this.saveSettings();
      this.showNotification('Settings reset to default', 'success');
    }
  }

  exportSettings() {
    const exportData = {
      settings: this.settings,
      stats: this.stats,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prompt-enhancer-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    this.showNotification('Settings exported successfully', 'success');
  }

  selectPlatform(item) {
    // Remove active class from all platforms
    document.querySelectorAll('.platform-item').forEach(platform => {
      platform.classList.remove('active');
    });
    
    // Add active class to selected platform
    item.classList.add('active');
    
    // Here you could save the selected platform preference
    const platformName = item.querySelector('.platform-name').textContent;
    this.showNotification(`Selected platform: ${platformName}`, 'info');
  }

  handleKeyboardNavigation(e) {
    // ESC to close popup
    if (e.key === 'Escape') {
      window.close();
    }
    
    // Enter to activate focused element
    if (e.key === 'Enter' && document.activeElement.classList.contains('footer-btn')) {
      document.activeElement.click();
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `popup-notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      z-index: 1000;
      opacity: 0;
      transform: translateX(20px);
      transition: all 0.3s ease;
      max-width: 200px;
    `;
    
    // Set colors based on type
    switch (type) {
      case 'success':
        notification.style.background = '#10b981';
        notification.style.color = 'white';
        break;
      case 'error':
        notification.style.background = '#ef4444';
        notification.style.color = 'white';
        break;
      case 'info':
      default:
        notification.style.background = '#3b82f6';
        notification.style.color = 'white';
        break;
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(20px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Public method to update stats (called from content script)
  async updateStats(action) {
    this.stats.totalEnhancements++;
    
    // Update action counts
    if (!this.stats.actionCounts[action]) {
      this.stats.actionCounts[action] = 0;
    }
    this.stats.actionCounts[action]++;
    
    // Update favorite action
    let maxCount = 0;
    let favoriteAction = 'Improve';
    
    Object.entries(this.stats.actionCounts).forEach(([actionName, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteAction = actionName;
      }
    });
    
    this.stats.favoriteAction = favoriteAction;
    
    // Save and update display
    await this.saveStats();
    this.updateStatsDisplay();
  }
}

// Chrome extension message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStats') {
    popupManager.updateStats(request.actionType);
    sendResponse({ success: true });
  }
});

// Initialize popup when DOM is loaded
let popupManager;

document.addEventListener('DOMContentLoaded', () => {
  popupManager = new PopupManager();
});

// Handle extension icon click analytics
chrome.action.onClicked.addListener(() => {
  // This won't run in popup context, but helps track usage
  console.log('Extension icon clicked');
});

// Check if we're on a supported site
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const supportedSites = ['claude.ai'];
    const isSupported = supportedSites.some(site => tab.url?.includes(site));
    
    if (!isSupported) {
      // Show message about unsupported site
      const platformsSection = document.querySelector('.platforms-grid');
      if (platformsSection) {
        const notice = document.createElement('div');
        notice.className = 'unsupported-notice';
        notice.style.cssText = `
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 8px;
          color: #ef4444;
          font-size: 12px;
          text-align: center;
          margin-bottom: 12px;
        `;
        notice.textContent = 'Extension only works on supported AI platforms';
        platformsSection.parentNode.insertBefore(notice, platformsSection);
      }
    }
  } catch (error) {
    console.log('Could not check current tab:', error.message);
  }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PopupManager;
} 