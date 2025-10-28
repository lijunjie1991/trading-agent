import { loadStripe } from '@stripe/stripe-js'

let stripePromise = null

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      throw new Error('Stripe publishable key is not configured')
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

export const resetStripe = () => {
  stripePromise = null
}
