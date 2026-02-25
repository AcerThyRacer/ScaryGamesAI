class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.keys = {};
        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.gravity = 900; // pixels per second squared
        
        this.entities = [];
        
        this._bindInput();
    }

    _bindInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    start(updateFn, drawFn) {
        this.updateFn = updateFn;
        this.drawFn = drawFn;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(currentTime) {
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        // Cap delta time to prevent physics explosions on lag
        if (this.deltaTime > 0.1) this.deltaTime = 0.1;
        this.lastTime = currentTime;

        this.updateFn(this.deltaTime);
        this.drawFn(this.ctx);

        requestAnimationFrame((t) => this.loop(t));
    }

    // Basic AABB Collision
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.height + rect1.y > rect2.y;
    }

    // Resolve collision pushing rect1 out of rect2
    resolveCollision(entity, rect2) {
        // Simple AABB resolution
        // Calculate overlap on each axis
        const overlapX = (entity.width / 2 + rect2.width / 2) - Math.abs((entity.x + entity.width / 2) - (rect2.x + rect2.width / 2));
        const overlapY = (entity.height / 2 + rect2.height / 2) - Math.abs((entity.y + entity.height / 2) - (rect2.y + rect2.height / 2));

        if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
                if (entity.x < rect2.x) {
                    entity.x -= overlapX;
                } else {
                    entity.x += overlapX;
                }
                entity.vx = 0;
            } else {
                if (entity.y < rect2.y) {
                    entity.y -= overlapY;
                    entity.isGrounded = true;
                    entity.vy = 0;
                } else {
                    entity.y += overlapY;
                    entity.vy = 0;
                }
            }
        }
    }
}
