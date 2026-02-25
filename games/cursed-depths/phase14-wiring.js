/* ============================================================
   CURSED DEPTHS - PHASE 14: WIRING & LOGIC GATES
   Advanced Automation | Circuits | Traps | Mechanisms
   ============================================================ */

// ===== WIRING SYSTEM =====
const WiringSystem = {
    wires: [],
    devices: [],
    logicGates: [],
    activeSignals: new Set(),
    
    wireColors: ['red', 'blue', 'green', 'yellow'],
    
    init() {
        console.log('⚡ Phase 14: Wiring & Logic Gates initialized');
        this.loadWiring();
    },
    
    loadWiring() {
        const saved = localStorage.getItem('cursed_depths_wiring');
        if (saved) {
            const data = JSON.parse(saved);
            this.wires = data.wires || [];
            this.devices = data.devices || [];
            this.logicGates = data.logicGates || [];
        }
    },
    
    saveWiring() {
        const data = {
            wires: this.wires,
            devices: this.devices,
            logicGates: this.logicGates
        };
        localStorage.setItem('cursed_depths_wiring', JSON.stringify(data));
    },
    
    // Place wire between two points
    placeWire(x1, y1, x2, y2, color = 'red') {
        const wire = {
            id: this.generateId(),
            x1, y1, x2, y2,
            color,
            active: false
        };
        
        this.wires.push(wire);
        this.saveWiring();
        
        return wire;
    },
    
    // Place device (switch, lamp, trap, etc.)
    placeDevice(x, y, type, config = {}) {
        const device = {
            id: this.generateId(),
            x, y,
            type,
            state: false,
            timer: 0,
            ...config
        };
        
        this.devices.push(device);
        this.saveWiring();
        
        return device;
    },
    
    // Place logic gate
    placeLogicGate(x, y, gateType, inputs = [], output = null) {
        const gate = {
            id: this.generateId(),
            x, y,
            gateType, // AND, OR, NOT, XOR, NAND, NOR
            inputs,
            output,
            state: false
        };
        
        this.logicGates.push(gate);
        this.saveWiring();
        
        return gate;
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Update wiring logic
    update(dt) {
        // Update devices
        this.devices.forEach(device => {
            if (device.timer > 0) {
                device.timer -= dt * 60;
                if (device.timer <= 0) {
                    this.deactivateDevice(device);
                }
            }
        });
        
        // Update logic gates
        this.logicGates.forEach(gate => {
            const inputStates = gate.inputs.map(inputId => {
                const device = this.devices.find(d => d.id === inputId);
                return device ? device.state : false;
            });
            
            gate.state = this.evaluateGate(gate.gateType, inputStates);
            
            // Trigger output
            if (gate.output) {
                const outputDevice = this.devices.find(d => d.id === gate.output);
                if (outputDevice) {
                    outputDevice.state = gate.state;
                }
            }
        });
        
        // Update wire signals
        this.updateWireSignals();
    },
    
    evaluateGate(gateType, inputs) {
        switch(gateType) {
            case 'AND':
                return inputs.every(i => i === true);
            case 'OR':
                return inputs.some(i => i === true);
            case 'NOT':
                return !inputs[0];
            case 'XOR':
                return inputs.filter(i => i === true).length === 1;
            case 'NAND':
                return !inputs.every(i => i === true);
            case 'NOR':
                return !inputs.some(i => i === true);
            default:
                return false;
        }
    },
    
    updateWireSignals() {
        // Clear all signals
        this.activeSignals.clear();
        
        // Start from active devices
        this.devices.filter(d => d.state).forEach(device => {
            this.propagateSignal(device.id);
        });
    },
    
    propagateSignal(deviceId) {
        if (this.activeSignals.has(deviceId)) return;
        
        this.activeSignals.add(deviceId);
        
        // Find connected wires
        const connectedWires = this.wires.filter(w => 
            this.isWireConnectedToDevice(w, deviceId)
        );
        
        connectedWires.forEach(wire => {
            wire.active = true;
            
            // Find device at other end
            const otherDevice = this.getDeviceAtOtherEnd(wire, deviceId);
            if (otherDevice) {
                this.propagateSignal(otherDevice.id);
                
                // Activate device
                if (otherDevice.type === 'lamp' || otherDevice.type === 'torch') {
                    otherDevice.state = true;
                } else if (otherDevice.type === 'trap') {
                    this.triggerTrap(otherDevice);
                } else if (otherDevice.type === 'door') {
                    otherDevice.state = !otherDevice.state;
                } else if (otherDevice.type === 'teleporter') {
                    this.activateTeleporter(otherDevice);
                }
            }
        });
    },
    
    isWireConnectedToDevice(wire, deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return false;
        
        const dist1 = Math.sqrt((wire.x1 - device.x) ** 2 + (wire.y1 - device.y) ** 2);
        const dist2 = Math.sqrt((wire.x2 - device.x) ** 2 + (wire.y2 - device.y) ** 2);
        
        return dist1 < 20 || dist2 < 20;
    },
    
    getDeviceAtOtherEnd(wire, deviceId) {
        const devices = this.devices.filter(d => d.id !== deviceId);
        
        for (const device of devices) {
            const dist1 = Math.sqrt((wire.x1 - device.x) ** 2 + (wire.y1 - device.y) ** 2);
            const dist2 = Math.sqrt((wire.x2 - device.x) ** 2 + (wire.y2 - device.y) ** 2);
            
            if (dist1 < 20 || dist2 < 20) {
                return device;
            }
        }
        
        return null;
    },
    
    triggerTrap(trap) {
        if (trap.triggered) return;
        
        trap.triggered = true;
        trap.timer = 60; // Reset after 1 second
        
        // Execute trap effect
        switch(trap.subtype) {
            case 'dart':
                this.fireDartTrap(trap);
                break;
            case 'spike':
                this.activateSpikeTrap(trap);
                break;
            case 'flame':
                this.activateFlameTrap(trap);
                break;
            case 'boulder':
                this.spawnBoulder(trap);
                break;
        }
    },
    
    fireDartTrap(trap) {
        projectiles.push({
            x: trap.x,
            y: trap.y,
            vx: trap.direction * 10,
            vy: 0,
            damage: trap.damage || 30,
            type: 'dart'
        });
    },
    
    activateSpikeTrap(trap) {
        // Damage entities above trap
        enemies.forEach(enemy => {
            const dist = Math.sqrt((enemy.x - trap.x) ** 2 + (enemy.y - trap.y) ** 2);
            if (dist < 40 && enemy.y < trap.y) {
                enemy.hp -= trap.damage || 40;
            }
        });
        
        if (player) {
            const dist = Math.sqrt((player.x - trap.x) ** 2 + (player.y - trap.y) ** 2);
            if (dist < 40 && player.y < trap.y) {
                player.hp -= trap.damage || 40;
            }
        }
    },
    
    activateFlameTrap(trap) {
        // Create flame area
        flameZones.push({
            x: trap.x,
            y: trap.y,
            radius: 50,
            damage: trap.damage || 20,
            duration: 180
        });
    },
    
    spawnBoulder(trap) {
        enemies.push({
            x: trap.x,
            y: trap.y - 100,
            type: 'boulder',
            vx: 0,
            vy: 0,
            damage: trap.damage || 100,
            rolling: true
        });
    },
    
    activateTeleporter(teleporter) {
        // Find linked teleporter
        const linked = this.devices.find(d => 
            d.id === teleporter.linkedId && d.type === 'teleporter'
        );
        
        if (linked) {
            // Teleport player if nearby
            const dist = Math.sqrt((player.x - teleporter.x) ** 2 + (player.y - teleporter.y) ** 2);
            if (dist < 50) {
                player.x = linked.x;
                player.y = linked.y;
                createTeleportEffect(player.x, player.y);
            }
        }
    },
    
    // Interaction functions
    activateSwitch(device) {
        device.state = !device.state;
        device.timer = device.state ? 0 : 60;
        
        if (device.state) {
            this.propagateSignal(device.id);
        }
    },
    
    stepOnPressurePlate(device) {
        if (!device.state) {
            device.state = true;
            device.timer = 120; // Stay active for 2 seconds
            this.propagateSignal(device.id);
        }
    },
    
    // Render wiring
    render(ctx, camX, camY) {
        // Render wires
        this.wires.forEach(wire => {
            const screenX1 = wire.x1 - camX;
            const screenY1 = wire.y1 - camY;
            const screenX2 = wire.x2 - camX;
            const screenY2 = wire.y2 - camY;
            
            ctx.strokeStyle = this.getWireColor(wire.color, wire.active);
            ctx.lineWidth = wire.active ? 4 : 2;
            ctx.beginPath();
            ctx.moveTo(screenX1, screenY1);
            ctx.lineTo(screenX2, screenY2);
            ctx.stroke();
        });
        
        // Render devices
        this.devices.forEach(device => {
            const screenX = device.x - camX;
            const screenY = device.y - camY;
            
            this.renderDevice(ctx, device, screenX, screenY);
        });
        
        // Render logic gates
        this.logicGates.forEach(gate => {
            const screenX = gate.x - camX;
            const screenY = gate.y - camY;
            
            this.renderLogicGate(ctx, gate, screenX, screenY);
        });
    },
    
    getWireColor(baseColor, active) {
        const colors = {
            red: active ? '#FF4444' : '#882222',
            blue: active ? '#4444FF' : '#222288',
            green: active ? '#44FF44' : '#228822',
            yellow: active ? '#FFFF44' : '#888822'
        };
        return colors[baseColor] || colors.red;
    },
    
    renderDevice(ctx, device, x, y) {
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        
        const sprites = {
            switch: device.state ? '🔴' : '🟢',
            lamp: device.state ? '💡' : '🌑',
            torch: device.state ? '🔥' : '🪵',
            door: device.state ? '🚪' : '🚪',
            trap: '⚠️',
            pressure_plate: device.state ? '🔘' : '⚪',
            teleporter: device.state ? '🌀' : '⭕'
        };
        
        ctx.fillText(sprites[device.type] || '❓', x, y);
        
        // Draw device name
        ctx.font = '10px Inter';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(device.type, x, y + 15);
    },
    
    renderLogicGate(ctx, gate, x, y) {
        // Draw gate box
        ctx.fillStyle = gate.state ? '#4488FF' : '#333344';
        ctx.fillRect(x - 30, y - 20, 60, 40);
        
        // Draw gate symbol
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        
        const symbols = {
            AND: '&',
            OR: '≥1',
            NOT: '1',
            XOR: '=1',
            NAND: '&',
            NOR: '≥1'
        };
        
        ctx.fillText(symbols[gate.gateType] || '?', x, y + 5);
        
        // Draw input/output lines
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        
        gate.inputs.forEach((input, i) => {
            const inputX = x - 20 + (i * 40);
            ctx.beginPath();
            ctx.moveTo(inputX, y - 20);
            ctx.lineTo(inputX, y - 30);
            ctx.stroke();
        });
        
        if (gate.output) {
            ctx.beginPath();
            ctx.moveTo(x, y + 20);
            ctx.lineTo(x, y + 30);
            ctx.stroke();
        }
    },
    
    // Get connected devices count
    getDeviceCount(type) {
        return this.devices.filter(d => d.type === type).length;
    },
    
    // Clear all wiring
    clearAll() {
        this.wires = [];
        this.devices = [];
        this.logicGates = [];
        this.activeSignals.clear();
        this.saveWiring();
    }
};

// Export globally
window.WiringSystem = WiringSystem;

console.log('⚡ Phase 14: Wiring & Logic Gates loaded');
