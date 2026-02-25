/**
 * Phase 7: Platform Integration
 * 
 * External AI Support, Developer Features, and Platform Export
 */

class ExternalAIIntegration {
    constructor() {
        // AI provider configurations
        this.providers = {
            openai: {
                name: 'OpenAI',
                models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                defaultModel: 'gpt-4o',
                apiKey: null,
                endpoint: 'https://api.openai.com/v1/chat/completions'
            },
            anthropic: {
                name: 'Anthropic Claude',
                models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
                defaultModel: 'claude-3-sonnet',
                apiKey: null,
                endpoint: 'https://api.anthropic.com/v1/messages'
            },
            google: {
                name: 'Google Gemini',
                models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
                defaultModel: 'gemini-1.5-pro',
                apiKey: null,
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
            },
            ollama: {
                name: 'Ollama (Local)',
                models: [],
                defaultModel: null,
                apiKey: null,
                endpoint: 'http://localhost:11434'
            }
        };
        
        this.currentProvider = 'ollama';
        this.requestHistory = [];
        
        this._init();
    }
    
 _init() {
  console.log('[ExternalAI] Initializing External AI Integration...');
  this._loadSettings();
  this._detectOllamaModels().then(() => {
   this._checkOllamaCORSStatus();
  });
 }
    
    _loadSettings() {
        const stored = localStorage.getItem('sgai-ai-settings');
        if (stored) {
            try {
                const settings = JSON.parse(stored);
                this.currentProvider = settings.defaultProvider || 'ollama';
                
                // Load API keys
                if (settings.openaiKey) this.providers.openai.apiKey = settings.openaiKey;
                if (settings.anthropicKey) this.providers.anthropic.apiKey = settings.anthropicKey;
                if (settings.googleKey) this.providers.google.apiKey = settings.googleKey;
            } catch (e) {}
        }
    }
    
    _saveSettings() {
        const settings = {
            defaultProvider: this.currentProvider,
            openaiKey: this.providers.openai.apiKey,
            anthropicKey: this.providers.anthropic.apiKey,
            googleKey: this.providers.google.apiKey
        };
        localStorage.setItem('sgai-ai-settings', JSON.stringify(settings));
    }
    
