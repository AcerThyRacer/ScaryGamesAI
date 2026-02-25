# Ollama Integration Setup Guide

## Overview

ScaryGamesAI now includes full Ollama integration for running local AI models. This guide helps you and your users configure Ollama for optimal performance.

## Quick Start for Users

### Step 1: Install Ollama

Download and install Ollama from: https://ollama.ai

### Step 2: Pull Models

```bash
ollama pull llama3.2
ollama pull mistral
ollama pull codellama
```

### Step 3: Configure CORS (Required for Web Access)

**Windows:**
```cmd
setx OLLAMA_ORIGINS "https://scarygaming.com,http://localhost:*"
```

**Mac/Linux:**
```bash
export OLLAMA_ORIGINS="https://scarygaming.com,http://localhost:*"
```

**For local testing only:**
```bash
setx OLLAMA_ORIGINS "*"
```

### Step 4: Restart Ollama

```bash
ollama serve
```

### Step 5: Verify

Open the browser console on your website and look for:
```
[ExternalAI] ✅ Ollama CORS is properly configured
```

## Testing the Connection

Users can test their Ollama connection from the browser console:

```javascript
// Run this in browser console
await window.externalAI.testOllamaConnection()
```

This will:
1. Check if Ollama is running
2. Verify CORS configuration
3. List available models
4. Provide setup instructions if needed

## Features

### Automatic Model Detection

Once configured, the system automatically detects all installed Ollama models and makes them available to users.

### Fallback Mode

If CORS is not configured, the system still works with a default set of common models:
- llama3.2
- llama3.1
- llama3
- mistral
- codellama
- gemma2
- phi3
- llama2

### UI Notifications

Users will see a helpful notification if Ollama is detected but CORS is not configured, with:
- Quick setup instructions
- Link to full setup guide
- Dismiss option (won't show again)

## Troubleshooting

### "Ollama not running locally"

**Solution:** Start Ollama service
```bash
ollama serve
```

### CORS Errors

**Solution:** Configure CORS environment variable (see Step 3 above)

### Models Not Showing

**Solution:**
1. Check Ollama is running: `ollama list`
2. Pull models: `ollama pull llama3.2`
3. Restart Ollama
4. Refresh browser page

### Connection Refused

**Solution:** 
- Make sure Ollama is running on port 11434
- Check firewall settings
- Try: `curl http://localhost:11434/api/tags`

## For Website Users

Each user who wants to use Ollama with your website needs to:

1. Install Ollama locally
2. Configure CORS to allow your domain
3. Keep Ollama running while using the website

**Important:** Ollama runs on the USER'S machine, not on your server. This provides:
- ✅ Privacy: Models run locally
- ✅ No API costs: Free to use
- ✅ Low latency: No network requests
- ⚠️ Requirement: Users must have Ollama installed

## Production Deployment

For production use on `https://scarygaming.com`:

1. **Update CORS Origins:**
   ```bash
   setx OLLAMA_ORIGINS "https://scarygaming.com"
   ```

2. **Provide User Documentation:**
   - Add setup guide to your FAQ
   - Create tutorial video
   - Add tooltip in UI

3. **Graceful Degradation:**
   - System works with default models if CORS not configured
   - Show helpful setup notifications
   - Provide alternative AI providers (OpenAI, Anthropic, etc.)

## API Reference

### Check Ollama Status
```javascript
const status = await window.externalAI.testOllamaConnection();
console.log(status);
// { success: true, corsConfigured: true, models: [...] }
```

### Get Available Models
```javascript
const models = window.externalAI.getModels('ollama');
console.log(models);
// ['llama3.2', 'mistral', ...]
```

### Switch to Ollama
```javascript
const result = window.externalAI.setProvider('ollama');
console.log(result);
// { success: true }
```

## Console Commands for Debugging

Users can run these in browser console:

```javascript
// Test connection
await window.externalAI.testOllamaConnection()

// List all providers
window.externalAI.getProviders()

// Get current provider
window.externalAI.getCurrentProvider()

// List models for current provider
window.externalAI.getModels()

// Switch provider
window.externalAI.setProvider('ollama')
```

## Security Notes

- **CORS Configuration:** Only allow trusted origins
- **Local Models:** Models run on user's machine, not your server
- **API Keys:** Other providers (OpenAI, Anthropic) require API keys
- **HTTPS:** Your site uses HTTPS, Ollama uses HTTP (localhost exception)

## Additional Resources

- [Ollama Documentation](https://ollama.ai/docs)
- [Ollama CORS FAQ](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server)
- [Available Models](https://ollama.ai/library)

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Run `window.externalAI.testOllamaConnection()` for diagnostics
3. Review this guide's troubleshooting section
4. Check Ollama's official documentation

---

**Last Updated:** 2026-02-16
**Version:** 1.0.0
