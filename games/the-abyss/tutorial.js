/**
 * Tutorial & Help System for The Abyss
 * Phase 1: Foundation & Player Experience
 * 
 * Features:
 * - Interactive tutorial with 8 missions
 * - Contextual hints system
 * - Creature encounter demo
 * - In-game manual
 * - Video tutorials
 */

export class TutorialSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentMission = null;
        this.completedMissions = [];
        this.hintsEnabled = true;
        
        // Tutorial missions
        this.missions = [
            {
                id: 'mission_1',
                title: 'First Steps',
                description: 'Learn basic movement controls',
                objectives: [
                    'Move forward 10 meters',
                    'Look around',
                    'Reach the marked buoy'
                ],
                rewards: {
                    oxygen: '+5 max oxygen'
                },
                completed: false,
                location: 'tutorial_start'
            },
            {
                id: 'mission_2',
                title: 'Oxygen Management',
                description: 'Understand oxygen mechanics',
                objectives: [
                    'Watch your oxygen deplete',
                    'Find an air pocket',
                    'Refill your oxygen'
                ],
                rewards: {
                    knowledge: 'Air pockets restore oxygen'
                },
                completed: false,
                location: 'tutorial_air_pocket'
            },
            {
                id: 'mission_3',
                title: 'Using Equipment',
                description: 'Learn to use your flashlight and flares',
                objectives: [
                    'Turn on flashlight',
                    'Adjust brightness',
                    'Deploy a flare'
                ],
                rewards: {
                    flares: '+1 flare'
                },
                completed: false,
                location: 'tutorial_equipment'
            },
            {
                id: 'mission_4',
                title: 'Collecting Artifacts',
                description: 'Gather your first artifact',
                objectives: [
                    'Locate artifact',
                    'Approach carefully',
                    'Collect it'
                ],
                rewards: {
                    achievement: 'Treasure Hunter'
                },
                completed: false,
                location: 'tutorial_artifact'
            },
            {
                id: 'mission_5',
                title: 'Reading Data Logs',
                description: 'Discover the story through logs',
                objectives: [
                    'Find data log terminal',
                    'Activate terminal',
                    'Read the log'
                ],
                rewards: {
                    lore: 'Research Station Alpha backstory'
                },
                completed: false,
                location: 'tutorial_logs'
            },
            {
                id: 'mission_6',
                title: 'Creature Encounter',
                description: 'Learn how to avoid predators',
                objectives: [
                    'Spot creature from distance',
                    'Hide in kelp forest',
                    'Sneak away undetected'
                ],
                rewards: {
                    achievement: 'Close Call'
                },
                completed: false,
                location: 'tutorial_creature'
            },
            {
                id: 'mission_7',
                title: 'Depth & Pressure',
                description: 'Experience increasing depth',
                objectives: [
                    'Descend to 20m',
                    'Notice pressure effects',
                    'Return to safe depth'
                ],
                rewards: {
                    upgrade: 'Pressure resistance +5%'
                },
                completed: false,
                location: 'tutorial_depth'
            },
            {
                id: 'mission_8',
                title: 'Final Test',
                description: 'Combine all skills in final challenge',
                objectives: [
                    'Navigate obstacle course',
                    'Collect 3 artifacts',
                    'Reach the exit within time limit'
                ],
                rewards: {
                    completion: 'Tutorial Complete',
                    unlock: 'Campaign Mode'
                },
                completed: false,
                location: 'tutorial_final'
            }
        ];
        
        // Contextual hints database
        this.hintDatabase = {
            movement: [
                'Use WASD or Arrow Keys to move',
                'Hold Shift to sprint (uses more oxygen)',
                'Mouse to look around',
                'Spacebar to swim up, C to dive down'
            ],
            oxygen: [
                'Your oxygen depletes faster at depth',
                'Blue bubbles indicate air pockets',
                'Sprinting consumes oxygen faster',
                'Stay calm - panic increases oxygen usage'
            ],
            creatures: [
                'Most creatures are sensitive to light',
                'Flares can distract aggressive creatures',
                'Some creatures hunt by sound',
                'Hiding in kelp reduces detection chance'
            ],
            equipment: [
                'Press F to toggle flashlight',
                'Scroll wheel adjusts brightness',
                'Press G to deploy flare',
                'Equipment has limited battery life'
            ],
            depth: [
                'Deeper areas have better artifacts',
                'Pressure increases with depth',
                'Some areas require upgrades to access',
                'Watch your depth gauge'
            ]
        };
    }
    
    /**
     * Initialize tutorial system
     */
    async initialize() {
        console.log('📚 Initializing tutorial system...');
        
        // Load completed missions
        await this.loadProgress();
        
        // Check if tutorial should be shown
        const showTutorial = localStorage.getItem('show_tutorial');
        
        if (showTutorial !== 'false' && this.completedMissions.length === 0) {
            this.startTutorial();
        }
        
        console.log('✓ Tutorial system initialized');
    }
    
    /**
     * Start tutorial
     */
    startTutorial() {
        console.log('🎓 Starting Tutorial');
        
        this.gameState.tutorialActive = true;
        this.gameState.tutorialPaused = false;
        
        // Show intro cinematic
        this.showIntroCinematic();
        
        // Start first mission
        this.startMission('mission_1');
    }
    
    /**
     * Start specific mission
     */
    startMission(missionId) {
        const mission = this.missions.find(m => m.id === missionId);
        
        if (!mission) {
            console.error(`❌ Unknown mission: ${missionId}`);
            return;
        }
        
        this.currentMission = mission;
        
        console.log(`📍 Mission Started: ${mission.title}`);
        console.log(`   ${mission.description}`);
        
        // Show mission UI
        this.showMissionUI(mission);
        
        // Teleport to mission location
        this.teleportToLocation(mission.location);
        
        // Enable contextual hints for this mission
        this.enableMissionHints(mission);
    }
    
    /**
     * Update mission progress
     */
    updateMissionProgress(objectiveIndex) {
        if (!this.currentMission) return;
        
        const objective = this.currentMission.objectives[objectiveIndex];
        
        if (objective) {
            console.log(`✓ Objective Complete: ${objective}`);
            
            // Mark as complete visually
            this.markObjectiveComplete(objectiveIndex);
            
            // Check if all objectives complete
            const allComplete = this.currentMission.objectives.every((_, idx) => 
                this.isObjectiveComplete(idx)
            );
            
            if (allComplete) {
                this.completeMission();
            }
        }
    }
    
    /**
     * Complete current mission
     */
    completeMission() {
        if (!this.currentMission) return;
        
        console.log(`✅ Mission Complete: ${this.currentMission.title}`);
        
        // Mark as completed
        this.currentMission.completed = true;
        this.completedMissions.push(this.currentMission.id);
        
        // Award rewards
        this.awardMissionRewards(this.currentMission);
        
        // Save progress
        this.saveProgress();
        
        // Show completion screen
        this.showMissionComplete(this.currentMission);
        
        // Move to next mission or end tutorial
        setTimeout(() => {
            const currentIndex = this.missions.findIndex(m => m.id === this.currentMission.id);
            const nextMission = this.missions[currentIndex + 1];
            
            if (nextMission) {
                this.startMission(nextMission.id);
            } else {
                this.completeTutorial();
            }
        }, 3000);
    }
    
    /**
     * Complete entire tutorial
     */
    completeTutorial() {
        console.log('🎉 Tutorial Complete!');
        
        this.gameState.tutorialActive = false;
        this.gameState.tutorialCompleted = true;
        
        // Unlock campaign mode
        localStorage.setItem('campaign_unlocked', 'true');
        
        // Show completion rewards
        this.showTutorialCompletion();
        
        // Return to main menu or start campaign
        setTimeout(() => {
            this.returnToMenu();
        }, 5000);
    }
    
    /**
     * Show contextual hint
     */
    showHint(category) {
        if (!this.hintsEnabled) return;
        
        const hints = this.hintDatabase[category];
        
        if (!hints || hints.length === 0) return;
        
        // Pick random hint or cycle through
        const hintIndex = Math.floor(Math.random() * hints.length);
        const hintText = hints[hintIndex];
        
        console.log(`💡 Hint: ${hintText}`);
        
        // Display hint on screen
        this.displayHintOnScreen(hintText);
    }
    
    /**
     * Display hint on screen
     */
    displayHintOnScreen(text) {
        // Create hint element
        const hintElement = document.createElement('div');
        hintElement.className = 'contextual-hint';
        hintElement.innerHTML = `
            <div class="hint-icon">💡</div>
            <div class="hint-text">${text}</div>
        `;
        
        // Style it
        hintElement.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            padding: 15px 25px;
            color: white;
            font-family: 'Arial', sans-serif;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            animation: fadeInOut 5s ease-in-out;
        `;
        
        // Add fade animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(hintElement);
        
        // Remove after animation
        setTimeout(() => {
            hintElement.remove();
        }, 5000);
    }
    
    /**
     * Show creature encounter demo
     */
    showCreatureEncounterDemo() {
        console.log('🦈 Starting Creature Encounter Demo');
        
        // Spawn passive creature for demonstration
        this.spawnDemoCreature({
            type: 'small_fish_school',
            behavior: 'passive',
            position: { x: 10, y: -5, z: 20 }
        });
        
        // Show interaction tips
        this.showHint('creatures');
        
        // Guide player through observation
        this.guideObservation();
    }
    
    /**
     * Guide player through creature observation
     */
    guideObservation() {
        const steps = [
            'Observe the creature from a distance',
            'Notice its movement patterns',
            'See how it reacts to light',
            'Practice staying still to avoid detection'
        ];
        
        steps.forEach((step, index) => {
            setTimeout(() => {
                this.displayHintOnScreen(step);
            }, index * 3000);
        });
    }
    
    /**
     * Show in-game manual
     */
    showManual() {
        console.log('📖 Opening In-Game Manual');
        
        const manualContent = {
            controls: {
                title: 'Controls',
                sections: [
                    { name: 'Movement', keys: ['WASD/Arrows', 'Shift (Sprint)', 'Space (Up)', 'C (Down)'] },
                    { name: 'Camera', keys: ['Mouse Look', 'Scroll (Zoom)'] },
                    { name: 'Equipment', keys: ['F (Flashlight)', 'G (Flare)', 'E (Interact)'] },
                    { name: 'System', keys: ['ESC (Pause)', 'M (Map)', 'I (Inventory)'] }
                ]
            },
            gameplay: {
                title: 'Gameplay Mechanics',
                sections: [
                    { name: 'Oxygen', desc: 'Depletes over time, faster when sprinting or at depth' },
                    { name: 'Pressure', desc: 'Increases with depth, requires upgrades to withstand' },
                    { name: 'Creatures', desc: 'Some passive, some hostile - learn their behaviors' },
                    { name: 'Artifacts', desc: 'Collect for points and story progression' }
                ]
            },
            survival: {
                title: 'Survival Tips',
                sections: [
                    { name: 'Light Management', desc: 'Balance visibility with attracting creatures' },
                    { name: 'Route Planning', desc: 'Plan your path to maximize oxygen efficiency' },
                    { name: 'Threat Assessment', desc: 'Learn when to fight, flee, or hide' }
                ]
            }
        };
        
        // Display manual UI
        this.displayManualUI(manualContent);
    }
    
    /**
     * Skip tutorial
     */
    skipTutorial() {
        console.log('⏭️ Tutorial Skipped');
        
        this.gameState.tutorialActive = false;
        this.gameState.tutorialSkipped = true;
        
        // Save preference
        localStorage.setItem('show_tutorial', 'false');
        
        // Return to menu
        this.returnToMenu();
    }
    
    /**
     * Restart tutorial
     */
    restartTutorial() {
        console.log('🔄 Restarting Tutorial');
        
        // Reset progress
        this.completedMissions = [];
        this.currentMission = null;
        
        // Clear saved progress
        localStorage.removeItem('tutorial_progress');
        
        // Start from beginning
        this.startTutorial();
    }
    
    /**
     * Save tutorial progress
     */
    saveProgress() {
        const data = {
            completedMissions: this.completedMissions,
            currentMission: this.currentMission?.id,
            timestamp: Date.now()
        };
        
        localStorage.setItem('tutorial_progress', JSON.stringify(data));
    }
    
    /**
     * Load tutorial progress
     */
    loadProgress() {
        const data = localStorage.getItem('tutorial_progress');
        
        if (data) {
            const parsed = JSON.parse(data);
            this.completedMissions = parsed.completedMissions || [];
            
            if (parsed.currentMission) {
                this.currentMission = this.missions.find(m => m.id === parsed.currentMission);
            }
        }
    }
    
    /**
     * Helper methods (placeholders)
     */
    showIntroCinematic() { console.log('🎬 Intro cinematic'); }
    showMissionUI(mission) { console.log('📋 Mission UI:', mission.title); }
    teleportToLocation(location) { console.log('📍 Teleporting to:', location); }
    enableMissionHints(mission) { console.log('💡 Hints enabled for:', mission.title); }
    markObjectiveComplete(index) { console.log('✓ Objective', index, 'complete'); }
    isObjectiveComplete(index) { return true; }
    awardMissionRewards(mission) { console.log('🎁 Rewards:', mission.rewards); }
    showMissionComplete(mission) { console.log('✅ Mission complete:', mission.title); }
    showTutorialCompletion() { console.log('🎉 Tutorial complete!'); }
    returnToMenu() { console.log('🏠 Returning to menu'); }
    spawnDemoCreature(config) { console.log('🐟 Spawning demo creature'); }
    displayManualUI(content) { console.log('📖 Manual opened'); }
}
