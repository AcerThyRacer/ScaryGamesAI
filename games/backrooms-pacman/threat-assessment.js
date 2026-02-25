/**
 * Dynamic Threat Assessment System
 * AI memory, communication, and tactical reasoning
 */

var ThreatAssessment = (function() {
    'use strict';

    var config = {
        memoryDuration: 10000,
        suspicionDecay: 0.1,
        communicationRange: 20,
        maxSuspectedPositions: 10,
        noiseDecay: 0.2
    };

    var globalMemory = {
        lastKnownPlayerPos: null,
        lastSeenTime: 0,
        suspectedPositions: [],
        noiseSources: [],
        huntedAreas: []
    };

    var aiAgents = [];

    function init() {
        globalMemory = {
            lastKnownPlayerPos: null,
            lastSeenTime: 0,
            suspectedPositions: [],
            noiseSources: [],
            huntedAreas: []
        };
        aiAgents = [];
        console.log('[ThreatAssessment] Initialized');
    }

    function registerAgent(agent) {
        aiAgents.push({
            id: aiAgents.length,
            agent: agent,
            memory: {
                lastKnownPos: null,
                lastSeenTime: 0,
                suspicionMap: {},
                noiseHistory: []
            },
            state: 'search'
        });
    }

    function updatePlayerSighting(position, agentId) {
        var timestamp = Date.now();

        globalMemory.lastKnownPlayerPos = position.clone();
        globalMemory.lastSeenTime = timestamp;

        addSuspectedPosition(position);

        for (var i = 0; i < aiAgents.length; i++) {
            var aiAgent = aiAgents[i];

            aiAgent.memory.lastKnownPos = position.clone();
            aiAgent.memory.lastSeenTime = timestamp;

            if (agentId !== undefined && aiAgent.id === agentId) {
                aiAgent.state = 'chase';
            } else if (aiAgent.state !== 'chase') {
                aiAgent.state = 'investigate';
            }
        }
    }

    function addSuspectedPosition(position) {
        globalMemory.suspectedPositions.unshift({
            position: position.clone(),
            timestamp: Date.now(),
            confidence: 1.0
        });

        if (globalMemory.suspectedPositions.length > config.maxSuspectedPositions) {
            globalMemory.suspectedPositions.pop();
        }
    }

    function addNoiseSource(position, intensity, sourceType) {
        globalMemory.noiseSources.push({
            position: position.clone(),
            intensity: intensity,
            type: sourceType,
            timestamp: Date.now()
        });

        for (var i = 0; i < aiAgents.length; i++) {
            aiAgents[i].memory.noiseHistory.push({
                position: position.clone(),
                intensity: intensity,
                timestamp: Date.now()
            });

            if (aiAgents[i].memory.noiseHistory.length > 20) {
                aiAgents[i].memory.noiseHistory.shift();
            }
        }
    }

    function update(deltaTime) {
        var currentTime = Date.now();

        updateGlobalMemory(currentTime, deltaTime);
        updateAgentMemories(currentTime, deltaTime);
        calculateThreatLevels();
    }

    function updateGlobalMemory(currentTime, deltaTime) {
        if (globalMemory.lastKnownPlayerPos) {
            var timeSinceSighting = currentTime - globalMemory.lastSeenTime;

            if (timeSinceSighting > config.memoryDuration) {
                globalMemory.lastKnownPlayerPos = null;
            }
        }

        for (var i = globalMemory.suspectedPositions.length - 1; i >= 0; i--) {
            var suspected = globalMemory.suspectedPositions[i];
            suspected.confidence -= config.suspicionDecay * deltaTime;

            if (suspected.confidence <= 0) {
                globalMemory.suspectedPositions.splice(i, 1);
            }
        }

        for (var j = globalMemory.noiseSources.length - 1; j >= 0; j--) {
            var noise = globalMemory.noiseSources[j];
            noise.intensity -= config.noiseDecay * deltaTime;

            if (noise.intensity <= 0) {
                globalMemory.noiseSources.splice(j, 1);
            }
        }
    }

    function updateAgentMemories(currentTime, deltaTime) {
        for (var i = 0; i < aiAgents.length; i++) {
            var agentMemory = aiAgents[i].memory;

            if (agentMemory.lastKnownPos) {
                var timeSinceSighting = currentTime - agentMemory.lastSeenTime;

                if (timeSinceSighting > config.memoryDuration) {
                    agentMemory.lastKnownPos = null;
                    aiAgents[i].state = 'search';
                }
            }

            for (var j = agentMemory.noiseHistory.length - 1; j >= 0; j--) {
                var noise = agentMemory.noiseHistory[j];
                noise.intensity -= config.noiseDecay * deltaTime;

                if (noise.intensity <= 0) {
                    agentMemory.noiseHistory.splice(j, 1);
                }
            }
        }
    }

    function calculateThreatLevels() {
        for (var i = 0; i < aiAgents.length; i++) {
            var agent = aiAgents[i];
            var threatLevel = 0;

            if (agent.memory.lastKnownPos) {
                threatLevel += 0.5;
            }

            if (globalMemory.suspectedPositions.length > 0) {
                threatLevel += 0.3;
            }

            if (globalMemory.noiseSources.length > 0) {
                threatLevel += 0.2;
            }

            agent.threatLevel = Math.min(1.0, threatLevel);
        }
    }

    function getInvestigationTarget(agent) {
        if (globalMemory.lastKnownPlayerPos) {
            return globalMemory.lastKnownPlayerPos;
        }

        if (globalMemory.suspectedPositions.length > 0) {
            var best = null;
            var bestConfidence = 0;

            for (var i = 0; i < globalMemory.suspectedPositions.length; i++) {
                var suspected = globalMemory.suspectedPositions[i];
                if (suspected.confidence > bestConfidence) {
                    bestConfidence = suspected.confidence;
                    best = suspected.position;
                }
            }

            return best;
        }

        if (globalMemory.noiseSources.length > 0) {
            var loudest = null;
            var loudestIntensity = 0;

            for (var j = 0; j < globalMemory.noiseSources.length; j++) {
                var noise = globalMemory.noiseSources[j];
                if (noise.intensity > loudestIntensity) {
                    loudestIntensity = noise.intensity;
                    loudest = noise.position;
                }
            }

            return loudest;
        }

        return null;
    }

    function canAgentCommunicate(agent1, agent2) {
        if (!agent1.agent || !agent2.agent) return false;

        var dist = agent1.agent.position.distanceTo(agent2.agent.position);
        return dist < config.communicationRange;
    }

    function broadcastToNearby(sourceAgent, message) {
        var recipients = [];

        for (var i = 0; i < aiAgents.length; i++) {
            if (aiAgents[i].agent !== sourceAgent) {
                if (canAgentCommunicate(sourceAgent, aiAgents[i].agent)) {
                    recipients.push(aiAgents[i]);
                    applyMessageToAgent(aiAgents[i], message);
                }
            }
        }

        return recipients;
    }

    function applyMessageToAgent(agent, message) {
        if (message.type === 'player_sighted') {
            agent.memory.lastKnownPos = message.position.clone();
            agent.memory.lastSeenTime = Date.now();
            agent.state = 'investigate';
        } else if (message.type === 'noise_heard') {
            agent.memory.noiseHistory.push({
                position: message.position.clone(),
                intensity: message.intensity,
                timestamp: Date.now()
            });
        }
    }

    function getAgentState(agent) {
        for (var i = 0; i < aiAgents.length; i++) {
            if (aiAgents[i].agent === agent) {
                return aiAgents[i].state;
            }
        }
        return 'search';
    }

    function setAgentState(agent, state) {
        for (var i = 0; i < aiAgents.length; i++) {
            if (aiAgents[i].agent === agent) {
                aiAgents[i].state = state;
                return;
            }
        }
    }

    function getGlobalMemory() {
        return globalMemory;
    }

    function clear() {
        globalMemory = {
            lastKnownPlayerPos: null,
            lastSeenTime: 0,
            suspectedPositions: [],
            noiseSources: [],
            huntedAreas: []
        };
        aiAgents = [];
    }

    return {
        init: init,
        registerAgent: registerAgent,
        updatePlayerSighting: updatePlayerSighting,
        addSuspectedPosition: addSuspectedPosition,
        addNoiseSource: addNoiseSource,
        update: update,
        getInvestigationTarget: getInvestigationTarget,
        broadcastToNearby: broadcastToNearby,
        getAgentState: getAgentState,
        setAgentState: setAgentState,
        getGlobalMemory: getGlobalMemory,
        clear: clear,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.ThreatAssessment = ThreatAssessment;
}
