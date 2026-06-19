import { loadStripe } from '@stripe/stripe-js';

/**
 * stripe.js — Loads Stripe.js with a test-mode publishable key.
 *
 * Publishable keys are safe to embed client-side (they can't move money on
 * their own). Set VITE_STRIPE_PUBLISHABLE_KEY in a .env file to point this
 * at your own Stripe account's test key — see .env.example. Falls back to
 * Stripe's own public demo key so card capture works out of the box.
 */
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx';

export const stripePromise = loadStripe(PUBLISHABLE_KEY);