 async _detectOllamaModels() {
  const ollamaEndpoint = 'http://localhost:11434';
  const defaultModels = ['llama3.2', 'llama3.1', 'llama3', 'mistral', 'codellama', 'gemma2', 'phi3', 'llama2'];
  
  try {
   // Try to fetch Ollama models with proper CORS handling
   const response = await fetch(`${ollamaEndpoint}/api/tags`, {
    method: 'GET',
    headers: { 
     'Accept': 'application/json',
     'Content-Type': 'application/json'
    },
    mode: 'cors',
    credentials: 'omit'
   });
   
   if (response.ok) {
    const data = await response.json();
    const models = data.models?.map(m => m.name) || [];
    
    if (models.length > 0) {
     this.providers.ollama.models = models;
     this.providers.ollama.defaultModel = models[0];
     console.log('[ExternalAI] ✅ Ollama detected with', models.length, 'models:', models.join(', '));
     return;
    }
   }
  } catch (corsError) {
   // CORS error - Ollama is running but needs CORS configuration
   console.warn('[ExternalAI] ⚠️ Ollama detected but CORS blocked access to model list');
   console.warn('[ExternalAI] To fix this, run Ollama with: OLLAMA_ORIGINS="*" ollama serve');
   console.warn('[ExternalAI] Or for production: OLLAMA_ORIGINS="https://scarygaming.com" ollama serve');
  }
  
  // Fallback: Try a simple connectivity check with no-cors
  try {
   const pingResponse = await fetch(`${ollamaEndpoint}/api/tags`, {
    method: 'GET',
    mode: 'no-cors'
   });
   
   if (pingResponse.ok || pingResponse.type === 'opaque') {
    console.log('[ExternalAI] ✅ Ollama is running (CORS-restricted mode)');
    console.warn('[ExternalAI] ⚠️ Using default model list. For custom models, configure CORS on Ollama.');
    this.providers.ollama.models = defaultModels;
    this.providers.ollama.defaultModel = defaultModels[0];
    return;
   }
  } catch (e) {
   // Ollama not running
  }
  
 // Ollama not detected
 console.log('[ExternalAI] ℹ️ Ollama not running locally - using default configuration');
 this.providers.ollama.models = defaultModels;
 this.providers.ollama.defaultModel = defaultModels[0];
}

/**
 * Check Ollama CORS status and show setup instructions if needed
 */
async _checkOllamaCORSStatus() {
 const ollamaEndpoint = 'http://localhost:11434';
 
 try {
  // Try a test request to see if we can access Ollama
  const testResponse = await fetch(`${ollamaEndpoint}/api/tags`, {
   method: 'GET',
   headers: { 'Accept': 'application/json' },
   mode: 'cors'
  });
  
  if (testResponse.ok) {
   // CORS is properly configured!
   console.log('[ExternalAI] ✅ Ollama CORS is properly configured');
   this.providers.ollama.corsConfigured = true;
  }
 } catch (e) {
  // CORS error detected - show setup instructions
  console.warn('[ExternalAI] ⚠️ Ollama CORS Configuration Required');
  console.warn('[ExternalAI] 📋 Setup Instructions:');
  console.warn('[ExternalAI] 1. Stop Ollama if running');
  console.warn('[ExternalAI] 2. Set environment variable:');
  console.warn('[ExternalAI]    Windows: setx OLLAMA_ORIGINS "https://scarygaming.com,http://localhost:*"');
  console.warn('[ExternalAI]    Mac/Linux: export OLLAMA_ORIGINS="https://scarygaming.com,http://localhost:*"');
  console.warn('[ExternalAI] 3. Restart Ollama: ollama serve');
  console.warn('[ExternalAI] 4. Refresh this page');
  console.warn('[ExternalAI] For local testing only, you can use: OLLAMA_ORIGINS="*"');
  
  // Store CORS status
  this.providers.ollama.corsConfigured = false;
  
  // Show UI notification
  this._showOllamaCORSNotification();
 }
}

/**
 * Show UI notification for Ollama CORS setup
 */
_showOllamaCORSNotification() {
 // Check if already shown
 if (localStorage.getItem('sgai-ollama-cors-notified')) {
  return;
 }
 
 const notification = document.createElement('div');
 notification.id = 'ollama-cors-notification';
 notification.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  max-width: 450px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #ff6b35;
  border-radius: 12px;
  padding: 20px;
  z-index: 1000000;
  color: #fff;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  animation: slideIn 0.3s ease-out;
 `;
 
 notification.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
   <h3 style="margin: 0; color: #ff6b35; font-size: 16px;">🦙 Ollama Setup Required</h3>
   <button onclick="this.closest('#ollama-cors-notification').remove()" style="background: none; border: none; color: #888; cursor: pointer; font-size: 20px; padding: 0; line-height: 1;">&times;</button>
  </div>
  <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #ccc;">
   Ollama is running but CORS restrictions prevent access to your model list.
  </p>
  <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
   <p style="margin: 0 0 8px 0; font-size: 12px; color: #ff6b35; font-weight: 600;">📋 Quick Setup:</p>
   <code style="display: block; font-size: 11px; color: #4ecdc4; word-break: break-all;">
    setx OLLAMA_ORIGINS "https://scarygaming.com,*"<br>
    ollama serve
   </code>
  </div>
  <div style="display: flex; gap: 8px; justify-content: flex-end;">
   <button id="ollama-cors-dismiss" style="
    padding: 8px 16px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
   ">Dismiss</button>
   <button id="ollama-cors-guide" style="
    padding: 8px 16px;
    background: linear-gradient(135deg, #ff6b35, #ff4444);
    border: none;
    border-radius: 6px;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
   ">Full Guide</button>
  </div>
 `;
 
 document.body.appendChild(notification);
 
 // Add animation
 const style = document.createElement('style');
 style.textContent = `
  @keyframes slideIn {
   from { transform: translateX(100%); opacity: 0; }
   to { transform: translateX(0); opacity: 1; }
  }
 `;
 document.head.appendChild(style);
 
 // Event listeners
 document.getElementById('ollama-cors-dismiss').addEventListener('click', () => {
  notification.remove();
  localStorage.setItem('sgai-ollama-cors-notified', 'true');
 });
 
 document.getElementById('ollama-cors-guide').addEventListener('click', () => {
  // Open a detailed guide
  const guideWindow = window.open('', '_blank');
  guideWindow.document.write(`
   <!DOCTYPE html>
   <html>
   <head>
    <title>Ollama CORS Setup Guide</title>
    <style>
     body { font-family: 'Inter', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #1a1a2e; color: #fff; }
     h1 { color: #ff6b35; }
     h2 { color: #4ecdc4; margin-top: 30px; }
     code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 14px; }
     pre { background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; overflow-x: auto; }
     .step { background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ff6b35; }
    </style>
   </head>
   <body>
    <h1>🦙 Ollama CORS Setup Guide</h1>
    
    <h2>What is CORS?</h2>
    <p>CORS (Cross-Origin Resource Sharing) is a browser security feature that prevents websites from making requests to different domains without explicit permission.</p>
    
    <h2>Why You Need This</h2>
    <p>Your website runs on <code>https://scarygaming.com</code> (HTTPS), but Ollama runs on <code>http://localhost:11434</code> (HTTP). Browsers block this by default for security.</p>
    
    <div class="step">
     <h3>Step 1: Stop Ollama</h3>
     <p>If Ollama is running, stop it first:</p>
     <pre>Ctrl+C in the terminal running Ollama</pre>
    </div>
    
    <div class="step">
     <h3>Step 2: Set CORS Environment Variable</h3>
     <p><strong>Windows (PowerShell/CMD):</strong></p>
     <pre>setx OLLAMA_ORIGINS "https://scarygaming.com,http://localhost:*"</pre>
     
     <p><strong>Mac/Linux:</strong></p>
     <pre>export OLLAMA_ORIGINS="https://scarygaming.com,http://localhost:*"</pre>
     
     <p><strong>For local testing only (less secure):</strong></p>
     <pre>setx OLLAMA_ORIGINS "*"</pre>
    </div>
    
    <div class="step">
     <h3>Step 3: Restart Ollama</h3>
     <pre>ollama serve</pre>
    </div>
    
    <div class="step">
     <h3>Step 4: Verify</h3>
     <p>Refresh your website and check the browser console. You should see:</p>
     <pre style="color: #4ecdc4;">[ExternalAI] ✅ Ollama CORS is properly configured</pre>
    </div>
    
    <h2>Troubleshooting</h2>
    <ul>
     <li><strong>Still not working?</strong> Make sure you restarted Ollama AFTER setting the environment variable</li>
     <li><strong>On Windows?</strong> You may need to restart your terminal/command prompt for environment variables to take effect</li>
     <li><strong>Multiple users?</strong> Each user running Ollama locally needs to configure this on their machine</li>
    </ul>
    
    <p style="margin-top: 40px; color: #888; font-size: 12px;">
     For more information, see the 
     <a href="https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server" target="_blank" style="color: #4ecdc4;">Ollama FAQ</a>.
    </p>
   </body>
   </html>
  `);
 });
 
 // Mark as notified after 5 seconds
 setTimeout(() => {
  localStorage.setItem('sgai-ollama-cors-notified', 'true');
 }, 5000);
}
    
