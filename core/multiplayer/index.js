/**
 * Multiplayer & Social Features Module - Phase 7
 */

export { NetworkManager, P2PConnection, Matchmaker } from './NetworkManager.js';
export { 
  CooperativeMode, 
  CompetitiveMode, 
  TetrisBattle, 
  ZombieCoop, 
  RitualSession 
} from './GameModes.js';

export function createMultiplayerSystem(options = {}) {
  const network = new NetworkManager(options);
  const p2p = new P2PConnection(options.p2pConfig);
  const matchmaker = new Matchmaker(network);
  
  let currentMode = null;
  
  return {
    network,
    p2p,
    matchmaker,
    
    startCoop(options) {
      currentMode = new CooperativeMode(network, options);
      return currentMode;
    },
    
    startCompetitive(options) {
      currentMode = new CompetitiveMode(network, options);
      return currentMode;
    },
    
    startTetrisBattle(options) {
      currentMode = new TetrisBattle(network, options);
      return currentMode;
    },
    
    startZombieCoop(options) {
      currentMode = new ZombieCoop(network, options);
      return currentMode;
    },
    
    startRitualSession(options) {
      currentMode = new RitualSession(network, options);
      return currentMode;
    },
    
    getCurrentMode() {
      return currentMode;
    },
    
    async connect() {
      await network.connect();
    },
    
    disconnect() {
      network.disconnect();
      p2p.close();
    }
  };
}

export default {
  NetworkManager,
  P2PConnection,
  Matchmaker,
  CooperativeMode,
  CompetitiveMode,
  TetrisBattle,
  ZombieCoop,
  RitualSession,
  createMultiplayerSystem
};
