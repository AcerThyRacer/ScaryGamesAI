/**
 * Unit Tests: Behavior Tree
 * Tests for AI behavior tree system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BTNode,
  BTSequence,
  BTSelector,
  BTCondition,
  BTAction,
  BTWait
} from '../../js/core/ai/behavior-tree.js';

describe('Behavior Tree', () => {
  describe('BTNode', () => {
    it('should create a node with default options', () => {
      const node = new BTNode();
      expect(node.name).toBe('Node');
      expect(node.children).toEqual([]);
      expect(node.status).toBe('idle');
    });

    it('should create a node with custom options', () => {
      const node = new BTNode({ name: 'CustomNode' });
      expect(node.name).toBe('CustomNode');
    });

    it('should execute first child if exists', () => {
      const parent = new BTNode();
      const child = new BTCondition({
        condition: () => true
      });
      parent.addChild(child);
      
      const result = parent.execute({}, 0.016);
      expect(result).toBe('success');
    });

    it('should return success if no children', () => {
      const node = new BTNode();
      const result = node.execute({}, 0.016);
      expect(result).toBe('success');
    });

    it('should add child and set parent', () => {
      const parent = new BTNode();
      const child = new BTNode();
      
      parent.addChild(child);
      
      expect(parent.children).toHaveLength(1);
      expect(child.parent).toBe(parent);
    });

    it('should reset node status and children', () => {
      const node = new BTNode({ name: 'TestNode' });
      node.status = 'running';
      const child = new BTNode();
      child.status = 'success';
      node.addChild(child);
      
      node.reset();
      
      expect(node.status).toBe('idle');
      expect(child.status).toBe('idle');
    });
  });

  describe('BTSequence', () => {
    it('should succeed when all children succeed', () => {
      const seq = new BTSequence();
      seq.addChild(new BTCondition({ condition: () => true }));
      seq.addChild(new BTCondition({ condition: () => true }));
      
      const result = seq.execute({}, 0.016);
      expect(result).toBe('success');
      expect(seq.status).toBe('success');
    });

    it('should fail when first child fails', () => {
      const seq = new BTSequence();
      seq.addChild(new BTCondition({ condition: () => false }));
      seq.addChild(new BTCondition({ condition: () => true }));
      
      const result = seq.execute({}, 0.016);
      expect(result).toBe('failure');
      expect(seq.status).toBe('failure');
    });

    it('should return running when child is running', () => {
      const seq = new BTSequence();
      const waitNode = new BTWait({ duration: 1000 });
      seq.addChild(waitNode);
      
      const result = seq.execute({}, 0.016);
      expect(result).toBe('running');
      expect(seq.status).toBe('running');
    });
  });

  describe('BTSelector', () => {
    it('should succeed when first child succeeds', () => {
      const sel = new BTSelector();
      sel.addChild(new BTCondition({ condition: () => true }));
      sel.addChild(new BTCondition({ condition: () => false }));
      
      const result = sel.execute({}, 0.016);
      expect(result).toBe('success');
      expect(sel.status).toBe('success');
    });

    it('should try next child when first fails', () => {
      const sel = new BTSelector();
      sel.addChild(new BTCondition({ condition: () => false }));
      sel.addChild(new BTCondition({ condition: () => true }));
      
      const result = sel.execute({}, 0.016);
      expect(result).toBe('success');
    });

    it('should fail when all children fail', () => {
      const sel = new BTSelector();
      sel.addChild(new BTCondition({ condition: () => false }));
      sel.addChild(new BTCondition({ condition: () => false }));
      
      const result = sel.execute({}, 0.016);
      expect(result).toBe('failure');
      expect(sel.status).toBe('failure');
    });
  });

  describe('BTCondition', () => {
    it('should succeed when condition is true', () => {
      const cond = new BTCondition({
        condition: (agent) => agent.health > 50
      });
      
      const agent = { health: 75 };
      const result = cond.execute(agent, 0.016);
      expect(result).toBe('success');
    });

    it('should fail when condition is false', () => {
      const cond = new BTCondition({
        condition: (agent) => agent.health > 50
      });
      
      const agent = { health: 25 };
      const result = cond.execute(agent, 0.016);
      expect(result).toBe('failure');
    });
  });

  describe('BTAction', () => {
    it('should execute action and return result', () => {
      const action = new BTAction({
        action: (agent, dt) => {
          agent.health -= 10;
          return 'success';
        }
      });
      
      const agent = { health: 100 };
      const result = action.execute(agent, 0.016);
      
      expect(result).toBe('success');
      expect(agent.health).toBe(90);
    });
  });

  describe('BTWait', () => {
    it('should return running while waiting', () => {
      const wait = new BTWait({ duration: 100 });
      const result = wait.execute({}, 0.016);
      expect(result).toBe('running');
    });

    it('should succeed after duration', () => {
      const wait = new BTWait({ duration: 0.01 });
      wait.execute({}, 0.016); // First call starts timer
      const result = wait.execute({}, 0.016); // Second call should succeed
      expect(result).toBe('success');
    });

    it('should reset timer on reset', () => {
      const wait = new BTWait({ duration: 100 });
      wait.execute({}, 50); // Timer at 50ms
      wait.reset();
      expect(wait.timer).toBe(0);
    });
  });
});
