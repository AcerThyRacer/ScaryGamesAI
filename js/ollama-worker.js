// Ollama Game Generation Web Worker
// Handles game generation in background to prevent UI blocking

const OLLAMA_API_BASE = 'http://localhost:11434/api';

// Message handler
self.onmessage = async function(e) {
    const { type, data } = e.data;

    switch(type) {
        case 'generate':
            await handleGenerate(data);
            break;
        case 'checkStatus':
            await checkOllamaStatus();
            break;
        case 'getModels':
            await getModels();
            break;
        default:
            self.postMessage({ type: 'error', error: 'Unknown message type' });
    }
};

async function handleGenerate({ prompt, model, options = {} }) {
    const {
        timeout = 180000,
        temperature = 0.7,
        topP = 0.9,
        maxTokens = 8000
    } = options;

    const systemPrompt = `You are a game developer AI. Create a complete, playable HTML5 game based on the user's request.

IMPORTANT REQUIREMENTS:
1. Use vanilla JavaScript with HTML5 Canvas for rendering
2. Include complete game logic: player movement, collision detection, game loop, win/lose conditions
3. Use horror/spooky theme with appropriate dark colors
4. Include score system and progressive difficulty
5. Make games self-contained in a single HTML file with inline CSS and JS
6. Include proper game states: start screen, gameplay, game over
7. Use keyboard controls: WASD/Arrows for movement, Space for action
8. Add visual feedback: particle effects, screen shake, flash effects

Return ONLY the complete HTML code, no explanations or markdown formatting. Start with <!DOCTYPE html>`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        self.postMessage({ type: 'progress', progress: 0, status: 'Starting generation...' });

        const response = await fetch(`${OLLAMA_API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: `${systemPrompt}\n\nUser request: ${prompt}`,
                stream: true,
                options: {
                    temperature: temperature,
                    top_p: topP,
                    num_predict: maxTokens
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        let fullResponse = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let tokenCount = 0;
        let lastUpdate = Date.now();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.response) {
                        fullResponse += data.response;
                        tokenCount++;
                        
                        // Throttle updates to every 100ms
                        const now = Date.now();
                        if (now - lastUpdate > 100) {
                            self.postMessage({ 
                                type: 'progress', 
                                progress: Math.min(95, 50 + tokenCount * 0.5),
                                tokens: tokenCount,
                                status: 'Generating game code...',
                                chunk: fullResponse.slice(-500)
                            });
                            lastUpdate = now;
                        }
                    }
                    if (data.done) {
                        self.postMessage({ 
                            type: 'complete', 
                            result: fullResponse,
                            tokens: tokenCount
                        });
                        return;
                    }
                } catch (e) {}
            }
        }

        // If we exit the loop without 'done', return what we have
        self.postMessage({ 
            type: 'complete', 
            result: fullResponse,
            tokens: tokenCount,
            warning: 'Response may be incomplete'
        });

    } catch (error) {
        clearTimeout(timeoutId);
        
        let errorMessage = error.message;
        let errorType = 'error';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Generation timed out. Try a simpler prompt or increase timeout.';
            errorType = 'timeout';
        }
        
        self.postMessage({ 
            type: 'error', 
            error: errorMessage,
            errorType: errorType
        });
    }
}

async function checkOllamaStatus() {
    try {
        const response = await fetch(`${OLLAMA_API_BASE}/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        self.postMessage({ type: 'status', status: response.ok ? 'connected' : 'error' });
    } catch (error) {
        self.postMessage({ type: 'status', status: 'disconnected', error: error.message });
    }
}

async function getModels() {
    try {
        const response = await fetch(`${OLLAMA_API_BASE}/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        
        const data = await response.json();
        self.postMessage({ type: 'models', models: data.models || [] });
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
}
