/**
 * QUADTREE - Spatial Partitioning System
 * 10-100x faster collision detection through spatial queries
 */

var Quadtree = (function() {
    'use strict';
    
    /**
     * Quadtree Node
     */
    function Node(x, y, width, height, level, maxLevel) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.level = level || 0;
        this.maxLevel = maxLevel || 8;
        this.objects = [];
        this.nodes = [];
        this.isLeaf = true;
    }
    
    Node.prototype = {
        /**
         * Split node into 4 children
         */
        split: function() {
            var subWidth = this.width / 2;
            var subHeight = this.height / 2;
            var x = this.x;
            var y = this.y;
            
            // Create 4 child nodes
            this.nodes[0] = new Node(x + subWidth, y, subWidth, subHeight, this.level + 1, this.maxLevel);
            this.nodes[1] = new Node(x, y, subWidth, subHeight, this.level + 1, this.maxLevel);
            this.nodes[2] = new Node(x, y + subHeight, subWidth, subHeight, this.level + 1, this.maxLevel);
            this.nodes[3] = new Node(x + subWidth, y + subHeight, subWidth, subHeight, this.level + 1, this.maxLevel);
            
            this.isLeaf = false;
        },
        
        /**
         * Get index of quadrant for object
         * @param {object} obj - Object with x, y properties
         * @returns {number} Quadrant index (0-3) or -1 if doesn't fit
         */
        getIndex: function(obj) {
            var verticalMidpoint = this.x + this.width / 2;
            var horizontalMidpoint = this.y + this.height / 2;
            
            // Object fits in top quadrants
            var topQuadrant = (obj.y < horizontalMidpoint && obj.y + (obj.height || 0) < horizontalMidpoint);
            // Object fits in bottom quadrants
            var bottomQuadrant = (obj.y > horizontalMidpoint);
            
            // Object fits in left quadrants
            if (obj.x < verticalMidpoint && obj.x + (obj.width || 0) < verticalMidpoint) {
                if (topQuadrant) return 1;
                if (bottomQuadrant) return 2;
            }
            // Object fits in right quadrants
            else if (obj.x > verticalMidpoint) {
                if (topQuadrant) return 0;
                if (bottomQuadrant) return 3;
            }
            
            // Object doesn't fit in any quadrant
            return -1;
        },
        
        /**
         * Insert object into quadtree
         * @param {object} obj - Object to insert
         * @returns {boolean} Success
         */
        insert: function(obj) {
            if (!this.isLeaf) {
                var index = this.getIndex(obj);
                
                if (index !== -1) {
                    return this.nodes[index].insert(obj);
                }
            }
            
            this.objects.push(obj);
            
            // Split if too many objects and not at max depth
            if (this.objects.length > 4 && this.level < this.maxLevel) {
                if (this.isLeaf) {
                    this.split();
                    
                    // Redistribute objects to children
                    for (var i = this.objects.length - 1; i >= 0; i--) {
                        var obj = this.objects[i];
                        var index = this.getIndex(obj);
                        
                        if (index !== -1) {
                            this.nodes[index].insert(obj);
                            this.objects.splice(i, 1);
                        }
                    }
                }
            }
            
            return true;
        },
        
        /**
         * Query for objects in range
         * @param {object} range - Query range (x, y, width, height or x, y, radius)
         * @param {Array} found - Array to store found objects
         * @returns {Array} Found objects
         */
        query: function(range, found) {
            found = found || [];
            
            var rangeX = range.x;
            var rangeY = range.y;
            var rangeWidth = range.width || 0;
            var rangeHeight = range.height || 0;
            
            // Handle radius-based query (circle)
            if (range.radius !== undefined) {
                rangeX = range.x - range.radius;
                rangeY = range.y - range.radius;
                rangeWidth = range.radius * 2;
                rangeHeight = range.radius * 2;
            }
            
            // Check if range intersects this node (correct non-intersection test)
            if (rangeX + rangeWidth < this.x || rangeX > this.x + this.width ||
                rangeY + rangeHeight < this.y || rangeY > this.y + this.height) {
                return found;
            }
            
            // Get objects in this node
            for (var i = 0; i < this.objects.length; i++) {
                var obj = this.objects[i];
                
                if (range.radius !== undefined) {
                    // Circle collision check
                    var dx = (obj.x || 0) - range.x;
                    var dy = (obj.y || 0) - range.y;
                    var distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= range.radius + (obj.radius || 0)) {
                        found.push(obj);
                    }
                } else {
                    // Rectangle collision check
                    if (this.intersects(obj, rangeX, rangeY, rangeWidth, rangeHeight)) {
                        found.push(obj);
                    }
                }
            }
            
            // Query children
            if (!this.isLeaf) {
                for (var i = 0; i < this.nodes.length; i++) {
                    this.nodes[i].query(range, found);
                }
            }
            
            return found;
        },
        
        /**
         * Check if object intersects range
         */
        intersects: function(obj, rangeX, rangeY, rangeWidth, rangeHeight) {
            var objX = obj.x || 0;
            var objY = obj.y || 0;
            var objWidth = obj.width || 0;
            var objHeight = obj.height || 0;
            
            return objX < rangeX + rangeWidth &&
                   objX + objWidth > rangeX &&
                   objY < rangeY + rangeHeight &&
                   objY + objHeight > rangeY;
        },
        
        /**
         * Clear quadtree
         */
        clear: function() {
            this.objects = [];
            
            for (var i = 0; i < this.nodes.length; i++) {
                if (this.nodes[i]) {
                    this.nodes[i].clear();
                }
            }
            
            this.nodes = [];
            this.isLeaf = true;
        },
        
        /**
         * Get all objects
         */
        getAll: function(found) {
            found = found || [];
            
            for (var i = 0; i < this.objects.length; i++) {
                found.push(this.objects[i]);
            }
            
            if (!this.isLeaf) {
                for (var i = 0; i < this.nodes.length; i++) {
                    this.nodes[i].getAll(found);
                }
            }
            
            return found;
        },
        
        /**
         * Get statistics
         */
        getStats: function() {
            var stats = {
                nodes: 1,
                objects: this.objects.length,
                depth: this.level,
                maxDepth: this.level
            };
            
            if (!this.isLeaf) {
                for (var i = 0; i < this.nodes.length; i++) {
                    var childStats = this.nodes[i].getStats();
                    stats.nodes += childStats.nodes;
                    stats.objects += childStats.objects;
                    stats.maxDepth = Math.max(stats.maxDepth, childStats.maxDepth);
                }
            }
            
            return stats;
        }
    };
    
    // Main Quadtree class
    
    var config = {
        maxObjects: 4,
        maxLevels: 8,
        enableDebug: false
    };
    
    var state = {
        root: null,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        objectCount: 0,
        queries: 0,
        queryHits: 0
    };
    
    /**
     * Initialize quadtree
     * @param {number} width - World width
     * @param {number} height - World height
     * @param {object} options - Configuration options
     */
    function init(width, height, options) {
        options = options || {};
        
        config.maxObjects = options.maxObjects || 4;
        config.maxLevels = options.maxLevels || 8;
        config.enableDebug = options.debug || false;
        
        state.bounds = {
            x: options.x || 0,
            y: options.y || 0,
            width: width,
            height: height
        };
        
        state.root = new Node(
            state.bounds.x,
            state.bounds.y,
            state.bounds.width,
            state.bounds.height,
            0,
            config.maxLevels
        );
        
        state.objectCount = 0;
        state.queries = 0;
        state.queryHits = 0;
        
        console.log('[Quadtree] Initialized:', width + 'x' + height, 'maxLevels:', config.maxLevels);
    }
    
    /**
     * Insert object into quadtree
     * @param {object} obj - Object with x, y properties
     */
    function insert(obj) {
        if (!state.root) {
            console.error('[Quadtree] Not initialized');
            return false;
        }
        
        var success = state.root.insert(obj);
        
        if (success) {
            state.objectCount++;
        }
        
        return success;
    }
    
    /**
     * Insert multiple objects
     * @param {Array} objects - Array of objects
     */
    function insertMany(objects) {
        for (var i = 0; i < objects.length; i++) {
            insert(objects[i]);
        }
    }
    
    /**
     * Query for objects in range
     * @param {object} range - Query range
     * @returns {Array} Found objects
     */
    function query(range) {
        if (!state.root) {
            console.error('[Quadtree] Not initialized');
            return [];
        }
        
        state.queries++;
        var results = state.root.query(range);
        state.queryHits += results.length;
        
        if (config.enableDebug) {
            console.log('[Quadtree] Query:', results.length + ' objects found');
        }
        
        return results;
    }
    
    /**
     * Query for nearest objects
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Search radius
     * @param {number} limit - Max results
     * @returns {Array} Nearest objects sorted by distance
     */
    function queryNearest(x, y, radius, limit) {
        var results = query({ x: x, y: y, radius: radius });
        
        // Sort by distance
        results.sort(function(a, b) {
            var distA = Math.sqrt(Math.pow((a.x || 0) - x, 2) + Math.pow((a.y || 0) - y, 2));
            var distB = Math.sqrt(Math.pow((b.x || 0) - x, 2) + Math.pow((b.y || 0) - y, 2));
            return distA - distB;
        });
        
        // Limit results
        if (limit !== undefined && results.length > limit) {
            results = results.slice(0, limit);
        }
        
        return results;
    }
    
    /**
     * Remove object from quadtree
     * @param {object} obj - Object to remove
     * @returns {boolean} Success
     */
    function remove(obj) {
        // Recursively search and remove from nodes
        function removeFromNode(node) {
            var index = node.objects.indexOf(obj);
            if (index !== -1) {
                node.objects.splice(index, 1);
                return true;
            }
            
            if (!node.isLeaf) {
                for (var i = 0; i < node.nodes.length; i++) {
                    if (removeFromNode(node.nodes[i])) {
                        return true;
                    }
                }
            }
            
            return false;
        }
        
        var removed = removeFromNode(state.root);
        if (removed) {
            state.objectCount--;
        }
        return removed;
    }
    
    /**
     * Clear quadtree
     */
    function clear() {
        if (state.root) {
            state.root.clear();
        }
        state.objectCount = 0;
        state.queries = 0;
        state.queryHits = 0;
    }
    
    /**
     * Rebuild quadtree with new objects
     * @param {Array} objects - New objects to insert
     */
    function rebuild(objects) {
        clear();
        insertMany(objects);
    }
    
    /**
     * Get statistics
     * @returns {object} Quadtree statistics
     */
    function getStats() {
        var treeStats = state.root ? state.root.getStats() : { nodes: 0, objects: 0, depth: 0 };
        
        return {
            nodes: treeStats.nodes,
            objects: state.objectCount,
            maxDepth: treeStats.maxDepth,
            queries: state.queries,
            queryHits: state.queryHits,
            averageHitsPerQuery: state.queries > 0 ? state.queryHits / state.queries : 0,
            bounds: state.bounds
        };
    }
    
    /**
     * Visualize quadtree (for debugging)
     * @param {THREE.Scene} scene - Three.js scene
     * @param {number} color - Line color
     */
    function visualize(scene, color) {
        if (!state.root || !scene) return;
        
        color = color !== undefined ? color : 0x00ff00;
        
        function drawNode(node) {
            // Create lines for node bounds
            var points = [
                new THREE.Vector3(node.x, 0, node.y),
                new THREE.Vector3(node.x + node.width, 0, node.y),
                new THREE.Vector3(node.x + node.width, 0, node.y + node.height),
                new THREE.Vector3(node.x, 0, node.y + node.height),
                new THREE.Vector3(node.x, 0, node.y)
            ];
            
            var geometry = new THREE.BufferGeometry().setFromPoints(points);
            var material = new THREE.LineBasicMaterial({ color: color, opacity: 0.3, transparent: true });
            var lines = new THREE.Line(geometry, material);
            
            scene.add(lines);
            
            // Recursively draw children
            if (!node.isLeaf) {
                for (var i = 0; i < node.nodes.length; i++) {
                    drawNode(node.nodes[i]);
                }
            }
        }
        
        drawNode(state.root);
    }
    
    /**
     * Update object position in quadtree
     * @param {object} obj - Object to update
     * @param {number} newX - New X position
     * @param {number} newY - New Y position
     */
    function updatePosition(obj, newX, newY) {
        // Remove and re-insert
        remove(obj);
        obj.x = newX;
        obj.y = newY;
        insert(obj);
    }
    
    // Public API
    return {
        init: init,
        insert: insert,
        insertMany: insertMany,
        query: query,
        queryNearest: queryNearest,
        remove: remove,
        clear: clear,
        rebuild: rebuild,
        getStats: getStats,
        visualize: visualize,
        updatePosition: updatePosition,
        
        // Direct access
        root: state.root,
        bounds: state.bounds,
        config: config
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.Quadtree = Quadtree;
}

console.log('[Quadtree] Module loaded - Spatial partitioning ready');
