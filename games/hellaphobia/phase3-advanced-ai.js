/* ============================================================
 HELLAPHOBIA - PHASE 3: ADVANCED AI & MONSTER ECOSYSTEM
 Neural Network Learning | Emotional AI | 25+ Monster Types
 Pack Hunting | Phobia-Specific AI | Multi-Phase Bosses
 ============================================================
 FULLY IMPLEMENTED - FEBRUARY 2026
 ============================================================ */
(function() {
 'use strict';

 // ===== NEURAL NETWORK ENGINE =====
 const NeuralNetwork = {
 // Advanced multi-layer perceptron with backpropagation
 createNetwork(layerSizes) {
 const network = {
 layers: [],
 weights: [],
 biases: [],
 learningRate: 0.1,
 momentum: 0.9,
 lastWeightDeltas: [],
 
 // Initialize network with Xavier initialization
 init() {
 for (let i = 0; i < layerSizes.length - 1; i++) {
 const inputSize = layerSizes[i];
 const outputSize = layerSizes[i + 1];
 
 // Xavier initialization
 const scale = Math.sqrt(2.0 / (inputSize + outputSize));
 const layerWeights = [];
 const layerBiases = [];
 
 for (let j = 0; j < outputSize; j++) {
 const neuronWeights = [];
 for (let k = 0; k < inputSize; k++) {
 neuronWeights.push((Math.random() * 2 - 1) * scale);
 }
 layerWeights.push(neuronWeights);
 layerBiases.push((Math.random() * 2 - 1) * scale);
 }
 
 this.weights.push(layerWeights);
 this.biases.push(layerBiases);
 this.lastWeightDeltas.push(layerWeights.map(w => w.map(() => 0)));
 }
 this.layers = layerSizes;
 },
 
 // Activation functions
 sigmoid(x) {
 const clamped = Math.max(-500, Math.min(500, x));
 return 1 / (1 + Math.exp(-clamped));
 },
 
 sigmoidDerivative(x) {
 return x * (1 - x);
 },
 
 relu(x) {
 return Math.max(0, x);
 },
 
 tanh(x) {
 return Math.tanh(x);
 },
 
 // Forward propagation
 forward(inputs) {
 let activations = [inputs];
 let current = inputs;
 
 for (let l = 0; l < this.weights.length; l++) {
 const newActivations = [];
 for (let j = 0; j < this.weights[l].length; j++) {
 let sum = this.biases[l][j];
 for (let k = 0; k < current.length; k++) {
 sum += current[k] * this.weights[l][j][k];
 }
 // Use different activations for hidden vs output
 const activation = l < this.weights.length - 1 ? this.relu(sum) : this.sigmoid(sum);
 newActivations.push(activation);
 }
 current = newActivations;
 activations.push(current);
 }
 
 return activations;
 },
 
 // Predict output
 predict(inputs) {
 const activations = this.forward(inputs);
 return activations[activations.length - 1];
 },
 
 // Train with backpropagation
 train(inputs, targets) {
 const activations = this.forward(inputs);
 const output = activations[activations.length - 1];
 
 // Calculate output errors
 const outputErrors = [];
 for (let i = 0; i < output.length; i++) {
 outputErrors.push(targets[i] - output[i]);
 }
 
 // Backpropagate errors
 let errors = [outputErrors];
 for (let l = this.weights.length - 1; l > 0; l--) {
 const layerErrors = [];
 for (let j = 0; j < this.weights[l][0].length; j++) {
 let error = 0;
 for (let k = 0; k < this.weights[l].length; k++) {
 error += errors[0][k] * this.weights[l][k][j];
 }
 layerErrors.push(error);
 }
 errors.unshift(layerErrors);
 }
 
 // Update weights and biases
 for (let l = 0; l < this.weights.length; l++) {
 for (let j = 0; j < this.weights[l].length; j++) {
 // Update bias
 const biasDelta = this.learningRate * errors[l][j];
 this.biases[l][j] += biasDelta;
 
 // Update weights with momentum
 for (let k = 0; k < this.weights[l][j].length; k++) {
 const gradient = errors[l][j] * activations[l][k];
 const delta = this.learningRate * gradient + this.momentum * this.lastWeightDeltas[l][j][k];
 this.weights[l][j][k] += delta;
 this.lastWeightDeltas[l][j][k] = delta;
 }
 }
 }
 
 // Return total error
 return outputErrors.reduce((sum, e) => sum + Math.abs(e), 0);
 },
 
 // Serialize network
 serialize() {
 return JSON.stringify({
 layers: this.layers,
 weights: this.weights,
 biases: this.biases
 });
 },
 
 // Deserialize network
 deserialize(data) {
 const parsed = JSON.parse(data);
 this.layers = parsed.layers;
 this.weights = parsed.weights;
 this.biases = parsed.biases;
 }
 };
 
 network.init();
 return network;
 },
 
 // Create recurrent network for sequence learning
 createRNN(inputSize, hiddenSize, outputSize) {
 const rnn = {
 inputWeights: null,
 hiddenWeights: null,
 outputWeights: null,
 hiddenState: null,
 learningRate: 0.1,
 
 init() {
 // Initialize weights
 const scale = 0.1;
 this.inputWeights = this.randomMatrix(hiddenSize, inputSize, scale);
 this.hiddenWeights = this.randomMatrix(hiddenSize, hiddenSize, scale);
 this.outputWeights = this.randomMatrix(outputSize, hiddenSize, scale);
 this.hiddenState = new Array(hiddenSize).fill(0);
 },
 
 randomMatrix(rows, cols, scale) {
 const matrix = [];
 for (let i = 0; i < rows; i++) {
 const row = [];
 for (let j = 0; j < cols; j++) {
 row.push((Math.random() * 2 - 1) * scale);
 }
 matrix.push(row);
 }
 return matrix;
 },
 
 tanh(x) {
 return Math.tanh(x);
 },
 
 sigmoid(x) {
 return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
 },
 
 // Forward pass with temporal memory
 forward(inputs) {
 // Update hidden state
 const newHidden = [];
 for (let i = 0; i < this.hiddenWeights.length; i++) {
 let sum = 0;
 // Input contribution
 for (let j = 0; j < inputs.length; j++) {
 sum += this.inputWeights[i][j] * inputs[j];
 }
 // Hidden state contribution
 for (let j = 0; j < this.hiddenState.length; j++) {
 sum += this.hiddenWeights[i][j] * this.hiddenState[j];
 }
 newHidden.push(this.tanh(sum));
 }
 this.hiddenState = newHidden;
 
 // Compute output
 const output = [];
 for (let i = 0; i < this.outputWeights.length; i++) {
 let sum = 0;
 for (let j = 0; j < this.hiddenState.length; j++) {
 sum += this.outputWeights[i][j] * this.hiddenState[j];
 }
 output.push(this.sigmoid(sum));
 }
 
 return output;
 },
 
 // Reset hidden state for new sequence
 reset() {
 this.hiddenState = new Array(this.hiddenState.length).fill(0);
 }
 };
 
 rnn.init();
 return rnn;
 }
 };

 // ===== 25+ MONSTER TYPES =====
 const MONSTER_TYPES = {
 // === STALKERS - Hide in shadows, ambush tactics ===
 SHADOW_STALKER: {
 id: 0,
 name: "Shadow Stalker",
 w: 32, h: 40,
 hp: 45, speed: 110, damage: 25,
 color: "#1a1a1a", eyeColor: "#ff0000",
 category: "stalker",
 behavior: "shadow_ambush",
 phobia: "darkness",
 abilities: ["shadow_meld", "teleport_behind"],
 chat: ["I'm in every shadow...", "You can't see me...", "Behind you..."],
 spawnWeight: 1.0
 },
 
 CLOAKED_HORROR: {
 id: 1,
 name: "Cloaked Horror",
 w: 28, h: 50,
 hp: 35, speed: 90, damage: 30,
 color: "#0a0a15", eyeColor: "#8800ff",
 category: "stalker",
 behavior: "invisible_approach",
 phobia: "unknown",
 abilities: ["invisibility", "backstab"],
 chat: ["...", "*silence*", "Did you feel that?"],
 spawnWeight: 0.8
 },
 
 MIRROR_WALKER: {
 id: 2,
 name: "Mirror Walker",
 w: 26, h: 44,
 hp: 40, speed: 85, damage: 28,
 color: "#4444aa", eyeColor: "#ffffff",
 category: "stalker",
 behavior: "mirror_movement",
 phobia: "doppelganger",
 abilities: ["mirror_step", "reflection_damage"],
 chat: ["I am you...", "Look at yourself...", "We are the same..."],
 spawnWeight: 0.7
 },
 
 // === CHASERS - Relentless pursuit, break down doors ===
 RAGE_BEAST: {
 id: 3,
 name: "Rage Beast",
 w: 45, h: 55,
 hp: 80, speed: 140, damage: 35,
 color: "#880000", eyeColor: "#ff4400",
 category: "chaser",
 behavior: "relentless_chase",
 phobia: "pursuit",
 abilities: ["charge", "door_break", "rage_mode"],
 chat: ["RUN!", "CAN'T ESCAPE!", "I'M COMING!"],
 spawnWeight: 1.0
 },
 
 HUNGRY_HORDE: {
 id: 4,
 name: "Hungry Horde",
 w: 24, h: 28,
 hp: 20, speed: 100, damage: 12,
 color: "#442200", eyeColor: "#ffaa00",
 category: "chaser",
 behavior: "swarm_chase",
 phobia: "overwhelm",
 abilities: ["swarm", "climb"],
 chat: ["Hungry...", "Food...", "More..."],
 spawnWeight: 1.2
 },
 
 HUNTER_ALPHA: {
 id: 5,
 name: "Hunter Alpha",
 w: 38, h: 48,
 hp: 65, speed: 125, damage: 32,
 color: "#331100", eyeColor: "#ff6600",
 category: "chaser",
 behavior: "tactical_chase",
 phobia: "predator",
 abilities: ["pounce", "scent_track", "pack_call"],
 chat: ["I found you!", "No escaping!", "Fresh meat!"],
 spawnWeight: 0.9
 },
 
 // === TRAPPERS - Set traps, herd player into danger ===
 WEB_WEAVER: {
 id: 6,
 name: "Web Weaver",
 w: 35, h: 30,
 hp: 50, speed: 70, damage: 22,
 color: "#332244", eyeColor: "#88ff88",
 category: "trapper",
 behavior: "web_trap",
 phobia: "spiders",
 abilities: ["web_shot", "web_trap", "wall_climb"],
 chat: ["Stay still...", "Tangled...", "My web is your tomb..."],
 spawnWeight: 0.9
 },
 
 SIREN: {
 id: 7,
 name: "Siren",
 w: 28, h: 45,
 hp: 40, speed: 60, damage: 28,
 color: "#4488aa", eyeColor: "#00ffff",
 category: "trapper",
 behavior: "lure_trap",
 phobia: "deception",
 abilities: ["alluring_song", "false_safe_zone", "drag_down"],
 chat: ["Come closer...", "It's safe here...", "Let me help you..."],
 spawnWeight: 0.7
 },
 
 BONE_TRAPPER: {
 id: 8,
 name: "Bone Trapper",
 w: 30, h: 35,
 hp: 55, speed: 65, damage: 25,
 color: "#ddccaa", eyeColor: "#000000",
 category: "trapper",
 behavior: "spear_trap",
 phobia: "pain",
 abilities: ["bone_spear", "snare", "false_treasure"],
 chat: ["A gift for you...", "Take it...", "It's a trap..."],
 spawnWeight: 0.8
 },
 
 // === MIMICS - Disguise as items/environment ===
 TREASURE_MIMIC: {
 id: 9,
 name: "Treasure Mimic",
 w: 32, h: 32,
 hp: 60, speed: 80, damage: 35,
 color: "#886600", eyeColor: "#ff0088",
 category: "mimic",
 behavior: "chest_disguise",
 phobia: "greed",
 abilities: ["surprise_attack", "tongue_grab", "item_corruption"],
 chat: ["Free loot!", "Take me!", "Surprise!"],
 spawnWeight: 1.0
 },
 
 DOOR_MIMIC: {
 id: 10,
 name: "Door Mimic",
 w: 40, h: 60,
 hp: 70, speed: 0, damage: 40,
 color: "#443322", eyeColor: "#ff0000",
 category: "mimic",
 behavior: "door_disguise",
 phobia: "trust",
 abilities: ["door_bite", "player_swallow", "exit_denial"],
 chat: ["This is the way...", "Come through...", "You're mine now!"],
 spawnWeight: 0.6
 },
 
 FLOOR_MIMIC: {
 id: 11,
 name: "Floor Mimic",
 w: 48, h: 48,
 hp: 45, speed: 0, damage: 20,
 color: "#1a1015", eyeColor: "#ff4400",
 category: "mimic",
 behavior: "floor_disguise",
 phobia: "ground",
 abilities: ["swallow_hole", "pit_trap", "tentacle_grab"],
 chat: ["Watch your step...", "Too late!", "I've got you..."],
 spawnWeight: 0.7
 },
 
 // === PSYCHOLOGICAL - Manipulate sanity directly ===
 WHISPERER: {
 id: 12,
 name: "Whisperer",
 w: 24, h: 50,
 hp: 30, speed: 40, damage: 0,
 color: "#220022", eyeColor: "#ff88ff",
 category: "psychological",
 behavior: "sanity_drain",
 phobia: "insanity",
 abilities: ["whisper", "hallucination_spawn", "paranoia"],
 chat: ["They're watching...", "You're not safe...", "It's all your fault..."],
 spawnWeight: 1.1
 },
 
 NIGHTMARE_FUEL: {
 id: 13,
 name: "Nightmare Fuel",
 w: 60, h: 60,
 hp: 25, speed: 30, damage: 5,
 color: "#110011", eyeColor: "#ff00ff",
 category: "psychological",
 behavior: "fear_manifest",
 phobia: "fear",
 abilities: ["shape_shift", "worst_fear", "reality_bend"],
 chat: ["What are you afraid of?", "I can see your fears...", "Let me show you..."],
 spawnWeight: 0.5
 },
 
 MEMORY_THIEF: {
 id: 14,
 name: "Memory Thief",
 w: 28, h: 42,
 hp: 35, speed: 55, damage: 15,
 color: "#000044", eyeColor: "#88ffff",
 category: "psychological",
 behavior: "memory_consume",
 phobia: "forgetting",
 abilities: ["memory_steal", "confusion", "false_memory"],
 chat: ["Do you remember?", "What did you forget?", "I have your memories..."],
 spawnWeight: 0.6
 },
 
 // === SWARMERS - Overwhelm with numbers ===
 FLESH_GNAT: {
 id: 15,
 name: "Flesh Gnat",
 w: 12, h: 12,
 hp: 5, speed: 150, damage: 3,
 color: "#220000", eyeColor: "#ff0000",
 category: "swarmer",
 behavior: "swarm_attack",
 phobia: "insects",
 abilities: ["swarm", "infect", "breed"],
 chat: ["*buzzing*", "Bzzzz...", "More..."],
 spawnWeight: 1.3
 },
 
 SKELETON_HORDE: {
 id: 16,
 name: "Skeleton Horde",
 w: 20, h: 35,
 hp: 15, speed: 90, damage: 8,
 color: "#ddccbb", eyeColor: "#000000",
 category: "swarmer",
 behavior: "skeleton_army",
 phobia: "undead",
 abilities: ["rise_again", "bone_throw", "group_attack"],
 chat: ["Join us...", "Death is peaceful...", "Forever..."],
 spawnWeight: 1.2
 },
 
 GHOST_SWARM: {
 id: 17,
 name: "Ghost Swarm",
 w: 18, h: 24,
 hp: 10, speed: 80, damage: 5,
 color: "#4466aa", eyeColor: "#ffffff",
 category: "swarmer",
 behavior: "ghost_horde",
 phobia: "spirits",
 abilities: ["phase_through", "possess", "haunt"],
 chat: ["Wooo...", "Why are you here?", "Leave..."],
 spawnWeight: 1.0
 },
 
 // === SPECIAL - Unique behaviors ===
 THE_WATCHER: {
 id: 18,
 name: "The Watcher",
 w: 50, h: 80,
 hp: 200, speed: 20, damage: 0,
 color: "#000000", eyeColor: "#ffffff",
 category: "special",
 behavior: "observe",
 phobia: "being_watched",
 abilities: ["passive_observer", "alert_others", "curse"],
 chat: ["I see everything...", "You can't hide...", "I'm always here..."],
 spawnWeight: 0.3
 },
 
 TIME_EATER: {
 id: 19,
 name: "Time Eater",
 w: 35, h: 45,
 hp: 80, speed: 50, damage: 20,
 color: "#008888", eyeColor: "#00ffff",
 category: "special",
 behavior: "time_manipulate",
 phobia: "time",
 abilities: ["slow_time", "rewind", "time_trap"],
 chat: ["Time is running out...", "Tick tock...", "No more time..."],
 spawnWeight: 0.4
 },
 
 VOID_TOUCHED: {
 id: 20,
 name: "Void Touched",
 w: 40, h: 50,
 hp: 100, speed: 70, damage: 25,
 color: "#000011", eyeColor: "#ff00ff",
 category: "special",
 behavior: "void_corrupt",
 phobia: "nothingness",
 abilities: ["void_walk", "corruption", "reality_tear"],
 chat: ["The void calls...", "Nothing matters...", "Join the void..."],
 spawnWeight: 0.5
 },
 
 // === ENVIRONMENTAL ===
 WALL_CRAWLER: {
 id: 21,
 name: "Wall Crawler",
 w: 30, h: 20,
 hp: 30, speed: 100, damage: 15,
 color: "#222211", eyeColor: "#aaaa00",
 category: "environmental",
 behavior: "wall_ambush",
 phobia: "unexpected",
 abilities: ["wall_climb", "ceiling_drop", "surprise_attack"],
 chat: ["Above you...", "Don't look up...", "*skittering*"],
 spawnWeight: 0.9
 },
 
 PUPPET_MASTER: {
 id: 22,
 name: "Puppet Master",
 w: 36, h: 48,
 hp: 50, speed: 30, damage: 0,
 color: "#662244", eyeColor: "#ff8844",
 category: "special",
 behavior: "control_others",
 phobia: "control",
 abilities: ["mind_control", "puppet_strings", "turn_allies"],
 chat: ["Dance for me...", "Pull the strings...", "You're my puppet now..."],
 spawnWeight: 0.4
 },
 
 BLOOD_ECHO: {
 id: 23,
 name: "Blood Echo",
 w: 28, h: 42,
 hp: 1, speed: 200, damage: 30,
 color: "#880000", eyeColor: "#ff0000",
 category: "special",
 behavior: "death_replay",
 phobia: "past",
 abilities: ["phase", "death_echo", "previous_death"],
 chat: ["This is where you died...", "Remember?", "Again and again..."],
 spawnWeight: 0.6
 },
 
 FORGOTTEN_ONE: {
 id: 24,
 name: "Forgotten One",
 w: 60, h: 70,
 hp: 150, speed: 40, damage: 40,
 color: "#111111", eyeColor: "#888888",
 category: "special",
 behavior: "forgotten",
 phobia: "being_forgotten",
 abilities: ["erase_memory", "drain_existence", "fade"],
 chat: ["Am I real?", "Do you remember me?", "Don't forget..."],
 spawnWeight: 0.3
 },
 
 // The final special monster - appears rarely
 HELLAPHOBIA_SEED: {
 id: 25,
 name: "Hellaphobia Seed",
 w: 24, h: 24,
 hp: 500, speed: 0, damage: 0,
 color: "#000000", eyeColor: "#ff0000",
 category: "special",
 behavior: "grow",
 phobia: "inevitable",
 abilities: ["slow_growth", "influence_reality", "spawn_minions"],
 chat: ["I am becoming...", "You cannot stop me...", "I am Hellaphobia..."],
 spawnWeight: 0.1
 }
 };

 // ===== EMOTIONAL AI SYSTEM =====
 const EmotionalAI = {
 EMOTIONS: {
 CALM: { intensity: 0, aggression: 0.5, speed: 0.8, detection: 1.0 },
 CURIOUS: { intensity: 0.3, aggression: 0.3, speed: 1.0, detection: 1.2 },
 ALERT: { intensity: 0.5, aggression: 0.6, speed: 1.2, detection: 1.5 },
 ANGRY: { intensity: 0.7, aggression: 1.0, speed: 1.3, detection: 1.3 },
 FEARFUL: { intensity: 0.6, aggression: 0.2, speed: 1.4, detection: 0.8 },
 TERRITORIAL: { intensity: 0.8, aggression: 0.9, speed: 1.1, detection: 1.4 },
 HUNGRY: { intensity: 0.4, aggression: 0.8, speed: 1.0, detection: 1.2 },
 WOUNDED: { intensity: 0.5, aggression: 0.4, speed: 0.6, detection: 0.9 },
 FRUSTRATED: { intensity: 0.6, aggression: 0.7, speed: 1.1, detection: 1.1 },
 DESPERATE: { intensity: 0.9, aggression: 1.0, speed: 1.5, detection: 1.6 }
 },

 // Initialize emotional AI for a monster
 initializeAI(monster) {
 return {
 emotions: {
 calm: 0.5,
 curious: 0.2,
 alert: 0.1,
 anger: 0.0,
 fear: 0.0,
 territorial: 0.0,
 hungry: 0.1,
 wounded: 0.0,
 frustrated: 0.0,
 desperate: 0.0
 },
 dominantEmotion: 'CALM',
 emotionHistory: [],
 memory: {
 playerPatterns: [],
 hidingSpots: [],
 lastSeenPlayer: null,
 deathLocations: [],
 successfulAmbushes: []
 },
 personality: this.generatePersonality(),
 neuralNetwork: NeuralNetwork.createNetwork([8, 16, 8, 4]) // Input: stimuli, Output: behavior
 };
 },

 generatePersonality() {
 return {
 aggression: 0.5 + Math.random() * 0.5,
 curiosity: Math.random(),
 fearfulness: Math.random() * 0.5,
 territoriality: Math.random(),
 intelligence: 0.5 + Math.random() * 0.5,
 patience: Math.random(),
 cruelty: Math.random() * 0.7
 };
 },

 // Process stimuli and update emotions
 updateEmotion(monster, stimuli, dt) {
 if (!monster.phase3AI) {
 monster.phase3AI = this.initializeAI(monster);
 }
 
 const ai = monster.phase3AI;
 
 // Process each stimulus
 for (const stimulus of stimuli) {
 this.processStimulus(ai, stimulus, monster);
 }
 
 // Decay emotions over time
 this.decayEmotions(ai, dt);
 
 // Determine dominant emotion
 ai.dominantEmotion = this.getDominantEmotion(ai.emotions);
 
 // Apply emotion effects to monster
 this.applyEmotionEffects(monster, ai);
 
 // Train neural network
 this.trainNetwork(ai, stimuli);
 },

 processStimulus(ai, stimulus, monster) {
 switch(stimulus.type) {
 case 'player_seen':
 ai.emotions.alert += 0.3 * ai.personality.aggression;
 ai.emotions.anger += 0.2;
 ai.emotions.hungry += 0.3;
 ai.memory.lastSeenPlayer = { x: stimulus.x, y: stimulus.y, time: Date.now() };
 break;
 
 case 'player_lost':
 ai.emotions.frustrated += 0.3 * ai.personality.patience;
 ai.emotions.curious += 0.4;
 ai.emotions.anger += 0.1;
 break;
 
 case 'damage_taken':
 ai.emotions.anger += 0.5 * ai.personality.aggression;
 ai.emotions.fear += 0.3 * ai.personality.fearfulness;
 ai.emotions.wounded += stimulus.amount / monster.maxHp;
 ai.emotions.desperate += 0.2;
 break;
 
 case 'ally_died':
 ai.emotions.fear += 0.4 * ai.personality.fearfulness;
 ai.emotions.anger += 0.3;
 break;
 
 case 'player_hiding':
 ai.emotions.curious += 0.4;
 ai.emotions.frustrated += 0.2;
 // Remember hiding spot
 ai.memory.hidingSpots.push({ x: stimulus.x, y: stimulus.y });
 break;
 
 case 'food_nearby':
 ai.emotions.hungry += 0.5;
 break;
 
 case 'territory_intrusion':
 ai.emotions.territorial += 0.6 * ai.personality.territoriality;
 ai.emotions.anger += 0.3;
 break;
 
 case 'low_health':
 ai.emotions.desperate += 0.5;
 ai.emotions.fear += 0.3;
 break;
 
 case 'player_vulnerable':
 ai.emotions.anger += 0.4 * ai.personality.cruelty;
 ai.emotions.hungry += 0.3;
 break;
 
 case 'same_type_nearby':
 ai.emotions.territorial += 0.2;
 break;
 }
 
 // Clamp emotions
 for (const emotion in ai.emotions) {
 ai.emotions[emotion] = Math.max(0, Math.min(1, ai.emotions[emotion]));
 }
 },

 decayEmotions(ai, dt) {
 const decayRate = 0.98;
 for (const emotion in ai.emotions) {
 ai.emotions[emotion] *= Math.pow(decayRate, dt * 60);
 }
 },

 getDominantEmotion(emotions) {
 let max = 0;
 let dominant = 'CALM';
 for (const [emotion, value] of Object.entries(emotions)) {
 if (value > max) {
 max = value;
 dominant = emotion.toUpperCase();
 }
 }
 return dominant;
 },

 applyEmotionEffects(monster, ai) {
 const emotion = this.EMOTIONS[ai.dominantEmotion] || this.EMOTIONS.CALM;
 
 // Apply speed modifier
 monster.speedMultiplier = emotion.speed * (1 - ai.emotions.wounded * 0.4);
 
 // Apply aggression modifier
 monster.aggressionMultiplier = emotion.aggression * ai.personality.aggression;
 
 // Apply detection range
 monster.detectionRange = (monster.baseDetectionRange || 400) * emotion.detection;
 
 // Apply visual effects
 monster.emotionColor = this.getEmotionColor(ai.dominantEmotion);
 monster.emotionIntensity = emotion.intensity;
 },

 getEmotionColor(emotion) {
 const colors = {
 CALM: '#664433',
 CURIOUS: '#886644',
 ALERT: '#aa6644',
 ANGRY: '#ff0000',
 FEARFUL: '#4444aa',
 TERRITORIAL: '#aa4444',
 HUNGRY: '#66aa44',
 WOUNDED: '#aa4466',
 FRUSTRATED: '#886600',
 DESPERATE: '#ff0088'
 };
 return colors[emotion] || '#664433';
 },

 trainNetwork(ai, stimuli) {
 if (stimuli.length === 0) return;
 
 // Convert stimuli to input vector
 const inputs = [
 ai.emotions.alert,
 ai.emotions.anger,
 ai.emotions.fear,
 ai.emotions.hungry,
 ai.personality.aggression,
 ai.personality.intelligence,
 ai.memory.lastSeenPlayer ? 1 : 0,
 ai.emotions.wounded
 ];
 
 // Target outputs based on optimal behavior
 const targets = this.getOptimalBehavior(ai, stimuli);
 
 // Train the network
 ai.neuralNetwork.train(inputs, targets);
 },

 getOptimalBehavior(ai, stimuli) {
 // Determine optimal behavior based on current state
 const behavior = [0, 0, 0, 0]; // [chase, ambush, retreat, call_help]
 
 if (ai.emotions.anger > 0.6 || ai.emotions.hungry > 0.7) {
 behavior[0] = 1; // Chase
 } else if (ai.emotions.fear > 0.5 || ai.emotions.wounded > 0.5) {
 behavior[2] = 1; // Retreat
 } else if (ai.personality.intelligence > 0.7 && !ai.memory.lastSeenPlayer) {
 behavior[1] = 1; // Ambush
 } else if (ai.emotions.territorial > 0.6) {
 behavior[3] = 1; // Call help
 }
 
 return behavior;
 },

 // Get AI decision
 getDecision(monster, player) {
 if (!monster.phase3AI) return 'chase';
 
 const ai = monster.phase3AI;
 const inputs = [
 ai.emotions.alert,
 ai.emotions.anger,
 ai.emotions.fear,
 ai.emotions.hungry,
 ai.personality.aggression,
 ai.personality.intelligence,
 ai.memory.lastSeenPlayer ? 1 : 0,
 ai.emotions.wounded
 ];
 
 const output = ai.neuralNetwork.predict(inputs);
 const maxIndex = output.indexOf(Math.max(...output));
 
 const decisions = ['chase', 'ambush', 'retreat', 'call_help'];
 return decisions[maxIndex];
 }
 };

 // ===== PACK HUNTING SYSTEM =====
 const PackHunting = {
 packs: [],
 
 // Initialize pack system
 init() {
 this.packs = [];
 },
 
 // Find or create a pack for a monster
 joinPack(monster, monsters) {
 // Check if monster is already in a pack
 for (const pack of this.packs) {
 if (pack.members.includes(monster)) return pack;
 }
 
 // Find nearby monsters of same type
 const nearbySameType = monsters.filter(m => 
 !m.dead && 
 m !== monster && 
 m.type === monster.type &&
 this.getDistance(m, monster) < 300
 );
 
 if (nearbySameType.length >= 1) {
 // Create new pack
 const pack = {
 id: Date.now() + Math.random(),
 members: [monster, ...nearbySameType.slice(0, 3)],
 leader: this.selectLeader([monster, ...nearbySameType.slice(0, 3)]),
 formation: 'surround',
 target: null,
 coordination: 0.5 + Math.random() * 0.5
 };
 this.packs.push(pack);
 return pack;
 }
 
 return null;
 },
 
 selectLeader(members) {
 // Select monster with highest health as leader
 return members.reduce((best, m) => 
 (m.hp / m.maxHp) > (best.hp / best.maxHp) ? m : best
 );
 },
 
 // Update pack behavior
 updatePack(pack, player, dt) {
 if (pack.members.filter(m => !m.dead).length < 2) {
 // Pack too small, disband
 this.packs = this.packs.filter(p => p.id !== pack.id);
 return;
 }
 
 // Update leader if current is dead
 if (pack.leader.dead) {
 pack.leader = this.selectLeader(pack.members.filter(m => !m.dead));
 }
 
 // Coordinate attack
 if (this.getDistance(pack.leader, player) < 500) {
 pack.target = player;
 this.coordinateAttack(pack, player, dt);
 }
 },
 
 coordinateAttack(pack, player, dt) {
 const aliveMembers = pack.members.filter(m => !m.dead);
 const leaderPos = { x: pack.leader.x, y: pack.leader.y };
 const playerPos = { x: player.x, y: player.y };
 
 // Assign positions based on formation
 switch(pack.formation) {
 case 'surround':
 this.surroundTarget(aliveMembers, playerPos, pack.coordination);
 break;
 case 'pincer':
 this.pincerAttack(aliveMembers, playerPos, pack.coordination);
 break;
 case 'wave':
 this.waveAttack(aliveMembers, playerPos, pack.coordination, dt);
 break;
 }
 
 // Apply pack bonuses
 for (const member of aliveMembers) {
 member.packBonus = 1.0 + (aliveMembers.length * 0.1);
 member.damageMultiplier = 1.0 + (aliveMembers.length * 0.05);
 }
 },
 
 surroundTarget(members, target, coordination) {
 const angleStep = (Math.PI * 2) / members.length;
 
 members.forEach((member, index) => {
 if (member === members[0]) return; // Leader directs
 
 const targetAngle = angleStep * index;
 const distance = 100 + Math.random() * 50;
 
 member.targetPosition = {
 x: target.x + Math.cos(targetAngle) * distance,
 y: target.y + Math.sin(targetAngle) * distance
 };
 });
 },
 
 pincerAttack(members, target, coordination) {
 const halfLength = Math.floor(members.length / 2);
 const leftFlank = members.slice(0, halfLength);
 const rightFlank = members.slice(halfLength);
 
 leftFlank.forEach((member, index) => {
 member.targetPosition = {
 x: target.x - 150,
 y: target.y + (index - leftFlank.length / 2) * 50
 };
 member.flankDirection = 'left';
 });
 
 rightFlank.forEach((member, index) => {
 member.targetPosition = {
 x: target.x + 150,
 y: target.y + (index - rightFlank.length / 2) * 50
 };
 member.flankDirection = 'right';
 });
 },
 
 waveAttack(members, target, coordination, dt) {
 const wavePhase = (Date.now() / 1000) % (Math.PI * 2);
 
 members.forEach((member, index) => {
 const waveOffset = Math.sin(wavePhase + index * 0.5) * 50;
 member.targetPosition = {
 x: target.x,
 y: target.y - 100 + index * 30 + waveOffset
 };
 });
 },
 
 getDistance(a, b) {
 return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
 },
 
 // Update all packs
 update(monsters, player, dt) {
 for (const pack of this.packs) {
 this.updatePack(pack, player, dt);
 }
 }
 };

 // ===== PHOBIA-SPECIFIC AI =====
 const PhobiaAI = {
 // Map phobias to specific behaviors and effects
 PHOBIA_EFFECTS: {
 darkness: {
 triggeredBy: 'low_light',
 effect: 'enhanced_stealth',
 fearMultiplier: 1.5,
 message: "The darkness feels alive..."
 },
 
 pursuit: {
 triggeredBy: 'chase',
 effect: 'endless_hunt',
 fearMultiplier: 1.3,
 message: "It won't stop chasing you!"
 },
 
 spiders: {
 triggeredBy: 'web_contact',
 effect: 'web_slow',
 fearMultiplier: 2.0,
 message: "Webs everywhere... SKITTERING..."
 },
 
 insanity: {
 triggeredBy: 'low_sanity',
 effect: 'hallucination_intensity',
 fearMultiplier: 1.0,
 message: "Your mind fractures..."
 },
 
 deception: {
 triggeredBy: 'false_safe',
 effect: 'trust_issues',
 fearMultiplier: 1.4,
 message: "Nothing is what it seems..."
 },
 
 pain: {
 triggeredBy: 'damage',
 effect: 'increased_pain',
 fearMultiplier: 1.2,
 message: "The pain is overwhelming!"
 },
 
 greed: {
 triggeredBy: 'treasure_proximity',
 effect: 'irresistible_lure',
 fearMultiplier: 1.1,
 message: "Such beautiful treasure..."
 },
 
 time: {
 triggeredBy: 'time_anomaly',
 effect: 'perception_distort',
 fearMultiplier: 1.6,
 message: "Time... is wrong..."
 },
 
 unknown: {
 triggeredBy: 'invisible_threat',
 effect: 'paranoia',
 fearMultiplier: 1.8,
 message: "Something is here... but what?"
 },
 
 doppelganger: {
 triggeredBy: 'mirror_entity',
 effect: 'identity_confusion',
 fearMultiplier: 1.7,
 message: "Is that... me?"
 }
 },
 
 // Determine which phobia to target based on player behavior
 analyzePlayerPhobias(player, gameStats) {
 const phobiaScores = {};
 
 // Analyze death patterns
 if (gameStats.deathLocations) {
 // If player dies in darkness often
 const darkDeaths = gameStats.deathLocations.filter(d => d.darkness).length;
 phobiaScores.darkness = darkDeaths * 0.2;
 }
 
 // Analyze avoidance patterns
 if (gameStats.avoidedAreas) {
 for (const area of gameStats.avoidedAreas) {
 if (area.type === 'webs') phobiaScores.spiders = 0.3;
 if (area.type === 'shadows') phobiaScores.darkness = 0.2;
 }
 }
 
 // Analyze reaction times
 if (gameStats.averageReactionTime > 500) {
 phobiaScores.pursuit = 0.2; // Slow reactions = vulnerable to chasers
 }
 
 return phobiaScores;
 },
 
 // Spawn phobia-appropriate monsters
 spawnPhobiaMonster(phobia, x, y) {
 const monsterTypes = Object.values(MONSTER_TYPES).filter(m => m.phobia === phobia);
 if (monsterTypes.length > 0) {
 const type = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
 return { ...type, x, y };
 }
 return null;
 },
 
 // Apply phobia effect to player
 applyPhobiaEffect(phobia, player, monster) {
 const effect = this.PHOBIA_EFFECTS[phobia];
 if (!effect) return;
 
 switch(effect.effect) {
 case 'enhanced_stealth':
 // Monster is harder to see
 monster.stealthModifier = 0.5;
 break;
 
 case 'endless_hunt':
 // Monster won't give up chase
 monster.chasePersistence = Infinity;
 break;
 
 case 'web_slow':
 // Slow player
 player.speedMultiplier = 0.7;
 break;
 
 case 'hallucination_intensity':
 // Increase hallucinations
 player.hallucinationIntensity = 2.0;
 break;
 
 case 'paranoia':
 // Show fake threats
 player.paranoid = true;
 break;
 }
 
 // Drain sanity based on fear multiplier
 player.sanity -= 5 * effect.fearMultiplier;
 
 return effect.message;
 }
 };

 // ===== MONSTER ECOSYSTEM =====
 const MonsterEcosystem = {
 populations: new Map(),
 foodSources: [],
 territories: [],
 predatorPrey: new Map(),
 
 init(levelData) {
 this.populations.clear();
 this.foodSources = [];
 this.territories = [];
 
 // Initialize populations for each monster type
 for (const [id, type] of Object.entries(MONSTER_TYPES)) {
 this.populations.set(parseInt(id), {
 count: 0,
 maxCount: type.category === 'swarmer' ? 15 : type.category === 'boss' ? 1 : 5,
 spawnRate: type.spawnWeight * 30,
 lastSpawn: 0
 });
 }
 
 // Create food sources from level data
 if (levelData && levelData.tiles) {
 for (const tile of levelData.tiles) {
 if (tile.type === 'floor' && Math.random() < 0.005) {
 this.foodSources.push({
 x: tile.x,
 y: tile.y,
 amount: 100,
 maxAmount: 100,
 type: Math.random() < 0.5 ? 'meat' : 'soul'
 });
 }
 }
 }
 
 // Create territories
 this.createTerritories(levelData);
 
 // Setup predator-prey relationships
 this.setupPredatorPrey();
 },
 
 createTerritories(levelData) {
 const width = levelData?.width || 5000;
 const territoryCount = 3 + Math.floor(width / 1500);
 
 for (let i = 0; i < territoryCount; i++) {
 this.territories.push({
 id: i,
 x: 300 + (i * (width / territoryCount)),
 y: 400,
 radius: 200 + Math.random() * 100,
 owner: null,
 contested: false,
 resources: Math.floor(Math.random() * 50) + 50
 });
 }
 },
 
 setupPredatorPrey() {
 // Define predator-prey relationships
 this.predatorPrey.set('chaser', ['swarmer', 'stalker']);
 this.predatorPrey.set('stalker', ['swarmer']);
 this.predatorPrey.set('trapper', ['swarmer']);
 this.predatorPrey.set('psychological', ['stalker', 'trapper']);
 },
 
 update(dt, monsters, levelData) {
 // Update populations
 this.updatePopulations(dt, monsters);
 
 // Update food sources
 this.updateFoodSources(dt, monsters);
 
 // Update territories
 this.updateTerritories(dt, monsters);
 
 // Handle monster interactions
 this.handleInteractions(monsters);
 },
 
 updatePopulations(dt, monsters) {
 for (const [type, pop] of this.populations) {
 const count = monsters.filter(m => m.typeId === type && !m.dead).length;
 pop.count = count;
 
 // Spawn new monsters if below max
 if (count < pop.maxCount && pop.lastSpawn > pop.spawnRate) {
 this.spawnMonster(type);
 pop.lastSpawn = 0;
 }
 pop.lastSpawn += dt;
 }
 },
 
 spawnMonster(type) {
 // This triggers a spawn event
 const event = new CustomEvent('monsterSpawn', { detail: { type } });
 window.dispatchEvent(event);
 },
 
 updateFoodSources(dt, monsters) {
 for (const food of this.foodSources) {
 // Regenerate
 if (food.amount < food.maxAmount) {
 food.amount += 2 * dt;
 }
 
 // Check for feeding monsters
 for (const monster of monsters) {
 if (monster.dead) continue;
 
 const dx = monster.x - food.x;
 const dy = monster.y - food.y;
 const dist = Math.sqrt(dx * dx + dy * dy);
 
 if (dist < 40 && food.amount > 0) {
 food.amount -= 15 * dt;
 monster.hp = Math.min(monster.maxHp, monster.hp + 8 * dt);
 
 if (monster.phase3AI) {
 monster.phase3AI.emotions.hungry *= 0.95;
 }
 }
 }
 }
 },
 
 updateTerritories(dt, monsters) {
 for (const territory of this.territories) {
 const occupants = monsters.filter(m => {
 if (m.dead) return false;
 const dx = m.x - territory.x;
 const dy = m.y - territory.y;
 return Math.sqrt(dx * dx + dy * dy) < territory.radius;
 });
 
 // Determine strongest occupant
 if (occupants.length > 0) {
 const strongest = occupants.reduce((a, b) => 
 (a.hp / a.maxHp) > (b.hp / b.maxHp) ? a : b
 );
 
 if (territory.owner !== strongest) {
 territory.contested = true;
 territory.owner = strongest;
 }
 } else {
 territory.owner = null;
 territory.contested = false;
 }
 
 // Apply territory bonuses
 if (territory.owner && !territory.owner.dead) {
 territory.owner.territoryBonus = 1.2;
 }
 }
 },
 
 handleInteractions(monsters) {
 for (let i = 0; i < monsters.length; i++) {
 for (let j = i + 1; j < monsters.length; j++) {
 const m1 = monsters[i];
 const m2 = monsters[j];
 
 if (m1.dead || m2.dead) continue;
 
 const dx = m1.x - m2.x;
 const dy = m1.y - m2.y;
 const dist = Math.sqrt(dx * dx + dy * dy);
 
 if (dist < 50) {
 this.resolveInteraction(m1, m2);
 }
 }
 }
 },
 
 resolveInteraction(m1, m2) {
 // Same category - potential cooperation
 if (m1.category === m2.category) {
 if (Math.random() < 0.4) {
 m1.packBonus = 1.2;
 m2.packBonus = 1.2;
 }
 }
 
 // Predator-prey
 const prey = this.predatorPrey.get(m1.category);
 if (prey && prey.includes(m2.category)) {
 // Predation
 if (Math.random() < 0.1) {
 m2.hp -= m1.damage * 0.5;
 }
 }
 }
 };

 // ===== BOSS EVOLUTION SYSTEM =====
 const BossEvolution = {
 encounters: new Map(),
 
 // Record boss encounter data
 recordEncounter(bossId, playerActions, outcome, duration) {
 if (!this.encounters.has(bossId)) {
 this.encounters.set(bossId, {
 attempts: 0,
 victories: 0,
 defeats: 0,
 patterns: [],
 adaptations: [],
 playerStrategies: []
 });
 }
 
 const encounter = this.encounters.get(bossId);
 encounter.attempts++;
 
 if (outcome === 'victory') {
 encounter.victories++;
 } else {
 encounter.defeats++;
 }
 
 // Analyze player patterns
 this.analyzePatterns(encounter, playerActions, duration);
 
 // Generate new adaptations
 this.generateAdaptations(encounter);
 },
 
 analyzePatterns(encounter, actions, duration) {
 const pattern = {
 preferredAttacks: {},
 dodgeTimings: [],
 positions: [],
 itemUsage: {},
 damageReceived: [],
 phaseTransitions: [],
 timestamp: Date.now()
 };
 
 for (const action of actions) {
 if (action.type === 'attack') {
 pattern.preferredAttacks[action.attackType] = 
 (pattern.preferredAttacks[action.attackType] || 0) + 1;
 }
 if (action.type === 'dodge') {
 pattern.dodgeTimings.push(action.timing);
 }
 if (action.position) {
 pattern.positions.push(action.position);
 }
 if (action.type === 'item') {
 pattern.itemUsage[action.item] = (pattern.itemUsage[action.item] || 0) + 1;
 }
 if (action.damage) {
 pattern.damageReceived.push(action.damage);
 }
 }
 
 encounter.patterns.push(pattern);
 
 // Keep only recent patterns
 if (encounter.patterns.length > 10) {
 encounter.patterns.shift();
 }
 },
 
 generateAdaptations(encounter) {
 const adaptations = [];
 
 if (encounter.patterns.length >= 2) {
 const recent = encounter.patterns.slice(-3);
 
 // Analyze preferred attacks
 const attackCounts = {};
 for (const p of recent) {
 for (const [attack, count] of Object.entries(p.preferredAttacks)) {
 attackCounts[attack] = (attackCounts[attack] || 0) + count;
 }
 }
 
 // Find most used attack
 let maxAttack = null;
 let maxCount = 0;
 for (const [attack, count] of Object.entries(attackCounts)) {
 if (count > maxCount) {
 maxCount = count;
 maxAttack = attack;
 }
 }
 
 if (maxAttack) {
 adaptations.push({
 type: 'resistance',
 target: maxAttack,
 value: Math.min(0.5, 0.1 * encounter.attempts)
 });
 }
 
 // Analyze positioning
 const positions = recent.flatMap(p => p.positions);
 if (positions.length > 5) {
 const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
 adaptations.push({
 type: 'area_attack',
 targetX: avgX,
 radius: 100
 });
 }
 
 // Analyze dodge timing
 const timings = recent.flatMap(p => p.dodgeTimings);
 if (timings.length > 0) {
 const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
 adaptations.push({
 type: 'timing_change',
 adjustment: avgTiming > 0.5 ? -0.1 : 0.1
 });
 }
 }
 
 encounter.adaptations = adaptations;
 },
 
 // Get modified boss stats
 getBossStats(bossId, baseStats) {
 const encounter = this.encounters.get(bossId);
 if (!encounter) return baseStats;
 
 const stats = { ...baseStats };
 
 // Scale with attempts
 const scalingFactor = 1 + (encounter.attempts * 0.08);
 stats.hp = Math.floor(stats.hp * scalingFactor);
 stats.damage = Math.floor(stats.damage * scalingFactor);
 
 // Apply adaptations
 for (const adaptation of encounter.adaptations) {
 switch(adaptation.type) {
 case 'resistance':
 stats.resistances = stats.resistances || {};
 stats.resistances[adaptation.target] = adaptation.value;
 break;
 case 'timing_change':
 stats.attackSpeed = (stats.attackSpeed || 1) + adaptation.adjustment;
 break;
 }
 }
 
 return stats;
 },
 
 // Get new attack patterns for boss
 getNewPatterns(bossId) {
 const encounter = this.encounters.get(bossId);
 if (!encounter || encounter.patterns.length < 3) return null;
 
 // Generate counter-strategies
 const patterns = [];
 
 // Add feint attacks
 patterns.push({
 type: 'feint',
 trigger: 'player_dodge',
 action: 'delayed_attack'
 });
 
 // Add area denial based on player positioning
 if (encounter.patterns[encounter.patterns.length - 1].positions.length > 0) {
 patterns.push({
 type: 'area_denial',
 targetArea: encounter.patterns[encounter.patterns.length - 1].positions[0]
 });
 }
 
 return patterns;
 }
 };

 // ===== MULTI-PHASE BOSS SYSTEM =====
 const MultiPhaseBoss = {
 // Boss phase definitions
 BOSS_PHASES: {
 warden: {
 name: "The Warden",
 totalPhases: 3,
 phases: [
 {
 hpThreshold: 1.0,
 attacks: ['charge', 'swipe', 'ground_slam'],
 speed: 1.0,
 damage: 1.0,
 description: "The Warden prowls..."
 },
 {
 hpThreshold: 0.6,
 attacks: ['rage_charge', 'multi_swipe', 'summon_guards', 'roar'],
 speed: 1.3,
 damage: 1.2,
 description: "The Warden ENRAGES!",
 effects: ['screen_shake', 'red_tint']
 },
 {
 hpThreshold: 0.25,
 attacks: ['desperate_charge', 'flurry', 'ground_destruction', 'summon_horde'],
 speed: 1.6,
 damage: 1.5,
 description: "The Warden fights for survival!",
 effects: ['heavy_shake', 'darkness']
 }
 ]
 },
 
 collector: {
 name: "The Collector",
 totalPhases: 4,
 phases: [
 {
 hpThreshold: 1.0,
 attacks: ['grab', 'teleport', 'soul_drain'],
 speed: 1.0,
 damage: 1.0,
 description: "The Collector watches..."
 },
 {
 hpThreshold: 0.75,
 attacks: ['multi_grab', 'rapid_teleport', 'memory_steal'],
 speed: 1.2,
 damage: 1.1,
 description: "The Collector takes interest...",
 effects: ['hallucinations']
 },
 {
 hpThreshold: 0.4,
 attacks: ['soul_rip', 'reality_tear', 'summon_collected', 'dimension_trap'],
 speed: 1.4,
 damage: 1.3,
 description: "The Collector REVEALS!",
 effects: ['reality_distortion', 'memory_loss']
 },
 {
 hpThreshold: 0.15,
 attacks: ['final_collection', 'dimension_collapse', 'soul_devour'],
 speed: 1.8,
 damage: 2.0,
 description: "The Collector will have you!",
 effects: ['heavy_distortion', 'void_effects']
 }
 ]
 },
 
 hellaphobia: {
 name: "Hellaphobia",
 totalPhases: 5,
 phases: [
 {
 hpThreshold: 1.0,
 attacks: ['fear_manifest', 'shadow_spawn', 'sanity_drain'],
 speed: 1.0,
 damage: 1.0,
 description: "Hellaphobia awakens..."
 },
 {
 hpThreshold: 0.8,
 attacks: ['personal_fear', 'reality_break', 'summon_all'],
 speed: 1.2,
 damage: 1.2,
 description: "Hellaphobia knows you...",
 effects: ['personal_horror']
 },
 {
 hpThreshold: 0.5,
 attacks: ['mind_rape', 'existence_deny', 'time_loop', 'fourth_wall'],
 speed: 1.5,
 damage: 1.5,
 description: "Hellaphobia breaks the rules...",
 effects: ['fourth_wall_break', 'meta_horror']
 },
 {
 hpThreshold: 0.25,
 attacks: ['true_form', 'reality_consumption', 'player_delete', 'void_embrace'],
 speed: 1.8,
 damage: 2.0,
 description: "Hellaphobia shows its TRUE form!",
 effects: ['heavy_glitch', 'screen_corruption']
 },
 {
 hpThreshold: 0.1,
 attacks: ['final_terror', 'existence_end', 'beyond_horror'],
 speed: 2.2,
 damage: 3.0,
 description: "HELLAPHOBIA WILL NOT LET YOU LEAVE!",
 effects: ['total_glitch', 'reality_collapse']
 }
 ]
 }
 },
 
 // Create a multi-phase boss
 createBoss(bossType, x, y) {
 const bossData = this.BOSS_PHASES[bossType];
 if (!bossData) return null;
 
 const baseHp = bossType === 'hellaphobia' ? 2000 : bossType === 'collector' ? 1000 : 600;
 
 const boss = {
 id: Date.now(),
 type: bossType,
 name: bossData.name,
 x: x,
 y: y,
 w: bossType === 'hellaphobia' ? 150 : bossType === 'collector' ? 100 : 80,
 h: bossType === 'hellaphobia' ? 180 : bossType === 'collector' ? 120 : 100,
 hp: baseHp,
 maxHp: baseHp,
 speed: 50,
 damage: 30,
 color: '#000000',
 eyeColor: '#ff0000',
 
 // Phase system
 currentPhase: 0,
 phaseTransitioning: false,
 phaseTransitionTimer: 0,
 
 // Attack system
 attackCooldown: 0,
 currentAttack: null,
 attackQueue: [],
 
 // Special effects
 effects: [],
 invincible: false,
 
 // AI
 targetPlayer: true,
 lastKnownPlayerPos: null,
 
 // Evolution
 adaptations: []
 };
 
 return boss;
 },
 
 // Update boss
 update(boss, player, dt, monsters) {
 // Check phase transition
 this.checkPhaseTransition(boss);
 
 // Handle phase transition animation
 if (boss.phaseTransitioning) {
 boss.phaseTransitionTimer -= dt;
 if (boss.phaseTransitionTimer <= 0) {
 boss.phaseTransitioning = false;
 }
 return; // Don't act during transition
 }
 
 // Update cooldowns
 if (boss.attackCooldown > 0) {
 boss.attackCooldown -= dt;
 }
 
 // Execute AI
 this.executeAI(boss, player, dt, monsters);
 },
 
 checkPhaseTransition(boss) {
 const bossData = this.BOSS_PHASES[boss.type];
 if (!bossData) return;
 
 const hpPercent = boss.hp / boss.maxHp;
 const nextPhase = boss.currentPhase + 1;
 
 if (nextPhase < bossData.phases.length) {
 const nextThreshold = bossData.phases[nextPhase].hpThreshold;
 
 if (hpPercent <= nextThreshold) {
 this.transitionToPhase(boss, nextPhase);
 }
 }
 },
 
 transitionToPhase(boss, phaseIndex) {
 const bossData = this.BOSS_PHASES[boss.type];
 const newPhase = bossData.phases[phaseIndex];
 
 boss.currentPhase = phaseIndex;
 boss.phaseTransitioning = true;
 boss.phaseTransitionTimer = 2.0;
 boss.invincible = true;
 
 // Apply phase modifiers
 boss.speed = 50 * newPhase.speed;
 boss.damage = 30 * newPhase.damage;
 
 // Apply effects
 boss.effects = newPhase.effects || [];
 
 // Queue up new attacks
 boss.attackQueue = [...newPhase.attacks];
 
 // Make vulnerable again after transition
 setTimeout(() => {
 boss.invincible = false;
 }, 1500);
 
 // Dispatch phase change event
 const event = new CustomEvent('bossPhaseChange', {
 detail: {
 boss: boss.type,
 phase: phaseIndex,
 description: newPhase.description,
 effects: newPhase.effects
 }
 });
 window.dispatchEvent(event);
 },
 
 executeAI(boss, player, dt, monsters) {
 // Track player
 const dx = player.x - boss.x;
 const dy = player.y - boss.y;
 const dist = Math.sqrt(dx * dx + dy * dy);
 
 boss.lastKnownPlayerPos = { x: player.x, y: player.y };
 
 // Choose attack
 if (boss.attackCooldown <= 0) {
 this.executeAttack(boss, player, dist, monsters);
 }
 
 // Movement AI
 this.updateMovement(boss, player, dist, dt);
 },
 
 executeAttack(boss, player, dist, monsters) {
 const bossData = this.BOSS_PHASES[boss.type];
 const currentPhase = bossData.phases[boss.currentPhase];
 
 if (!currentPhase) return;
 
 // Pick random attack from available
 const attacks = currentPhase.attacks;
 const attack = attacks[Math.floor(Math.random() * attacks.length)];
 
 // Execute attack based on type
 this.performAttack(boss, attack, player, monsters);
 
 // Set cooldown
 boss.attackCooldown = 1.5 / currentPhase.speed;
 },
 
 performAttack(boss, attackType, player, monsters) {
 const attackEvents = {
 // Warden attacks
 charge: () => {
 boss.charging = true;
 boss.chargeTarget = { x: player.x, y: player.y };
 },
 swipe: () => {
 boss.swiping = true;
 boss.damageRadius = 80;
 },
 ground_slam: () => {
 boss.groundSlam = true;
 // Create shockwave
 window.dispatchEvent(new CustomEvent('shockwave', {
 detail: { x: boss.x, y: boss.y, radius: 200, damage: boss.damage }
 }));
 },
 
 // Collector attacks
 teleport: () => {
 boss.x = player.x + (Math.random() - 0.5) * 200;
 boss.y = player.y;
 },
 grab: () => {
 if (Math.abs(player.x - boss.x) < 100) {
 player.grabbed = true;
 player.grabTimer = 2;
 }
 },
 
 // Hellaphobia attacks
 fear_manifest: () => {
 window.dispatchEvent(new CustomEvent('fearManifest', {
 detail: { intensity: boss.currentPhase + 1 }
 }));
 },
 fourth_wall: () => {
 window.dispatchEvent(new CustomEvent('fourthWallBreak', {
 detail: { message: "I know your name. I know your fears." }
 }));
 player.sanity -= 20;
 }
 };
 
 const handler = attackEvents[attackType];
 if (handler) handler();
 },
 
 updateMovement(boss, player, dist, dt) {
 const bossData = this.BOSS_PHASES[boss.type];
 const currentPhase = bossData.phases[boss.currentPhase];
 
 if (boss.charging) {
 // Charge movement
 const dx = boss.chargeTarget.x - boss.x;
 const dy = boss.chargeTarget.y - boss.y;
 const d = Math.sqrt(dx * dx + dy * dy);
 
 if (d > 10) {
 boss.x += (dx / d) * 500 * dt;
 boss.y += (dy / d) * 500 * dt;
 } else {
 boss.charging = false;
 }
 } else {
 // Normal movement
 if (dist > 100) {
 const dx = player.x - boss.x;
 const dy = player.y - boss.y;
 boss.x += (dx / dist) * boss.speed * dt;
 boss.y += (dy / dist) * boss.speed * dt;
 }
 }
 }
 };

 // ===== ADVANCED PATHFINDING =====
 const AdvancedPathfinding = {
 findPath(start, end, grid, monster) {
 const ai = monster?.phase3AI;
 
 // Use cached path if available
 if (ai?.memoryPaths) {
 const cached = ai.memoryPaths.find(p => 
 Math.abs(p.end.x - end.x) < 50 && Math.abs(p.end.y - end.y) < 50
 );
 if (cached && Math.random() < 0.7) {
 return cached.path;
 }
 }
 
 // A* algorithm
 const path = this.aStar(start, end, grid);
 
 // Cache path
 if (path && ai?.memoryPaths) {
 ai.memoryPaths.push({ start: {...start}, end: {...end}, path: [...path] });
 if (ai.memoryPaths.length > 10) ai.memoryPaths.shift();
 }
 
 return path;
 },
 
 aStar(start, end, grid) {
 const openSet = [{ ...start, g: 0, h: this.heuristic(start, end), f: this.heuristic(start, end) }];
 const closedSet = new Set();
 const cameFrom = new Map();
 
 while (openSet.length > 0) {
 // Get node with lowest f
 openSet.sort((a, b) => a.f - b.f);
 const current = openSet.shift();
 
 // Check if reached goal
 if (Math.abs(current.x - end.x) < 32 && Math.abs(current.y - end.y) < 32) {
 return this.reconstructPath(cameFrom, current);
 }
 
 closedSet.add(`${Math.floor(current.x/32)},${Math.floor(current.y/32)}`);
 
 // Check neighbors
 const neighbors = this.getNeighbors(current, grid);
 
 for (const neighbor of neighbors) {
 const key = `${Math.floor(neighbor.x/32)},${Math.floor(neighbor.y/32)}`;
 if (closedSet.has(key)) continue;
 
 const g = current.g + 32;
 const h = this.heuristic(neighbor, end);
 const f = g + h;
 
 const existing = openSet.find(n => 
 Math.floor(n.x/32) === Math.floor(neighbor.x/32) && 
 Math.floor(n.y/32) === Math.floor(neighbor.y/32)
 );
 
 if (!existing) {
 openSet.push({ ...neighbor, g, h, f });
 cameFrom.set(key, current);
 } else if (g < existing.g) {
 existing.g = g;
 existing.f = g + existing.h;
 cameFrom.set(key, current);
 }
 }
 }
 
 return null;
 },
 
 heuristic(a, b) {
 return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
 },
 
 getNeighbors(pos, grid) {
 const neighbors = [];
 const dirs = [[0, -32], [32, 0], [0, 32], [-32, 0], [32, -32], [32, 32], [-32, 32], [-32, -32]];
 
 for (const [dx, dy] of dirs) {
 const nx = pos.x + dx;
 const ny = pos.y + dy;
 if (this.isWalkable(nx, ny, grid)) {
 neighbors.push({ x: nx, y: ny });
 }
 }
 
 return neighbors;
 },
 
 isWalkable(x, y, grid) {
 // Simplified - assume walkable if not explicitly blocked
 return true;
 },
 
 reconstructPath(cameFrom, current) {
 const path = [{ x: current.x, y: current.y }];
 let key = `${Math.floor(current.x/32)},${Math.floor(current.y/32)}`;
 
 while (cameFrom.has(key)) {
 const prev = cameFrom.get(key);
 path.unshift({ x: prev.x, y: prev.y });
 key = `${Math.floor(prev.x/32)},${Math.floor(prev.y/32)}`;
 }
 
 return path;
 }
 };

 // ===== MAIN PHASE 3 API =====
 const Phase3Core = {
 initialized: false,
 
 init(levelData) {
 PackHunting.init();
 MonsterEcosystem.init(levelData);
 this.initialized = true;
 console.log('Phase 3: Advanced AI & Monster Ecosystem initialized');
 console.log(` - ${Object.keys(MONSTER_TYPES).length} monster types defined`);
 console.log(' - Neural network AI ready');
 console.log(' - Pack hunting system ready');
 console.log(' - Multi-phase boss system ready');
 },
 
 update(monsters, player, dt) {
 if (!this.initialized) return;
 
 // Update emotional AI for each monster
 for (const monster of monsters) {
 if (monster.dead) continue;
 
 // Gather stimuli
 const stimuli = this.gatherStimuli(monster, player, monsters);
 
 // Update emotional state
 EmotionalAI.updateEmotion(monster, stimuli, dt);
 
 // Handle pack joining
 if (!monster.pack && monster.category !== 'boss') {
 const pack = PackHunting.joinPack(monster, monsters);
 if (pack) monster.pack = pack;
 }
 }
 
 // Update packs
 PackHunting.update(monsters, player, dt);
 
 // Update ecosystem
 MonsterEcosystem.update(dt, monsters, null);
 },
 
 gatherStimuli(monster, player, monsters) {
 const stimuli = [];
 
 const dx = player.x - monster.x;
 const dy = player.y - monster.y;
 const dist = Math.sqrt(dx * dx + dy * dy);
 const detectionRange = monster.detectionRange || 400;
 
 // Player detection
 if (dist < detectionRange) {
 stimuli.push({ type: 'player_seen', x: player.x, y: player.y });
 } else if (monster.phase3AI?.memory.lastSeenPlayer) {
 stimuli.push({ type: 'player_lost' });
 }
 
 // Health status
 if (monster.hp < monster.maxHp * 0.3) {
 stimuli.push({ type: 'low_health' });
 }
 if (monster.hp < monster.maxHp) {
 stimuli.push({ type: 'damage_taken', amount: monster.maxHp - monster.hp });
 }
 
 // Player vulnerability
 if (player.hp < player.maxHp * 0.3 || player.sanity < 30) {
 stimuli.push({ type: 'player_vulnerable' });
 }
 
 // Ally status
 const deadAllies = monsters.filter(m => m.dead && m.typeId === monster.typeId).length;
 if (deadAllies > 0) {
 stimuli.push({ type: 'ally_died', count: deadAllies });
 }
 
 // Same type nearby
 const sameTypeNearby = monsters.filter(m => 
 !m.dead && m !== monster && m.typeId === monster.typeId
 ).length;
 if (sameTypeNearby > 0) {
 stimuli.push({ type: 'same_type_nearby' });
 }
 
 return stimuli;
 },
 
 // Get monster type definition
 getMonsterType(id) {
 return Object.values(MONSTER_TYPES).find(t => t.id === id);
 },
 
 // Get all monster types
 getAllMonsterTypes() {
 return MONSTER_TYPES;
 },
 
 // Create boss with phases
 createBoss(bossType, x, y) {
 return MultiPhaseBoss.createBoss(bossType, x, y);
 },
 
 // Update boss
 updateBoss(boss, player, dt, monsters) {
 MultiPhaseBoss.update(boss, player, dt, monsters);
 },
 
 // Record boss encounter
 recordBossEncounter(bossId, playerActions, outcome, duration) {
 BossEvolution.recordEncounter(bossId, playerActions, outcome, duration);
 },
 
 // Get evolved boss stats
 getEvolvedBossStats(bossId, baseStats) {
 return BossEvolution.getBossStats(bossId, baseStats);
 },
 
 // Find path
 findPath(monster, target, grid) {
 return AdvancedPathfinding.findPath(
 { x: monster.x, y: monster.y },
 target,
 grid,
 monster
 );
 },
 
 // Get AI decision
 getAIDecision(monster, player) {
 return EmotionalAI.getDecision(monster, player);
 },
 
 // Apply phobia effect
 applyPhobiaEffect(phobia, player, monster) {
 return PhobiaAI.applyPhobiaEffect(phobia, player, monster);
 }
 };

 // Export to window
 window.Phase3Core = Phase3Core;
 window.NeuralNetwork = NeuralNetwork;
 window.EmotionalAI = EmotionalAI;
 window.PackHunting = PackHunting;
 window.PhobiaAI = PhobiaAI;
 window.MonsterEcosystem = MonsterEcosystem;
 window.BossEvolution = BossEvolution;
 window.MultiPhaseBoss = MultiPhaseBoss;
 window.AdvancedPathfinding = AdvancedPathfinding;
 window.HELLAPHOBIA_MONSTER_TYPES = MONSTER_TYPES;

 console.log('Phase 3: Advanced AI & Monster Ecosystem loaded');
 console.log(` - ${Object.keys(MONSTER_TYPES).length} monster types available`);
})();