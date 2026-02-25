/**
 * Dynamic Narrative Systems Module - Phase 6
 */

export { DialogueSystem, DialogueBuilder } from './DialogueSystem.js';
export { EventScheduler, NPCMemory, ConsequenceTracker } from './EventScheduler.js';

export function createNarrativeSystem() {
  const dialogue = new DialogueSystem();
  const scheduler = new EventScheduler();
  const memory = new Map(); // NPC memories
  const consequences = new ConsequenceTracker();
  
  return {
    dialogue,
    scheduler,
    
    getNPCMemory(npcId) {
      if (!memory.has(npcId)) {
        memory.set(npcId, new NPCMemory(npcId));
      }
      return memory.get(npcId);
    },
    
    update(dt, context = {}) {
      dialogue.update?.(dt);
      scheduler.update(dt, context);
    },
    
    export() {
      return {
        dialogue: dialogue.getState(),
        scheduler: scheduler.events,
        memories: Array.from(memory.entries()).map(([id, m]) => m.export()),
        consequences: consequences.export()
      };
    },
    
    import(data) {
      if (data.dialogue) dialogue.setState(data.dialogue);
      if (data.scheduler) scheduler.events = data.scheduler;
      if (data.memories) {
        data.memories.forEach(([id, memData]) => {
          const npcMem = new NPCMemory(id);
          npcMem.import(memData);
          memory.set(id, npcMem);
        });
      }
      if (data.consequences) consequences.import(data.consequences);
    }
  };
}

export default {
  DialogueSystem,
  DialogueBuilder,
  EventScheduler,
  NPCMemory,
  ConsequenceTracker,
  createNarrativeSystem
};
