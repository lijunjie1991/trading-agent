import { loadStripe } from '@stripe/stripe-js'

let stripePromise = null

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = "pk_test_51SKMM2J3N6QMImyOoRKmtnccq1tPRc8eEfs5aIxpTLAvPp6TtWfbVgMDPqaRLArZnrrPp84dEHePVApsaIov9U4D00s8c2xyXH"
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
