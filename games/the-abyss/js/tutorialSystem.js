/* ============================================
   The Abyss - Interactive Tutorial System
   Phase 1 Implementation
   ============================================ */

const TutorialSystem = (function() {
    'use strict';

    let active = false;
    let currentStep = 0;
    let tutorialCompleted = false;
    let callbacks = {};

    const TUTORIAL_STEPS = [
        {
            id: 'welcome',
            title: 'Welcome to The Abyss',
            text: 'You are about to descend into the deepest ocean trench ever discovered. Ancient creatures lurk in the darkness. Collect artifacts before your oxygen runs out.',
            position: 'center',
            action: 'none',
            duration: 0
        },
        {
            id: 'movement',
            title: 'Basic Movement',
            text: 'Use W A S D to swim. The water is thick - you have momentum and will drift. Plan your movements carefully.',
            position: 'bottom',
            action: 'move',
            highlight: 'hud-container',
            check: () => hasMoved()
        },
        {
            id: 'looking',
            title: 'Looking Around',
            text: 'Move your mouse to look around. You need to see threats before they see you.',
            position: 'bottom',
            action: 'look',
            check: () => hasLookedAround()
        },
        {
            id: 'depth',
            title: 'Descending',
            text: 'Press SPACE to swim up, CTRL to swim down. You\'ll naturally float upward due to buoyancy.',
            position: 'bottom',
            action: 'dive',
            check: () => hasChangedDepth()
        },
        {
            id: 'oxygen',
            title: 'Oxygen Management',
            text: 'Watch your oxygen level! It decreases over time and faster at depth. Find glowing air pockets to refill.',
            position: 'top-left',
            highlight: 'hud-oxygen',
            pulse: true
        },
        {
            id: 'sprint',
            title: 'Sprinting',
            text: 'Hold SHIFT to sprint. This moves you faster but drains oxygen much quicker. Use sparingly!',
            position: 'bottom',
            action: 'sprint',
            check: () => hasSprinted()
        },
        {
            id: 'flares',
            title: 'Using Flares',
            text: 'Press F to throw a flare. Flares attract creatures - use them to create distractions! You have limited flares.',
            position: 'bottom',
            action: 'flare',
            highlight: 'hud-flares',
            check: () => hasUsedFlare()
        },
        {
            id: 'artifacts',
            title: 'Collecting Artifacts',
            text: 'Glowing artifacts are scattered throughout. Swim close to collect them. You need all 5 to escape.',
            position: 'top-left',
            highlight: 'hud-artifacts'
        },
        {
            id: 'creatures',
            title: 'The Creatures',
            text: 'Anglerfish stalk the depths. They\'re attracted to light and movement. If you see a glowing lure - RUN!',
            position: 'center',
            style: 'warning'
        },
        {
            id: 'stealth',
            title: 'Stealth Tips',
            text: 'Move slowly to make less noise. Turn off your flashlight to hide. The wrist computer (TAB) shows detailed info.',
            position: 'bottom'
        },
        {
            id: 'complete',
            title: 'You\'re Ready',
            text: 'Remember: conserve oxygen, watch for creatures, and don\'t panic. Good luck, diver.',
            position: 'center',
            action: 'complete'
        }
    ];

    // Tracking variables
    let movementDetected = false;
    let lookDetected = false;
    let depthChanged = false;
    let sprintDetected = false;
    let flareUsed = false;

    // ============================================
    // INITIALIZATION
    // ============================================
    function init(options = {}) {
        callbacks = options.callbacks || {};
        
        // Check if tutorial was already completed
        const settings = SaveSystem.loadSettings();
        tutorialCompleted = !settings.gameplay.tutorialEnabled;
        
        resetTracking();
    }

    function resetTracking() {
        movementDetected = false;
        lookDetected = false;
        depthChanged = false;
        sprintDetected = false;
        flareUsed = false;
    }

    // ============================================
    // TUTORIAL CONTROL
    // ============================================
    function start() {
        if (tutorialCompleted) return false;
        
        active = true;
        currentStep = 0;
        resetTracking();
        showStep(0);
        
        return true;
    }

    function stop() {
        active = false;
        hideOverlay();
        
        if (callbacks.onComplete) {
            callbacks.onComplete();
        }
    }

    function skip() {
        active = false;
        tutorialCompleted = true;
        
        // Disable future tutorials
        const settings = SaveSystem.loadSettings();
        settings.gameplay.tutorialEnabled = false;
        SaveSystem.saveSettings(settings);
        
        hideOverlay();
        
        if (callbacks.onSkip) {
            callbacks.onSkip();
        }
    }

    function nextStep() {
        currentStep++;
        
        if (currentStep >= TUTORIAL_STEPS.length) {
            completeTutorial();
            return;
        }
        
        showStep(currentStep);
    }

    function previousStep() {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    }

    function showStep(index) {
        const step = TUTORIAL_STEPS[index];
        if (!step) return;
        
        const overlay = getOrCreateOverlay();
        
        // Build content
        let content = '';
        
        if (step.style === 'warning') {
            content += `<div class="tutorial-warning">⚠️ WARNING</div>`;
        }
        
        content += `
            <div class="tutorial-step" data-step="${index}">
                <h3>${step.title}</h3>
                <p>${step.text}</p>
                <div class="tutorial-progress">
                    ${TUTORIAL_STEPS.map((_, i) => 
                        `<span class="dot ${i === index ? 'active' : ''}"></span>`
                    ).join('')}
                </div>
                <div class="tutorial-buttons">
                    ${index > 0 ? '<button class="tutorial-btn secondary" onclick="TutorialSystem.previousStep()">← Back</button>' : ''}
                    <button class="tutorial-btn secondary" onclick="TutorialSystem.skip()">Skip Tutorial</button>
                    <button class="tutorial-btn primary" onclick="TutorialSystem.nextStep()">${index === TUTORIAL_STEPS.length - 1 ? 'Start Dive' : 'Next →'}</button>
                </div>
            </div>
        `;
        
        overlay.innerHTML = content;
        overlay.className = 'tutorial-overlay active ' + step.position;
        
        // Highlight element if specified
        if (step.highlight) {
            highlightElement(step.highlight);
        } else {
            removeHighlight();
        }
        
        // Call step callback
        if (callbacks.onStep) {
            callbacks.onStep(step, index);
        }
    }

    function completeTutorial() {
        tutorialCompleted = true;
        active = false;
        
        // Mark tutorial as complete in settings
        const settings = SaveSystem.loadSettings();
        settings.gameplay.tutorialEnabled = false;
        SaveSystem.saveSettings(settings);
        
        // Unlock achievement
        SaveSystem.unlockAchievement('first_dive');
        
        hideOverlay();
        removeHighlight();
        
        if (callbacks.onComplete) {
            callbacks.onComplete();
        }
    }

    // ============================================
    // UI MANAGEMENT
    // ============================================
    function getOrCreateOverlay() {
        let overlay = document.getElementById('tutorial-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'tutorial-overlay';
            overlay.className = 'tutorial-overlay';
            document.body.appendChild(overlay);
            
            // Add styles if not present
            if (!document.getElementById('tutorial-styles')) {
                addStyles();
            }
        }
        
        return overlay;
    }

    function hideOverlay() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        removeHighlight();
    }

    function highlightElement(elementId) {
        removeHighlight();
        
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('tutorial-highlight');
            
            // Scroll into view if needed
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function removeHighlight() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    }

    function addStyles() {
        const style = document.createElement('style');
        style.id = 'tutorial-styles';
        style.textContent = `
            .tutorial-overlay {
                position: fixed;
                z-index: 9999;
                background: rgba(10, 20, 40, 0.95);
                border: 1px solid rgba(100, 150, 200, 0.4);
                border-radius: 12px;
                padding: 25px 30px;
                max-width: 450px;
                backdrop-filter: blur(10px);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }
            
            .tutorial-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
            
            .tutorial-overlay.center {
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            .tutorial-overlay.bottom {
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .tutorial-overlay.top-left {
                top: 100px;
                left: 20px;
            }
            
            .tutorial-step h3 {
                color: #00aaff;
                font-family: 'Creepster', cursive;
                font-size: 1.5rem;
                margin: 0 0 15px 0;
            }
            
            .tutorial-step p {
                color: #aaddff;
                line-height: 1.7;
                font-size: 1rem;
                margin: 0 0 20px 0;
            }
            
            .tutorial-warning {
                background: rgba(255, 100, 0, 0.2);
                border: 1px solid #ff6600;
                color: #ffaa44;
                padding: 10px 15px;
                border-radius: 6px;
                margin-bottom: 15px;
                font-weight: bold;
                text-align: center;
            }
            
            .tutorial-progress {
                display: flex;
                gap: 6px;
                justify-content: center;
                margin-bottom: 20px;
            }
            
            .tutorial-progress .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: rgba(100, 150, 200, 0.3);
                transition: all 0.3s;
            }
            
            .tutorial-progress .dot.active {
                background: #00aaff;
                transform: scale(1.3);
            }
            
            .tutorial-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .tutorial-btn {
                padding: 10px 20px;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s;
                font-family: inherit;
            }
            
            .tutorial-btn.primary {
                background: linear-gradient(135deg, #0066aa, #0088cc);
                color: #fff;
            }
            
            .tutorial-btn.primary:hover {
                background: linear-gradient(135deg, #0088cc, #00aaff);
                transform: translateY(-1px);
            }
            
            .tutorial-btn.secondary {
                background: rgba(100, 150, 200, 0.2);
                color: #88aacc;
                border: 1px solid rgba(100, 150, 200, 0.3);
            }
            
            .tutorial-btn.secondary:hover {
                background: rgba(100, 150, 200, 0.3);
                color: #aaddff;
            }
            
            .tutorial-highlight {
                animation: tutorialPulse 1.5s ease-in-out infinite;
                box-shadow: 0 0 0 3px rgba(0, 170, 255, 0.5);
                border-radius: 4px;
            }
            
            @keyframes tutorialPulse {
                0%, 100% { box-shadow: 0 0 0 3px rgba(0, 170, 255, 0.5); }
                50% { box-shadow: 0 0 0 6px rgba(0, 170, 255, 0.2); }
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // TRACKING FUNCTIONS
    // ============================================
    function onMove() {
        movementDetected = true;
        checkStepCompletion();
    }

    function onLook() {
        lookDetected = true;
        checkStepCompletion();
    }

    function onDepthChange() {
        depthChanged = true;
        checkStepCompletion();
    }

    function onSprint() {
        sprintDetected = true;
        checkStepCompletion();
    }

    function onFlareUse() {
        flareUsed = true;
        checkStepCompletion();
    }

    function hasMoved() {
        return movementDetected;
    }

    function hasLookedAround() {
        return lookDetected;
    }

    function hasChangedDepth() {
        return depthChanged;
    }

    function hasSprinted() {
        return sprintDetected;
    }

    function hasUsedFlare() {
        return flareUsed;
    }

    function checkStepCompletion() {
        if (!active) return;
        
        const step = TUTORIAL_STEPS[currentStep];
        if (!step || !step.check) return;
        
        if (step.check()) {
            // Auto-advance after a short delay
            setTimeout(() => {
                if (active && currentStep < TUTORIAL_STEPS.length) {
                    const currentStepCheck = TUTORIAL_STEPS[currentStep];
                    if (currentStepCheck && currentStepCheck.id === step.id) {
                        nextStep();
                    }
                }
            }, 1000);
        }
    }

    // ============================================
    // CONTEXTUAL HINTS
    // ============================================
    function showContextualHint(text, duration = 5000) {
        const hint = document.createElement('div');
        hint.className = 'contextual-hint';
        hint.textContent = text;
        
        document.body.appendChild(hint);
        
        // Animate in
        requestAnimationFrame(() => {
            hint.classList.add('show');
        });
        
        // Remove after duration
        setTimeout(() => {
            hint.classList.remove('show');
            setTimeout(() => hint.remove(), 300);
        }, duration);
    }

    function showLowOxygenWarning() {
        showContextualHint('⚠️ Oxygen critical! Find an air pocket!', 4000);
    }

    function showCreatureWarning() {
        showContextualHint('👁️ Creature nearby! Stay calm and move slowly.', 4000);
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        init,
        start,
        stop,
        skip,
        nextStep,
        previousStep,
        
        // Tracking
        onMove,
        onLook,
        onDepthChange,
        onSprint,
        onFlareUse,
        
        // Hints
        showContextualHint,
        showLowOxygenWarning,
        showCreatureWarning,
        
        // State
        isActive: () => active,
        isCompleted: () => tutorialCompleted,
        getCurrentStep: () => currentStep,
        getTotalSteps: () => TUTORIAL_STEPS.length,
        
        // Steps data
        TUTORIAL_STEPS
    };
})();

// Global access
window.TutorialSystem = TutorialSystem;