    // ============================================
    // PROVIDER MANAGEMENT
    // ============================================
    
    /**
     * Get all available providers
     */
    getProviders() {
        return Object.entries(this.providers).map(([id, p]) => ({
            id,
            name: p.name,
            available: this._isProviderAvailable(id),
            models: p.models,
            defaultModel: p.defaultModel
        }));
    }
    
    /**
     * Check if provider is available
     */
    _isProviderAvailable(providerId) {
        const provider = this.providers[providerId];
        
        if (providerId === 'ollama') {
            // Check if local Ollama is running
            return provider.models.length > 0 || true; // Assume available
        }
        
        // Other providers need API key
        return !!provider.apiKey;
    }
    
    /**
     * Set API key for provider
     */
    setApiKey(providerId, apiKey) {
        if (this.providers[providerId]) {
            this.providers[providerId].apiKey = apiKey;
            this._saveSettings();
            return { success: true };
        }
        return { success: false, error: 'Unknown provider' };
    }
    
    /**
     * Get current provider
     */
    getCurrentProvider() {
        return this.currentProvider;
    }
    
    /**
     * Switch provider
     */
    setProvider(providerId) {
        if (this._isProviderAvailable(providerId)) {
            this.currentProvider = providerId;
            this._saveSettings();
            return { success: true };
        }
        return { 
            success: false, 
            error: `Provider ${providerId} not available`,
            needsSetup: !this._isProviderAvailable(providerId)
        };
    }
    
    /**
     * Get models for provider
     */
    getModels(providerId = null) {
        const provider = this.providers[providerId || this.currentProvider];
        return provider?.models || [];
    }
    
    // ============================================
    // GENERATION
    // ============================================
    
