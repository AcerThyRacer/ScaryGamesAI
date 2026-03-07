/* ============================================
   Backrooms: Pac-Man - Game State Management
   Centralized state machine
   ============================================ */

export const GAME_STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    BLACKOUT: 'BLACKOUT',
    DEAD: 'DEAD',
    WIN: 'WIN'
};

export class GameStateManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.currentState = GAME_STATE.MENU;
    }

    getState() {
        return this.currentState;
    }

    setState(nextState) {
        if (this.currentState === nextState) return;
        
        const previousState = this.currentState;
        this.currentState = nextState;
        this.game.gameActive = this.isGameRunning();
        this.game.blackoutActive = (nextState === GAME_STATE.BLACKOUT);

        // Sync with global game container if available
        if (window.GameUtils && GameUtils.setState) {
            switch (nextState) {
                case GAME_STATE.PLAYING:
                case GAME_STATE.BLACKOUT:
                    GameUtils.setState(GameUtils.STATE.PLAYING);
                    break;
                case GAME_STATE.PAUSED:
                    GameUtils.setState(GameUtils.STATE.PAUSED);
                    break;
                case GAME_STATE.DEAD:
                    GameUtils.setState(GameUtils.STATE.GAME_OVER);
                    break;
                case GAME_STATE.WIN:
                    GameUtils.setState(GameUtils.STATE.WIN);
                    break;
            }
        }

        // Handle state transitions
        this.onStateChange(previousState, nextState);
    }

    isGameRunning() {
        return this.currentState === GAME_STATE.PLAYING || 
               this.currentState === GAME_STATE.BLACKOUT;
    }

    isPaused() {
        return this.currentState === GAME_STATE.PAUSED;
    }

    isBlackout() {
        return this.currentState === GAME_STATE.BLACKOUT;
    }

    onStateChange(from, to) {
        console.log(`[GameState] ${from} → ${to}`);
        
        // Trigger state-specific behaviors
        switch (to) {
            case GAME_STATE.PLAYING:
                this.game.resumeGame();
                break;
            case GAME_STATE.PAUSED:
                this.game.pauseGame();
                break;
            case GAME_STATE.BLACKOUT:
                this.game.startBlackout();
                break;
            case GAME_STATE.DEAD:
                this.game.handleDeath();
                break;
            case GAME_STATE.WIN:
                this.game.handleWin();
                break;
        }
    }
}
