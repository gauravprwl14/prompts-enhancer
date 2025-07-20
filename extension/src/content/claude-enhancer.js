/**
 * Claude Prompt Enhancer - Content Script
 * Injects prompt enhancement tools into Claude.ai interface
 */

class ClaudePromptEnhancer {
  constructor() {
    this.isInitialized = false;
    this.enhancerVisible = false;
    this.currentQuery = '';
    this.searchResults = [];
    this.selectedTemplate = null;
    this.debounceTimer = null;
    this.selectors = {
      inputContainer: '[data-testid="input-menu-plus"]',
      chatInputContainer: '.relative.flex-1.flex.items-center.gap-2.shrink.min-w-0',
      proseMirror: '.ProseMirror',
      sendButton: '[aria-label="Send message"]'
    };
    
    this.apiConfig = {
      baseUrl: 'http://localhost:8000',
      topK: 5,
      useReranking: true,
      relevanceThreshold: 0.3,
      initialCandidates: 20
    };
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEnhancer());
    } else {
      this.setupEnhancer();
    }
  }

  setupEnhancer() {
    // Use MutationObserver to handle dynamic content
    const observer = new MutationObserver((mutations) => {
      if (!this.isInitialized) {
        this.injectEnhancerButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Try immediate injection
    setTimeout(() => this.injectEnhancerButton(), 1000);
  }

  injectEnhancerButton() {
    const container = document.querySelector(this.selectors.chatInputContainer);
    
    if (!container || document.getElementById('prompt-enhancer-toggle')) {
      return;
    }

    const enhancerButton = this.createEnhancerButton();
    const enhancerPanel = this.createEnhancerPanel();
    
    // Insert button after the existing buttons
    container.appendChild(enhancerButton);
    
    // Insert panel into the main container
    const mainContainer = container.closest('.flex.flex-col');
    if (mainContainer) {
      mainContainer.appendChild(enhancerPanel);
    }

    this.isInitialized = true;
    this.attachEventListeners();
    
    // Initialize dragging after panel is added to DOM
    setTimeout(() => this.initDragging(), 100);
  }

  createEnhancerButton() {
    const button = document.createElement('button');
    button.id = 'prompt-enhancer-toggle';
    button.className = `
      inline-flex items-center justify-center relative shrink-0 can-focus select-none
      disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none
      border-0.5 transition-all h-8 min-w-8 rounded-lg flex items-center px-[7.5px] group
      !pointer-events-auto !outline-offset-1 text-text-300 border-border-300
      active:scale-[0.98] hover:text-text-200/90 hover:bg-bg-100
      prompt-enhancer-button
    `.replace(/\s+/g, ' ').trim();
    
    button.type = 'button';
    button.setAttribute('aria-label', 'Open prompt enhancer');
    button.setAttribute('title', 'Enhance your prompts');
    
    button.innerHTML = `
      <div class="flex flex-row items-center justify-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM172,128a12,12,0,0,1-12,12H96a12,12,0,0,1,0-24h64A12,12,0,0,1,172,128Zm0-32a12,12,0,0,1-12,12H96a12,12,0,0,1,0-24h64A12,12,0,0,1,172,96Zm0,64a12,12,0,0,1-12,12H96a12,12,0,0,1,0-24h64A12,12,0,0,1,172,160Z"/>
        </svg>
      </div>
    `;
    
    return button;
  }

  createEnhancerPanel() {
    const panel = document.createElement('div');
    panel.id = 'prompt-enhancer-panel';
    panel.className = 'prompt-enhancer-panel hidden';
    
    panel.innerHTML = `
      <div class="enhancer-content">
        <div class="enhancer-header" id="enhancer-drag-handle">
          <h3>Prompt Search</h3>
          <div class="enhancer-controls">
            <button class="minimize-btn" title="Minimize">−</button>
            <button class="close-btn" title="Close">×</button>
          </div>
        </div>
        
        <div class="enhancer-body">
          <div class="search-section">
            <div class="search-input-group">
              <input 
                type="text" 
                id="prompt-search-input" 
                placeholder="Search for prompt templates..."
                class="search-input"
              />
              <div class="search-status" id="search-status"></div>
            </div>
          </div>
          
          <div class="suggestions-section" id="suggestions-section">
            <div class="suggestions-container" id="suggestions-container">
              <!-- Search results will be populated here -->
            </div>
          </div>
          
          <div class="variables-section hidden" id="variables-section">
            <div class="variables-header">
              <h4 id="selected-template-title">Template Variables</h4>
              <button class="back-btn" id="back-to-search">← Back to Search</button>
            </div>
            <div class="variables-form" id="variables-form">
              <!-- Variable inputs will be populated here -->
            </div>
            <div class="variables-actions">
              <button class="apply-template-btn" id="apply-template">Apply Template</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return panel;
  }

  initDragging() {
    const panel = document.getElementById('prompt-enhancer-panel');
    const dragHandle = document.getElementById('enhancer-drag-handle');
    
    if (!panel || !dragHandle) return;
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    const startDrag = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(panel.style.left) || 0;
      startTop = parseInt(panel.style.top) || 0;
      
      panel.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      
      e.preventDefault();
    };
    
    const drag = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelRect = panel.getBoundingClientRect();
      
      // Constrain to viewport bounds
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelRect.width));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - panelRect.height));
      
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    };
    
    const stopDrag = () => {
      if (!isDragging) return;
      
      isDragging = false;
      panel.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Check if panel is out of bounds and reposition if needed
      this.checkAndRepositionPanel();
    };
    
    dragHandle.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    // Prevent text selection while dragging
    dragHandle.addEventListener('selectstart', (e) => e.preventDefault());
  }

  setRandomUpperLeftPosition() {
    const panel = document.getElementById('prompt-enhancer-panel');
    if (!panel) return;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get panel dimensions
    const panelRect = panel.getBoundingClientRect();
    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;
    
    // Define upper left corner area (top 30% of screen, left 30% of screen)
    const maxLeft = Math.min(viewportWidth * 0.3, viewportWidth - panelWidth - 20);
    const maxTop = Math.min(viewportHeight * 0.3, viewportHeight - panelHeight - 20);
    
    // Generate random position within upper left area
    const randomLeft = Math.floor(Math.random() * Math.max(20, maxLeft - 20)) + 20;
    const randomTop = Math.floor(Math.random() * Math.max(20, maxTop - 20)) + 20;
    
    // Set the position
    panel.style.left = randomLeft + 'px';
    panel.style.top = randomTop + 'px';
  }

  checkAndRepositionPanel() {
    const panel = document.getElementById('prompt-enhancer-panel');
    if (!panel) return;
    
    const panelRect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let needsReposition = false;
    let newLeft = parseInt(panel.style.left) || 0;
    let newTop = parseInt(panel.style.top) || 0;
    
    // Check if panel is outside viewport
    if (panelRect.right > viewportWidth) {
      newLeft = viewportWidth - panelRect.width - 20;
      needsReposition = true;
    }
    
    if (panelRect.left < 0) {
      newLeft = 20;
      needsReposition = true;
    }
    
    if (panelRect.bottom > viewportHeight) {
      newTop = viewportHeight - panelRect.height - 20;
      needsReposition = true;
    }
    
    if (panelRect.top < 0) {
      newTop = 20;
      needsReposition = true;
    }
    
    // If panel is completely out of view, move to bottom
    if (panelRect.top > viewportHeight || panelRect.bottom < 0) {
      newTop = viewportHeight - panelRect.height - 20;
      needsReposition = true;
    }
    
    if (needsReposition) {
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    }
  }

  attachEventListeners() {
    // Toggle button listener
    const toggleBtn = document.getElementById('prompt-enhancer-toggle');
    toggleBtn?.addEventListener('click', () => this.toggleEnhancer());

    // Panel control listeners
    const closeBtn = document.querySelector('#prompt-enhancer-panel .close-btn');
    const minimizeBtn = document.querySelector('#prompt-enhancer-panel .minimize-btn');
    
    closeBtn?.addEventListener('click', () => this.hideEnhancer());
    minimizeBtn?.addEventListener('click', () => this.minimizeEnhancer());

    // Search input listener with debouncing
    const searchInput = document.getElementById('prompt-search-input');
    searchInput?.addEventListener('input', (e) => this.handleSearchInput(e.target.value));



    // Back to search listener
    const backBtn = document.getElementById('back-to-search');
    backBtn?.addEventListener('click', () => this.showSearchSection());

    // Apply template listener
    const applyBtn = document.getElementById('apply-template');
    applyBtn?.addEventListener('click', () => this.applyTemplate());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  toggleEnhancer() {
    const panel = document.getElementById('prompt-enhancer-panel');
    if (panel) {
      this.enhancerVisible = !this.enhancerVisible;
      panel.classList.toggle('hidden', !this.enhancerVisible);
      panel.classList.toggle('visible', this.enhancerVisible);
      
      // Set random position in upper left corner when opening
      if (this.enhancerVisible && !panel.style.left) {
        this.setRandomUpperLeftPosition();
      }
    }
  }

  hideEnhancer() {
    const panel = document.getElementById('prompt-enhancer-panel');
    if (panel) {
      this.enhancerVisible = false;
      panel.classList.add('hidden');
      panel.classList.remove('visible');
    }
  }

  minimizeEnhancer() {
    const panel = document.getElementById('prompt-enhancer-panel');
    if (panel) {
      panel.classList.toggle('minimized');
    }
  }

  getCurrentPromptText() {
    const proseMirror = document.querySelector(this.selectors.proseMirror);
    return proseMirror?.textContent?.trim() || '';
  }

  setPromptText(text) {
    const proseMirror = document.querySelector(this.selectors.proseMirror);
    if (proseMirror) {
      // Clear existing content
      proseMirror.innerHTML = '';
      
      // Split text by lines and create proper paragraph structure
      const lines = text.split('\n');
      
      lines.forEach((line, index) => {
        if (line.trim() === '') {
          // Empty line - create empty paragraph for spacing
          const emptyP = document.createElement('p');
          emptyP.innerHTML = '<br>';
          proseMirror.appendChild(emptyP);
        } else {
          // Non-empty line - create paragraph with content
          const p = document.createElement('p');
          p.textContent = line;
          proseMirror.appendChild(p);
        }
      });
      
      // If no content was added, add a single empty paragraph
      if (proseMirror.children.length === 0) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        proseMirror.appendChild(p);
      }
      
      // Trigger input event to update Claude's state
      proseMirror.dispatchEvent(new Event('input', { bubbles: true }));
      proseMirror.focus();
      
      // Place cursor at the end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(proseMirror);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  handleSearchInput(query) {
    this.currentQuery = query.trim();
    
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Show loading state if query exists
    if (this.currentQuery) {
      this.showSearchStatus('Searching...', 'loading');
    } else {
      this.clearSuggestions();
      this.showSearchStatus('', '');
      return;
    }

    // Debounce the API call
    this.debounceTimer = setTimeout(() => {
      this.searchPrompts(this.currentQuery);
    }, 300);
  }

  async searchPrompts(query) {
    try {
      const params = new URLSearchParams({
        query: query,
        top_k: this.apiConfig.topK,
        use_reranking: this.apiConfig.useReranking,
        relevance_threshold: this.apiConfig.relevanceThreshold,
        initial_candidates: this.apiConfig.initialCandidates
      });

      const response = await fetch(`${this.apiConfig.baseUrl}/api/prompts/search/?${params}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      this.displaySearchResults(results);
      
      if (results.length === 0) {
        this.showSearchStatus('No templates found', 'empty');
      } else {
        this.showSearchStatus(`Found ${results.length} template${results.length > 1 ? 's' : ''}`, 'success');
      }
    } catch (error) {
      console.error('Search API error:', error);
      this.showSearchStatus('Search failed - check connection', 'error');
    }
  }

  displaySearchResults(results) {
    const container = document.getElementById('suggestions-container');
    if (!container) return;

    container.innerHTML = '';
    this.searchResults = results;

    results.forEach((result, index) => {
      const tile = document.createElement('div');
      tile.className = 'suggestion-tile';
      tile.dataset.index = index;
      
      tile.innerHTML = `
        <div class="chip-content">
          <div class="chip-title">${this.escapeHtml(result.title)}</div>
          <div class="chip-description">${this.escapeHtml(result.description)}</div>
          <div class="chip-score">${(result.relevance_score * 100).toFixed(0)}%</div>
        </div>
      `;

      tile.addEventListener('click', () => this.selectTemplate(result.id, index));
      container.appendChild(tile);
    });
  }

  async selectTemplate(templateId, index) {
    try {
      this.showSearchStatus('Loading template...', 'loading');
      
      const response = await fetch(`${this.apiConfig.baseUrl}/api/prompts/${templateId}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const template = await response.json();
      this.selectedTemplate = template;
      this.showVariablesSection(template);
      
    } catch (error) {
      console.error('Template API error:', error);
      this.showSearchStatus('Failed to load template', 'error');
    }
  }

  showVariablesSection(template) {
    // Hide search section
    const searchSection = document.getElementById('suggestions-section');
    searchSection?.classList.add('hidden');
    
    // Show variables section
    const variablesSection = document.getElementById('variables-section');
    variablesSection?.classList.remove('hidden');
    
    // Update title
    const titleElement = document.getElementById('selected-template-title');
    if (titleElement) titleElement.textContent = template.title;
    
    // Generate form
    this.generateVariablesForm(template.variables);
  }

  generateVariablesForm(variables) {
    const form = document.getElementById('variables-form');
    if (!form) return;

    form.innerHTML = '';

    variables.forEach(variable => {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'variable-field';
      
      const label = document.createElement('label');
      label.textContent = variable.description;
      if (variable.required) label.classList.add('required');
      
      let input;
      
      if (variable.type === 'selection' && variable.options) {
        input = document.createElement('select');
        input.innerHTML = '<option value="">Select an option...</option>';
        variable.options.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option;
          optionElement.textContent = option;
          if (option === variable.default_value) {
            optionElement.selected = true;
          }
          input.appendChild(optionElement);
        });
      } else {
        input = document.createElement('input');
        input.type = 'text';
        if (variable.default_value) {
          input.value = variable.default_value;
        }
      }
      
      input.name = variable.name;
      input.required = variable.required;
      input.placeholder = variable.description;
      
      fieldContainer.appendChild(label);
      fieldContainer.appendChild(input);
      form.appendChild(fieldContainer);
    });
  }

  applyTemplate() {
    if (!this.selectedTemplate) return;
    
    const form = document.getElementById('variables-form');
    const variables = {};
    
    // Collect form data manually
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.name) {
        if (input.type === 'checkbox') {
          variables[input.name] = input.checked;
        } else {
          variables[input.name] = input.value;
        }
      }
    });
    
    // Check required fields
    const missingRequired = this.selectedTemplate.variables
      .filter(v => v.required && !variables[v.name])
      .map(v => v.description);
    
    if (missingRequired.length > 0) {
      this.showNotification(`Required fields missing: ${missingRequired.join(', ')}`, 'warning');
      return;
    }
    
    // Fill template
    let filledTemplate = this.selectedTemplate.prompt;
    
    // Replace variables in template
    this.selectedTemplate.variables.forEach(variable => {
      const value = variables[variable.name] || variable.default_value || '';
      const placeholder = `{{${variable.name}}}`;
      filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), value);
    });
    
    // Get current user query and append
    const currentQuery = this.currentQuery;
    const finalPrompt = currentQuery ? `${filledTemplate}\n\n${currentQuery}` : filledTemplate;
    
    // Set the prompt
    this.setPromptText(finalPrompt);
    this.showNotification('Template applied successfully', 'success');
    
    // Clear everything and hide the panel
    this.clearAllData();
    this.hideEnhancer();
  }

  showSearchSection() {
    const searchSection = document.getElementById('suggestions-section');
    const variablesSection = document.getElementById('variables-section');
    
    searchSection?.classList.remove('hidden');
    variablesSection?.classList.add('hidden');
    
    this.selectedTemplate = null;
  }



  showSearchStatus(message, type) {
    const statusElement = document.getElementById('search-status');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `search-status ${type}`;
  }

  clearSuggestions() {
    const container = document.getElementById('suggestions-container');
    if (container) container.innerHTML = '';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Shift + E to toggle enhancer
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      this.toggleEnhancer();
    }
    
    // Escape key to close enhancer without clearing
    if (e.key === 'Escape' && this.enhancerVisible) {
      e.preventDefault();
      this.hideEnhancer();
    }
  }

  clearAllData() {
    // Clear search input
    const searchInput = document.getElementById('prompt-search-input');
    if (searchInput) searchInput.value = '';
    
    // Clear search results
    this.clearSuggestions();
    
    // Clear search status
    this.showSearchStatus('', '');
    
    // Reset current query
    this.currentQuery = '';
    
    // Reset selected template
    this.selectedTemplate = null;
    
    // Show search section (hide variables section)
    this.showSearchSection();
  }

  showNotification(message, type = 'info') {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `prompt-enhancer-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize the enhancer when script loads
new ClaudePromptEnhancer(); 