/* Level definitions for Total Zombies: Rome (prequel) */
var LEVELS = [
    {
        name: 'The Rubicon Watch',
        desc: 'A single cohort holds the frontier line. Break the first undead surge.',
        mapSize: 120, groundColor: 0x3a4726, fogColor: 0x1b2316, fogDensity: 0.010,
        sunColor: 0xffd2aa, sunIntensity: 0.55, exposure: 0.75,
        trees: 22, walls: 5, buildings: 0, capturePoints: 0,
        blue: [
            { type: 'legionary', count: 28, x: 0, z: -30, sq: 0 },
            { type: 'velites', count: 20, x: 0, z: -38, sq: 1 },
            { type: 'equites', count: 12, x: -14, z: -26, sq: 2 }
        ],
        red: [
            { type: 'zombie-gaul', count: 32, x: 0, z: 30, sq: 10 },
            { type: 'zombie-runner', count: 18, x: -14, z: 35, sq: 11 },
            { type: 'zombie-brute', count: 10, x: 14, z: 28, sq: 12 }
        ]
    },
    {
        name: 'Via Appia Dead-March',
        desc: 'Hold the road. If the plague reaches the villages, all is lost.',
        mapSize: 110, groundColor: 0x364223, fogColor: 0x141a10, fogDensity: 0.014,
        sunColor: 0xeec8aa, sunIntensity: 0.45, exposure: 0.65,
        trees: 10, walls: 10, buildings: 2, capturePoints: 0,
        blue: [
            { type: 'legionary', count: 26, x: 0, z: -32, sq: 0 },
            { type: 'velites', count: 26, x: 0, z: -40, sq: 1 },
            { type: 'equites', count: 10, x: -18, z: -28, sq: 2 }
        ],
        red: [
            { type: 'zombie-gaul', count: 36, x: 0, z: 30, sq: 10 },
            { type: 'zombie-necromancer', count: 10, x: 0, z: 38, sq: 11 },
            { type: 'zombie-runner', count: 20, x: 14, z: 34, sq: 12 },
            { type: 'zombie-brute', count: 12, x: -14, z: 28, sq: 13 }
        ]
    },
    {
        name: 'Tiber Crossing',
        desc: 'The dead cross the river. Hold the bridge and shatter their ranks.',
        mapSize: 100, groundColor: 0x2b3f20, fogColor: 0x101810, fogDensity: 0.016,
        sunColor: 0xd9b6aa, sunIntensity: 0.38, exposure: 0.58,
        trees: 12, walls: 4, buildings: 0, capturePoints: 0, hasBridge: true, hasRiver: true,
        blue: [
            { type: 'legionary', count: 24, x: 0, z: -25, sq: 0 },
            { type: 'velites', count: 28, x: 0, z: -32, sq: 1 },
            { type: 'centurion', count: 8, x: 10, z: -22, sq: 2 }
        ],
        red: [
            { type: 'zombie-gaul', count: 44, x: 0, z: 30, sq: 10 },
            { type: 'zombie-brute', count: 16, x: -10, z: 35, sq: 11 },
            { type: 'zombie-runner', count: 18, x: 10, z: 32, sq: 12 }
        ]
    },
    {
        name: 'Ostia Necropolis Siege',
        desc: 'Cursed mausoleums. Break the necromancer line before dawn.',
        mapSize: 130, groundColor: 0x3a3a2a, fogColor: 0x14110f, fogDensity: 0.010,
        sunColor: 0xffc0a0, sunIntensity: 0.50, exposure: 0.70,
        trees: 8, walls: 0, buildings: 0, capturePoints: 0, hasCastle: true,
        blue: [
            { type: 'legionary', count: 34, x: 0, z: -40, sq: 0 },
            { type: 'velites', count: 26, x: 0, z: -48, sq: 1 },
            { type: 'equites', count: 18, x: -20, z: -35, sq: 2 }
        ],
        red: [
            { type: 'zombie-gaul', count: 32, x: 0, z: 10, sq: 10 },
            { type: 'zombie-necromancer', count: 16, x: 0, z: 20, sq: 11 },
            { type: 'zombie-runner', count: 18, x: -10, z: 15, sq: 12 },
            { type: 'zombie-brute', count: 16, x: 10, z: 25, sq: 13 }
        ]
    },
    {
        name: 'Roma: The Forum Fires',
        desc: 'Reclaim the Eternal City. Capture all 3 control points to end the plague.',
        mapSize: 140, groundColor: 0x2f2a22, fogColor: 0x120c08, fogDensity: 0.008,
        sunColor: 0xffaa88, sunIntensity: 0.55, exposure: 0.74,
        trees: 6, walls: 0, buildings: 14, capturePoints: 3, isCity: true,
        blue: [
            { type: 'legionary', count: 42, x: 0, z: -50, sq: 0 },
            { type: 'velites', count: 30, x: 0, z: -58, sq: 1 },
            { type: 'equites', count: 22, x: -20, z: -45, sq: 2 }
        ],
        red: [
            { type: 'zombie-gaul', count: 40, x: 0, z: 0, sq: 10 },
            { type: 'zombie-necromancer', count: 22, x: -15, z: 10, sq: 11 },
            { type: 'zombie-runner', count: 26, x: 15, z: 5, sq: 12 },
            { type: 'zombie-brute', count: 22, x: 0, z: 20, sq: 13 },
            { type: 'zombie-gaul', count: 18, x: 0, z: -15, sq: 14 }
        ]
    }
];

