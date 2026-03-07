/**
 * Unit Tests: Payment Service
 * Tests for Stripe payment integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/test'
          })
        }
      },
      customers: {
        create: vi.fn().mockResolvedValue({
          id: 'cus_test_123'
        })
      },
      subscriptions: {
        create: vi.fn().mockResolvedValue({
          id: 'sub_test_123',
          status: 'active'
        }),
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_test_123',
          status: 'active',
          current_period_end: Date.now() / 1000 + 86400
        }),
        cancel: vi.fn().mockResolvedValue({
          id: 'sub_test_123',
          status: 'canceled'
        })
      }
    }))
  };
});

import { PaymentService } from '../../services/paymentService.js';

describe('PaymentService', () => {
  let paymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    paymentService = new PaymentService();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session for valid tier', async () => {
      // Mock user database
      vi.mock('../../models/database.js', () => ({
        default: {
          findById: vi.fn().mockReturnValue({
            id: 'user-123',
            email: 'test@example.com'
          })
        }
      }));

      const result = await paymentService.createCheckoutSession(
        'user-123',
        'hunter',
        'monthly'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('cs_test_123');
      expect(result.url).toContain('stripe.com');
    });

    it('should throw error for invalid tier', async () => {
      await expect(
        paymentService.createCheckoutSession('user-123', 'invalid', 'monthly')
      ).rejects.toThrow('Invalid tier or billing cycle');
    });

    it('should throw error for user not found', async () => {
      vi.mock('../../models/database.js', () => ({
        default: {
          findById: vi.fn().mockReturnValue(null)
        }
      }));

      await expect(
        paymentService.createCheckoutSession('user-999', 'hunter', 'monthly')
      ).rejects.toThrow('User not found');
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return active subscription status', async () => {
      const status = await paymentService.getSubscriptionStatus('user-123');
      
      expect(status).toBeDefined();
      expect(status.isActive).toBe(true);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const result = await paymentService.cancelSubscription('user-123');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