    /**
     * Generate game using external AI
     */
    async generate(prompt, options = {}) {
        const provider = this.currentProvider;
        const model = options.model || this.providers[provider].defaultModel;
        
        console.log(`[ExternalAI] Generating with ${provider}/${model}...`);
        
        const startTime = Date.now();
        
        try {
            let result;
            
            switch (provider) {
                case 'openai':
                    result = await this._generateOpenAI(prompt, model, options);
                    break;
                case 'anthropic':
                    result = await this._generateAnthropic(prompt, model, options);
                    break;
                case 'google':
                    result = await this._generateGoogle(prompt, model, options);
                    break;
                case 'ollama':
                    result = await this._generateOllama(prompt, model, options);
                    break;
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }
            
            const duration = Date.now() - startTime;
            
            // Log to history
            this._logRequest({
                provider,
                model,
                prompt: prompt.substring(0, 100),
                duration,
                success: true
            });
            
            return {
                success: true,
                provider,
                model,
                result,
                duration
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this._logRequest({
                provider,
                model,
                prompt: prompt.substring(0, 100),
                duration,
                success: false,
                error: error.message
            });
            
            return {
                success: false,
                provider,
                model,
                error: error.message,
                duration
            };
        }
    }
    
    async _generateOpenAI(prompt, model, options) {
        const apiKey = this.providers.openai.apiKey;
        
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        
        const response = await fetch(this.providers.openai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: this._getSystemPrompt(options) },
                    { role: 'user', content: prompt }
                ],
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 4000
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI request failed');
        }
        
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
    
    async _generateAnthropic(prompt, model, options) {
        const apiKey = this.providers.anthropic.apiKey;
        
        if (!apiKey) {
            throw new Error('Anthropic API key not configured');
        }
        
        const response = await fetch(this.providers.anthropic.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: options.maxTokens || 4000,
                system: this._getSystemPrompt(options),
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Anthropic request failed');
        }
        
        const data = await response.json();
        return data.content?.[0]?.text || '';
    }
    
    async _generateGoogle(prompt, model, options) {
        const apiKey = this.providers.google.apiKey;
        
        if (!apiKey) {
            throw new Error('Google API key not configured');
        }
        
        const url = `${this.providers.google.endpoint}/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: options.temperature || 0.7,
                    maxOutputTokens: options.maxTokens || 4000
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Google request failed');
        }
        
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    
    async _generateOllama(prompt, model, options) {
        const endpoint = this.providers.ollama.endpoint;
        
        const response = await fetch(`${endpoint}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    temperature: options.temperature || 0.7,
                    num_predict: options.maxTokens || 4000
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response || '';
    }
    
    _getSystemPrompt(options = {}) {
        const type = options.type || 'game';
        
        const prompts = {
            game: `You are a game development expert. Generate complete, playable HTML5 games based on user descriptions. 
Generate valid HTML with embedded CSS and JavaScript. The game should be fully functional and ready to play.`,
            
            story: `You are a creative writer. Generate interactive fiction and stories based on user descriptions.
Format output as HTML with smooth animations and engaging presentation.`,
            
            tool: `You are a software developer. Generate useful web tools and utilities based on user descriptions.
Generate clean, functional code following best practices.`
        };
        
        return prompts[type] || prompts.game;
    }
    
