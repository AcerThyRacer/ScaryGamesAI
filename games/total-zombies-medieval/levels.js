/* Level definitions for Total Zombies Medieval */
var LEVELS = [
    {
        name: 'The Open Field', desc: 'Destroy the zombie vanguard on the plains.',
        mapSize: 120, groundColor: 0x3a5a2a, fogColor: 0x223322, fogDensity: 0.008,
        sunColor: 0xffddaa, sunIntensity: 0.6, exposure: 0.8,
        trees: 30, walls: 6, buildings: 0, capturePoints: 0,
        blue: [
            { type: 'swordsmen', count: 25, x: 0, z: -30, sq: 0 },
            { type: 'archers', count: 20, x: 0, z: -38, sq: 1 },
            { type: 'cavalry', count: 15, x: -15, z: -26, sq: 2 }
        ],
        red: [
            { type: 'swordsmen', count: 30, x: 0, z: 30, sq: 10 },
            { type: 'swordsmen', count: 20, x: -12, z: 35, sq: 11 },
            { type: 'cavalry', count: 10, x: 12, z: 28, sq: 12 }
        ]
    },
    {
        name: 'Bridge of Bones', desc: 'Hold the bridge against the zombie horde crossing the river.',
        mapSize: 100, groundColor: 0x2a4a22, fogColor: 0x1a2a1a, fogDensity: 0.012,
        sunColor: 0xddbbaa, sunIntensity: 0.4, exposure: 0.6,
        trees: 15, walls: 3, buildings: 0, capturePoints: 0, hasBridge: true, hasRiver: true,
        blue: [
            { type: 'swordsmen', count: 20, x: 0, z: -25, sq: 0 },
            { type: 'archers', count: 25, x: 0, z: -32, sq: 1 },
            { type: 'swordsmen', count: 10, x: 10, z: -20, sq: 2 }
        ],
        red: [
            { type: 'swordsmen', count: 40, x: 0, z: 30, sq: 10 },
            { type: 'cavalry', count: 15, x: -10, z: 35, sq: 11 },
            { type: 'swordsmen', count: 15, x: 10, z: 32, sq: 12 }
        ]
    },
    {
        name: 'The Dark Forest', desc: 'Navigate through the haunted forest to ambush the undead camp.',
        mapSize: 110, groundColor: 0x1a3a15, fogColor: 0x0a1a0a, fogDensity: 0.02,
        sunColor: 0x99aacc, sunIntensity: 0.25, exposure: 0.45,
        trees: 80, walls: 2, buildings: 0, capturePoints: 0,
        blue: [
            { type: 'archers', count: 30, x: 0, z: -35, sq: 0 },
            { type: 'swordsmen', count: 15, x: -8, z: -28, sq: 1 },
            { type: 'cavalry', count: 20, x: 8, z: -25, sq: 2 }
        ],
        red: [
            { type: 'swordsmen', count: 35, x: 0, z: 25, sq: 10 },
            { type: 'swordsmen', count: 25, x: -15, z: 30, sq: 11 },
            { type: 'archers', count: 15, x: 0, z: 35, sq: 12 },
            { type: 'cavalry', count: 10, x: 15, z: 28, sq: 13 }
        ]
    },
    {
        name: 'Castle Siege', desc: 'Storm the zombie-held castle. Breach the walls and eliminate defenders.',
        mapSize: 130, groundColor: 0x3a4a2a, fogColor: 0x1a2015, fogDensity: 0.009,
        sunColor: 0xffccaa, sunIntensity: 0.5, exposure: 0.7,
        trees: 12, walls: 0, buildings: 0, capturePoints: 0, hasCastle: true,
        blue: [
            { type: 'swordsmen', count: 35, x: 0, z: -40, sq: 0 },
            { type: 'archers', count: 25, x: 0, z: -48, sq: 1 },
            { type: 'cavalry', count: 20, x: -20, z: -35, sq: 2 }
        ],
        red: [
            { type: 'swordsmen', count: 30, x: 0, z: 10, sq: 10 },
            { type: 'archers', count: 20, x: 0, z: 20, sq: 11 },
            { type: 'swordsmen', count: 20, x: -10, z: 15, sq: 12 },
            { type: 'cavalry', count: 15, x: 10, z: 25, sq: 13 }
        ]
    },
    {
        name: 'The Capital: City Takeover', desc: 'Liberate the capital! Capture all 3 control points to win.',
        mapSize: 140, groundColor: 0x3a3a2a, fogColor: 0x15150f, fogDensity: 0.007,
        sunColor: 0xffaa88, sunIntensity: 0.55, exposure: 0.75,
        trees: 10, walls: 0, buildings: 12, capturePoints: 3, isCity: true,
        blue: [
            { type: 'swordsmen', count: 40, x: 0, z: -50, sq: 0 },
            { type: 'archers', count: 30, x: 0, z: -58, sq: 1 },
            { type: 'cavalry', count: 25, x: -20, z: -45, sq: 2 }
        ],
        red: [
            { type: 'swordsmen', count: 35, x: 0, z: 0, sq: 10 },
            { type: 'archers', count: 25, x: -15, z: 10, sq: 11 },
            { type: 'swordsmen', count: 25, x: 15, z: 5, sq: 12 },
            { type: 'cavalry', count: 20, x: 0, z: 20, sq: 13 },
            { type: 'swordsmen', count: 15, x: 0, z: -15, sq: 14 }
        ]
    }
];
