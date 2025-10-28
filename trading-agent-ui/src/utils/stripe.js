let stripePromise = null
let stripeScriptLoading = null

const STRIPE_JS_SRC = 'https://js.stripe.com/v3/'

const loadStripeScript = () => {
  if (stripeScriptLoading) {
    return stripeScriptLoading
  }
  stripeScriptLoading = new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = STRIPE_JS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Stripe.js'))
    document.body.appendChild(script)
  })
  return stripeScriptLoading
}

export const getStripe = async () => {
  if (stripePromise) {
    return stripePromise
  }

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  if (!publishableKey) {
    throw new Error('Stripe publishable key is not configured')
  }

  await loadStripeScript()

  if (!window.Stripe) {
    throw new Error('Stripe.js failed to initialize')
  }

  stripePromise = window.Stripe(publishableKey)
  return stripePromise
}