    /**
     * Compare models side-by-side
     */
    async compareModels(prompt, modelIds = []) {
        const results = [];
        
        for (const modelId of modelIds) {
            const [provider, model] = modelId.split('/');
            
            try {
                const result = await this.generate(prompt, { 
                    model, 
                    provider,
                    maxTokens: 2000 
                });
                
                results.push({
                    modelId,
                    success: result.success,
                    result: result.result?.substring(0, 500),
                    duration: result.duration,
                    error: result.error
                });
            } catch (error) {
                results.push({
                    modelId,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    _logRequest(log) {
        this.requestHistory.push({
            ...log,
            timestamp: new Date().toISOString()
        });
        
        // Keep last 100
        if (this.requestHistory.length > 100) {
            this.requestHistory = this.requestHistory.slice(-100);
        }
    }
    
    /**
     * Get request history
     */
    getHistory() {
        return [...this.requestHistory];
    }
    
    /**
     * Get usage stats
     */
    getUsageStats() {
        const stats = {
            totalRequests: this.requestHistory.length,
            successfulRequests: this.requestHistory.filter(r => r.success).length,
            failedRequests: this.requestHistory.filter(r => !r.success).length,
            byProvider: {},
            avgDuration: 0
        };
        
        let totalDuration = 0;
        
        this.requestHistory.forEach(r => {
            stats.byProvider[r.provider] = (stats.byProvider[r.provider] || 0) + 1;
            totalDuration += r.duration;
        });
        
        if (stats.totalRequests > 0) {
            stats.avgDuration = Math.round(totalDuration / stats.totalRequests);
        }
        
        return stats;
    }
}

// Developer Features Class
class DeveloperFeatures {
    constructor() {
        this.apiBase = '/api';
        this.webhooks = [];
        this._init();
    }
    
    _init() {
        console.log('[DevFeatures] Initializing Developer Features...');
        this._loadWebhooks();
    }
    
    _loadWebhooks() {
        const stored = localStorage.getItem('sgai-webhooks');
        if (stored) {
            try {
                this.webhooks = JSON.parse(stored);
            } catch (e) {
                this.webhooks = [];
            }
        }
    }
    
    _saveWebhooks() {
        localStorage.setItem('sgai-webhooks', JSON.stringify(this.webhooks));
    }
    
    // ============================================
    // API ENDPOINTS
    // ============================================
    
    /**
     * Generate API key
     */
    async generateApiKey(name = 'Default') {
        const key = 'sk-' + this._generateSecureId();
        
        const apiKey = {
            id: 'key-' + Date.now(),
            key,
            name,
            createdAt: new Date().toISOString(),
            lastUsed: null,
            requests: 0,
            active: true
        };
        
        const keys = this._getApiKeys();
        keys.push(apiKey);
        localStorage.setItem('sgai-api-keys', JSON.stringify(keys));
        
        return { success: true, apiKey: key };
    }
    
    /**
     * Get API keys
     */
    _getApiKeys() {
        const stored = localStorage.getItem('sgai-api-keys');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    }
    
    /**
     * Revoke API key
     */
    revokeApiKey(keyId) {
        const keys = this._getApiKeys();
        const key = keys.find(k => k.id === keyId);
        
        if (key) {
            key.active = false;
            localStorage.setItem('sgai-api-keys', JSON.stringify(keys));
        }
        
        return { success: true };
    }
    
    /**
     * API request handler (for server-side implementation)
     */
    async handleApiRequest(endpoint, method, body, apiKey) {
        // Verify API key
        const keys = this._getApiKeys();
        const keyObj = keys.find(k => k.key === apiKey && k.active);
        
        if (!keyObj) {
            return { success: false, error: 'Invalid API key', status: 401 };
        }
        
        // Update usage
        keyObj.requests++;
        keyObj.lastUsed = new Date().toISOString();
        localStorage.setItem('sgai-api-keys', JSON.stringify(keys));
        
        // Route request
        switch (endpoint) {
            case '/generate':
                return await this._handleGenerate(body);
            case '/templates':
                return this._handleTemplates();
            case '/history':
                return this._handleHistory(body);
            case '/credits':
                return this._handleCredits();
            default:
                return { success: false, error: 'Unknown endpoint', status: 404 };
        }
    }
    
    async _handleGenerate(body) {
        const ai = window.externalAI || window.OllamaIntegration;
        
        if (ai?.generateGame) {
            const result = await ai.generateGame(body.prompt, body.options);
            return { success: true, result };
        }
        
        return { success: false, error: 'Generation service unavailable' };
    }
    
    _handleTemplates() {
        const premium = window.PremiumFeatures;
        
        if (premium?.getTemplates) {
            return { success: true, templates: premium.getTemplates() };
        }
        
        return { success: false, error: 'Templates unavailable' };
    }
    
    _handleHistory(body) {
        const premium = window.PremiumFeatures;
        const limit = body?.limit || 10;
        
        if (premium?.getHistory) {
            const history = premium.getHistory().slice(0, limit);
            return { success: true, history };
        }
        
        return { success: false, error: 'History unavailable' };
    }
    
    _handleCredits() {
        const premium = window.PremiumFeatures;
        
        if (premium?.getSubscription) {
            const sub = premium.getSubscription();
            return { 
                success: true, 
                credits: sub.credits || 0,
                tier: sub.tier 
            };
        }
        
        return { success: false, error: 'Credits unavailable' };
    }
    
    /**
     * Generate curl command for API
     */
    generateCurlCommand(endpoint, method = 'POST', body = {}) {
        const key = this._getApiKeys()[0]?.key || 'YOUR_API_KEY';
        
        let cmd = `curl -X ${method} "${this.apiBase}${endpoint}" \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json"`;
        
        if (Object.keys(body).length > 0) {
            cmd += ` \\
  -d '${JSON.stringify(body)}'`;
        }
        
        return cmd;
    }
    
    // ============================================
    // WEBHOOKS
    // ============================================
    
    /**
     * Add webhook
     */
    addWebhook(url, events = ['generation.completed']) {
        const webhook = {
            id: 'webhook-' + Date.now(),
            url,
            events,
            active: true,
            createdAt: new Date().toISOString(),
            lastTriggered: null
        };
        
        this.webhooks.push(webhook);
        this._saveWebhooks();
        
        // Test webhook
        this._testWebhook(webhook);
        
        return webhook;
    }
    
    /**
     * Remove webhook
     */
    removeWebhook(webhookId) {
        this.webhooks = this.webhooks.filter(w => w.id !== webhookId);
        this._saveWebhooks();
        return { success: true };
    }
    
    /**
     * Get webhooks
     */
    getWebhooks() {
        return [...this.webhooks];
    }
    
    /**
     * Trigger webhooks
     */
    async triggerWebhooks(event, data) {
        const matching = this.webhooks.filter(w => w.active && w.events.includes(event));
        
        const results = [];
        
        for (const webhook of matching) {
            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-SGAI-Event': event
                    },
                    body: JSON.stringify({
                        event,
                        data,
                        timestamp: new Date().toISOString()
                    })
                });
                
                webhook.lastTriggered = new Date().toISOString();
                results.push({ webhook: webhook.id, success: response.ok });
            } catch (error) {
                results.push({ webhook: webhook.id, success: false, error: error.message });
            }
        }
        
        this._saveWebhooks();
        
        return results;
    }
    
    async _testWebhook(webhook) {
        try {
            await fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'webhook.test',
                    message: 'Webhook configured successfully'
                })
            });
        } catch (e) {
            console.warn('[DevFeatures] Webhook test failed:', e);
        }
    }
    
    // ============================================
    // GITHUB INTEGRATION
    // ============================================
    
    /**
     * Save game to GitHub
     */
    async saveToGitHub(gameData, repo, path, message = 'Add generated game') {
        // This would use GitHub API in production
        // For now, simulate and provide the data
        
        const payload = {
            owner: repo.owner,
            repo: repo.name,
            path,
            message,
            content: btoa(unescape(encodeURIComponent(gameData.html)))
        };
        
        // In production, this would be:
        // const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${path}`, {
        //     method: 'PUT',
        //     headers: {
        //         'Authorization': `token ${githubToken}`,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(payload)
        // });
        
        return {
            success: true,
            message: 'Would push to GitHub in production',
            payload
        };
    }
    
    /**
     * Get GitHub repos
     */
    async getGitHubRepos() {
        // In production, fetch from GitHub API
        return [
            { name: 'my-games', description: 'My generated games', private: false },
            { name: 'game-experiments', description: 'Game prototypes', private: true }
        ];
    }
    
    // ============================================
    // CLI TOOL
    // ============================================
    
    /**
     * Generate CLI usage examples
     */
    getCLIExamples() {
        return [
            {
                command: 'npx sgai generate "Create a space shooter game"',
                description: 'Generate a game from prompt'
            },
            {
                command: 'npx sgai generate --template=horror --output=./games',
                description: 'Generate with specific template'
            },
            {
                command: 'npx sgai list templates',
                description: 'List available templates'
            },
            {
                command: 'npx sgai account status',
                description: 'Check account and credits'
            }
        ];
    }
    
    /**
     * Get CLI installation command
     */
    getCLIInstallCommand() {
        return 'npm install -g @scarygamesai/cli';
    }
    
    _generateSecureId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

// Platform Export Class
class PlatformExporter {
    constructor() {
        this._init();
    }
    
    _init() {
        console.log('[Exporter] Initializing Platform Exporter...');
    }
    
    // ============================================
    // PWA EXPORT
    // ============================================
    
    /**
     * Export as PWA (Progressive Web App)
     */
    async exportAsPWA(gameData) {
        const manifest = {
            name: gameData.title || 'My Game',
            short_name: gameData.shortName || gameData.title?.substring(0, 12) || 'Game',
            description: gameData.description || 'Generated with ScaryGamesAI',
            start_url: '/',
            display: 'standalone',
            background_color: gameData.colors?.background || '#1a1a2e',
            theme_color: gameData.colors?.primary || '#667eea',
            icons: this._generateIconSizes()
        };
        
        const serviceWorker = this._generateServiceWorker(gameData);
        
        const files = {
            'manifest.json': JSON.stringify(manifest, null, 2),
            'sw.js': serviceWorker,
            'index.html': gameData.html
        };
        
        return {
            success: true,
            format: 'pwa',
            files,
            instructions: this._getPWAInstructions()
        };
    }
    
    _generateIconSizes() {
        return [
            { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
            { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
            { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
            { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
            { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ];
    }
    
    _generateServiceWorker(gameData) {
        return `// Service Worker for ${gameData.title || 'Game'}
const CACHE_NAME = 'sgai-game-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/game.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
`;
    }
    
    _getPWAInstructions() {
        return [
            '1. Upload files to your web host',
            '2. Ensure HTTPS is enabled',
            '3. Visit the URL on a mobile device',
            '4. Tap "Add to Home Screen" to install'
        ];
    }
    
    // ============================================
    // STEAM EXPORT
    // ============================================
    
    /**
     * Prepare game for Steam upload
     */
    async exportForSteam(gameData) {
        const steamData = {
            appId: null, // Would be assigned by Steam
            title: gameData.title,
            description: gameData.description,
            genre: gameData.genre || 'Action',
            tags: gameData.tags || ['Indie', 'Casual'],
            releaseDate: new Date().toISOString(),
            price: gameData.price || 4.99,
            os: ['Windows', 'Mac', 'Linux'],
            languages: ['English'],
            
            // Steam store assets needed
            assets: {
                header: { required: true, size: '460x215' },
                library: { required: true, size: '600x900' },
                background: { required: true, size: '1920x1080' },
                capsule: { required: true, size: '467x181' },
                icon: { required: true, size: '256x256' }
            },
            
            // Steamworks config
            steamworks: {
                achievements: gameData.achievements || [],
                cloudSave: true,
                controllerSupport: 'full'
            }
        };
        
        const files = {
            'steam_app.txt': steamData.appId || 'TODO: Add Steam App ID',
            'game/package.json': JSON.stringify(steamData, null, 2),
            'game/index.html': gameData.html
        };
        
        return {
            success: true,
            format: 'steam',
            files,
            instructions: this._getSteamInstructions()
        };
    }
    
    _getSteamInstructions() {
        return [
            '1. Create Steamworks developer account',
            '2. Create new app and upload build',
            '3. Fill in store page details',
            '4. Upload required assets',
            '5. Submit for review'
        ];
    }
    
    // ============================================
    // ITCH.IO EXPORT
    // ============================================
    
    /**
     * Export for itch.io
     */
    async exportForItchIO(gameData) {
        const itchData = {
            title: gameData.title,
            description: gameData.description,
            genre: gameData.genre || 'Action',
            tags: gameData.tags || ['indie', 'game'],
            price: gameData.price || 0,
            embed: true,
            sourcemap: false,
            
            // Publishing options
            publishing: {
                public: true,
                comments: true,
                reviews: true,
                forum: false,
                discount: null
            },
            
            // Game settings
            settings: {
                fullscreen: true,
                pauseOnFocusLost: false,
                autostart: false,
                loop: false
            }
        };
        
        const files = {
            'butler-config.json': JSON.stringify({
                'itch.io': {
                    gameId: null, // Would be assigned
                    channel: 'default'
                }
            }, null, 2),
            'game/index.html': gameData.html,
            'game/package.json': JSON.stringify(itchData, null, 2)
        };
        
        return {
            success: true,
            format: 'itchio',
            files,
            instructions: this._getItchIOInstructions(),
            uploadCommand: `butler push ./game your-username/${gameData.title?.toLowerCase().replace(/\s+/g, '-')} --after-upload notify`
        };
    }
    
    _getItchIOInstructions() {
        return [
            '1. Create itch.io account',
            '2. Create new project',
            '3. Upload game files',
            '4. Configure game settings',
            '5. Publish'
        ];
    }
    
    // ============================================
    // ANDROID APK EXPORT
    // ============================================
    
    /**
     * Convert to Android APK
     */
    async exportAsAPK(gameData) {
        const config = {
            packageName: gameData.packageName || 'com.scarygamesai.game',
            versionName: gameData.versionName || '1.0.0',
            versionCode: gameData.versionCode || 1,
            title: gameData.title,
            orientation: gameData.orientation || 'portrait',
            permissions: ['internet', 'accessNetworkState'],
            
            // Android-specific settings
            android: {
                minSdkVersion: 21,
                targetSdkVersion: 33,
                hardwareAccelerated: true,
                fullscreen: true
            },
            
            // Game view settings
            gameView: {
                width: gameData.width || 800,
                height: gameData.height || 600,
                scaleMode: 'fit'
            }
        };
        
        const files = {
            'AndroidManifest.xml': this._generateAndroidManifest(config),
            'build.gradle': this._generateGradle(config),
            'src/main/java/com/game/GameActivity.java': this._generateGameActivity(),
            'assets/index.html': gameData.html
        };
        
        return {
            success: true,
            format: 'apk',
            files,
            instructions: this._getAPKInstructions(),
            buildCommand: './gradlew assembleRelease'
        };
    }
    
    _generateAndroidManifest(config) {
        return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageName}"
    android:versionCode="${config.versionCode}"
    android:versionName="${config.versionName}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="${config.android.hardwareAccelerated}"
        android:label="${config.title}">

        <activity
            android:name=".GameActivity"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:exported="true"
            android:screenOrientation="${config.orientation}"
            android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
    }
    
    _generateGradle(config) {
        return `android {
    namespace '${config.packageName}'
    compileSdk 33

    defaultConfig {
        applicationId "${config.packageName}"
        minSdkVersion ${config.android.minSdkVersion}
        targetSdkVersion ${config.android.targetSdkVersion}
        versionCode ${config.versionCode}
        versionName "${config.versionName}"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
}`;
    }
    
    _generateGameActivity() {
        return `package com.game;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;

public class GameActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.loadUrl("file:///android_asset/index.html");
        
        setContentView(webView);
    }
}`;
    }
    
    _getAPKInstructions() {
        return [
            '1. Install Android Studio',
            '2. Create new Android project',
            '3. Add files to project',
            '4. Build debug or release APK',
            '5. Enable "Unknown sources" on device',
            '6. Install APK'
        ];
    }
    
    // ============================================
    // EXPORT ALL FORMATS
    // ============================================
    
    /**
     * Export to multiple platforms at once
     */
    async exportAll(gameData, platforms = ['pwa', 'itchio']) {
        const results = {};
        
        for (const platform of platforms) {
            try {
                switch (platform) {
                    case 'pwa':
                        results[platform] = await this.exportAsPWA(gameData);
                        break;
                    case 'steam':
                        results[platform] = await this.exportForSteam(gameData);
                        break;
                    case 'itchio':
                        results[platform] = await this.exportForItchIO(gameData);
                        break;
                    case 'apk':
                        results[platform] = await this.exportAsAPK(gameData);
                        break;
                }
            } catch (error) {
                results[platform] = { success: false, error: error.message };
            }
        }
        
        return results;
    }
    
    /**
     * Download export as ZIP
     */
    async downloadAsZip(exportResult, filename = 'game-export') {
        // In production, would create actual ZIP
        // For now, provide download links
        
        const downloadData = {
            filename: `${filename}.zip`,
            size: JSON.stringify(exportResult.files).length,
            files: Object.keys(exportResult.files)
        };
        
 return {
  success: true,
  downloadData,
  note: 'ZIP creation would be handled server-side'
 };
 }

 /**
  * Test Ollama connection - Public utility for debugging
  * Can be called from console: window.externalAI.testOllamaConnection()
  */
 async testOllamaConnection() {
  const endpoint = 'http://localhost:11434';
  console.log('[ExternalAI] Testing Ollama connection...');
  
  try {
   // Test 1: Basic connectivity
   console.log('[ExternalAI] Test 1: Checking if Ollama is running...');
   const pingResponse = await fetch(`${endpoint}/api/tags`, {
    method: 'GET',
    mode: 'no-cors'
   });
   
   if (pingResponse.ok || pingResponse.type === 'opaque') {
    console.log('✅ Ollama is running on localhost:11434');
   } else {
    console.error('❌ Ollama is not responding');
    return { success: false, error: 'Ollama not running' };
   }
   
   // Test 2: CORS-enabled request
   console.log('[ExternalAI] Test 2: Checking CORS configuration...');
   const corsResponse = await fetch(`${endpoint}/api/tags`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    mode: 'cors'
   });
   
   if (corsResponse.ok) {
    const data = await corsResponse.json();
    const models = data.models?.map(m => m.name) || [];
    console.log('✅ CORS is properly configured');
    console.log(`📦 Found ${models.length} model(s):`, models.join(', '));
    
    return {
     success: true,
     corsConfigured: true,
     models: models,
     message: 'Ollama is fully configured and ready to use!'
    };
   } else {
    console.warn('⚠️ CORS is not configured properly');
    console.warn('📋 To fix this:');
    console.warn('   1. Stop Ollama (Ctrl+C)');
    console.warn('   2. Run: setx OLLAMA_ORIGINS "https://scarygaming.com,*"');
    console.warn('   3. Restart Ollama: ollama serve');
    console.warn('   4. Refresh this page');
    
    return {
     success: true,
     corsConfigured: false,
     message: 'Ollama is running but needs CORS configuration'
    };
   }
  } catch (error) {
   console.error('❌ Connection test failed:', error.message);
   console.error('💡 Make sure Ollama is installed and running');
   console.error('💡 Download Ollama from: https://ollama.ai');
   
   return {
    success: false,
    error: error.message,
    message: 'Failed to connect to Ollama'
   };
  }
 }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.ExternalAIIntegration = ExternalAIIntegration;
    window.DeveloperFeatures = DeveloperFeatures;
    window.PlatformExporter = PlatformExporter;
    
    // Auto-initialize
    window.externalAI = new ExternalAIIntegration();
    window.developerFeatures = new DeveloperFeatures();
    window.platformExporter = new PlatformExporter();
});
