const PAYSTACK_API = 'https://api.paystack.co'

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}

function corsHeaders(origin) {
  const allowedOrigin = origin || '*'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

function withCors(response, origin) {
  const headers = new Headers(response.headers)

  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function sha512Hmac(secret, message) {
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-512',
    },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  )

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }

  if (a.length !== b.length) {
    return false
  }

  let result = 0

  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

async function paystackRequest(path, options, secretKey) {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })

  const text = await response.text()

  let data

  try {
    data = JSON.parse(text)
  } catch {
    data = {
      status: false,
      message: text || 'Invalid response from Paystack.',
    }
  }

  return {
    response,
    data,
  }
}

async function supabaseRequest(path, options, env) {
  return fetch(`${env.SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
}

async function getAuthenticatedUser(request, env) {
  const authorization = request.headers.get('Authorization')

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }

  const accessToken = authorization.slice('Bearer '.length).trim()

  if (!accessToken) {
    return null
  }

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

function makeReference() {
  const randomPart = crypto.randomUUID()
    .replace(/-/g, '')
    .slice(0, 12)

  return `VERITAS${Date.now()}${randomPart}`
}

async function initializePaystack(request, env) {
  let body

  try {
    body = await request.json()
  } catch {
    return jsonResponse({
      success: false,
      message: 'Invalid request body.',
    }, 400)
  }

  const amount = Number(body?.amount)

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponse({
      success: false,
      message: 'Enter a valid deposit amount.',
    }, 400)
  }

  if (amount < 3) {
    return jsonResponse({
      success: false,
      message: 'The minimum Paystack deposit is KES 3.',
    }, 400)
  }

  const user = await getAuthenticatedUser(request, env)

  if (!user?.id || !user?.email) {
    return jsonResponse({
      success: false,
      message: 'Your session is invalid or expired. Please log in again.',
    }, 401)
  }

  const reference = makeReference()

  const roundedAmount = Math.round(amount * 100) / 100
  const amountInSubunit = Math.round(roundedAmount * 100)

  const insertResponse = await supabaseRequest('/rest/v1/deposits', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: user.id,
      amount: roundedAmount,
      method: 'Paystack',
      reference,
      status: 'Pending',
      bonus_amount: 0,
    }),
  }, env)

  if (!insertResponse.ok) {
    const errorText = await insertResponse.text()

    console.error('Supabase deposit insert failed:', errorText)

    return jsonResponse({
      success: false,
      message: 'Unable to create the deposit request.',
    }, 500)
  }

  const callbackUrl =
    `${new URL(request.url).origin}/wallet?paystack=callback`

  const metadata = {
    veritas_user_id: user.id,
    veritas_deposit_reference: reference,
    email: user.email,
  }

  const paystack = await paystackRequest(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        amount: String(amountInSubunit),
        currency: 'KES',
        reference,
        callback_url: callbackUrl,
        metadata: JSON.stringify(metadata),
        channels: [
          'card',
          'mobile_money',
          'bank',
          'bank_transfer',
        ],
      }),
    },
    env.PAYSTACK_SECRET_KEY
  )

  if (
    !paystack.response.ok ||
    !paystack.data?.status ||
    !paystack.data?.data?.authorization_url
  ) {
    console.error(
      'Paystack initialization failed:',
      JSON.stringify(paystack.data)
    )

    await supabaseRequest(
      `/rest/v1/deposits?reference=eq.${encodeURIComponent(reference)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Rejected',
          admin_note: 'Paystack transaction initialization failed.',
          updated_at: new Date().toISOString(),
        }),
      },
      env
    )

    return jsonResponse({
      success: false,
      message: paystack.data?.message ||
        'Paystack could not initialize the payment.',
    }, 502)
  }

  return jsonResponse({
    success: true,
    authorization_url: paystack.data.data.authorization_url,
    access_code: paystack.data.data.access_code,
    reference: paystack.data.data.reference,
  })
}

/*
  This function verifies a successful Paystack transaction and then
  asks Supabase to process the matching VERITAS deposit.

  It is used by both:
  1. The Paystack webhook.
  2. The browser callback when Paystack returns the user to /wallet.

  The database function is responsible for the actual wallet credit
  and prevents the same deposit from being credited twice.
*/
async function verifyAndProcessPaystackReference(reference, env) {
  if (!reference) {
    return {
      success: false,
      status: 400,
      message: 'Missing Paystack reference.',
    }
  }

  const verification = await paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: 'GET',
    },
    env.PAYSTACK_SECRET_KEY
  )

  if (
    !verification.response.ok ||
    !verification.data?.status ||
    verification.data?.data?.status !== 'success' ||
    verification.data?.data?.currency !== 'KES'
  ) {
    console.error(
      'Paystack verification failed:',
      JSON.stringify(verification.data)
    )

    return {
      success: false,
      status: 400,
      message: 'Paystack payment could not be verified.',
    }
  }

  const transaction = verification.data.data

  const verifiedReference = transaction?.reference
  const verifiedAmountInSubunit = Number(transaction?.amount)
  const paystackTransactionId = String(transaction?.id || '')

  if (
    !verifiedReference ||
    verifiedReference !== reference ||
    !Number.isFinite(verifiedAmountInSubunit) ||
    verifiedAmountInSubunit <= 0 ||
    !paystackTransactionId
  ) {
    console.error(
      'Invalid verified Paystack transaction:',
      JSON.stringify(transaction)
    )

    return {
      success: false,
      status: 400,
      message: 'Invalid Paystack transaction.',
    }
  }

  const verifiedAmount =
    Math.round((verifiedAmountInSubunit / 100) * 100) / 100

  /*
    First check that this reference belongs to a VERITAS Paystack
    deposit. This also lets us compare the amount before crediting.
  */
  const depositResponse = await supabaseRequest(
    `/rest/v1/deposits?reference=eq.${encodeURIComponent(reference)}&method=eq.Paystack&select=id,user_id,amount,status`,
    {
      method: 'GET',
    },
    env
  )

  if (!depositResponse.ok) {
    const errorText = await depositResponse.text()

    console.error(
      'Unable to find Paystack deposit:',
      errorText
    )

    return {
      success: false,
      status: 500,
      message: 'Unable to find the VERITAS deposit.',
    }
  }

  const deposits = await depositResponse.json()
  const deposit = Array.isArray(deposits) ? deposits[0] : null

  if (!deposit) {
    console.error(
      'No VERITAS Paystack deposit found for reference:',
      reference
    )

    return {
      success: false,
      status: 404,
      message: 'VERITAS deposit not found.',
    }
  }

  const expectedAmount =
    Math.round(Number(deposit.amount) * 100) / 100

  if (
    !Number.isFinite(expectedAmount) ||
    expectedAmount !== verifiedAmount
  ) {
    console.error(
      'Paystack amount mismatch:',
      JSON.stringify({
        reference,
        expectedAmount,
        verifiedAmount,
      })
    )

    return {
      success: false,
      status: 400,
      message: 'Paystack amount does not match the VERITAS deposit.',
    }
  }

  /*
    If already approved, do not credit it again.
  */
  if (deposit.status === 'Approved') {
    return {
      success: true,
      alreadyProcessed: true,
      amount: verifiedAmount,
      reference,
    }
  }

  const rpcResponse = await supabaseRequest(
    '/rest/v1/rpc/process_paystack_deposit',
    {
      method: 'POST',
      body: JSON.stringify({
        p_reference: reference,
        p_amount: verifiedAmount,
        p_paystack_transaction_id: paystackTransactionId,
      }),
    },
    env
  )

  if (!rpcResponse.ok) {
    const errorText = await rpcResponse.text()

    console.error(
      'Paystack wallet processing failed:',
      errorText
    )

    return {
      success: false,
      status: 500,
      message: 'Wallet processing failed.',
    }
  }

  return {
    success: true,
    alreadyProcessed: false,
    amount: verifiedAmount,
    reference,
  }
}

async function handlePaystackCallback(request, env) {
  const url = new URL(request.url)

  const reference =
    url.searchParams.get('reference') ||
    url.searchParams.get('trxref')

  if (!reference) {
    return null
  }

  /*
    Only process references that look like VERITAS Paystack references.
  */
  if (!reference.startsWith('VERITAS')) {
    return null
  }

  try {
    const result = await verifyAndProcessPaystackReference(
      reference,
      env
    )

    console.log(
      'Paystack callback verification:',
      JSON.stringify(result)
    )

    /*
      We deliberately do not block the wallet page if verification
      fails. The webhook can still retry/process the payment.
    */
    return result
  } catch (error) {
    console.error(
      'Paystack callback verification error:',
      error
    )

    return {
      success: false,
      status: 500,
      message: 'Paystack verification temporarily failed.',
    }
  }
}

async function handlePaystackWebhook(request, env) {
  const rawBody = await request.text()

  const signature =
    request.headers.get('x-paystack-signature') || ''

  if (!signature) {
    return new Response('Missing signature.', {
      status: 401,
    })
  }

  const expectedSignature = await sha512Hmac(
    env.PAYSTACK_SECRET_KEY,
    rawBody
  )

  if (!safeEqual(signature, expectedSignature)) {
    console.warn(
      'Rejected Paystack webhook: invalid signature.'
    )

    return new Response('Invalid signature.', {
      status: 401,
    })
  }

  let event

  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON.', {
      status: 400,
    })
  }

  if (event?.event !== 'charge.success') {
    return new Response('OK', {
      status: 200,
    })
  }

  const transaction = event?.data

  const reference = transaction?.reference
  const transactionStatus = transaction?.status
  const currency = transaction?.currency
  const paystackAmount = Number(transaction?.amount)
  const paystackTransactionId = String(transaction?.id || '')

  if (
    !reference ||
    transactionStatus !== 'success' ||
    currency !== 'KES' ||
    !Number.isFinite(paystackAmount) ||
    paystackAmount <= 0 ||
    !paystackTransactionId
  ) {
    return new Response('OK', {
      status: 200,
    })
  }

  try {
    const result = await verifyAndProcessPaystackReference(
      reference,
      env
    )

    if (!result.success) {
      console.error(
        'Paystack webhook processing failed:',
        JSON.stringify(result)
      )

      return new Response(
        'Wallet processing failed.',
        {
          status: 500,
        }
      )
    }

    console.log(
      'Paystack webhook processed:',
      JSON.stringify(result)
    )

    return new Response('OK', {
      status: 200,
    })
  } catch (error) {
    console.error(
      'Paystack webhook processing error:',
      error
    )

    return new Response(
      'Wallet processing failed.',
      {
        status: 500,
      }
    )
  }
}

async function handleApi(request, env) {
  const url = new URL(request.url)

  if (url.pathname === '/api/paystack/initialize') {
    if (request.method !== 'POST') {
      return jsonResponse({
        success: false,
        message: 'Method not allowed.',
      }, 405)
    }

    return initializePaystack(request, env)
  }

  if (url.pathname === '/api/paystack/webhook') {
    if (request.method !== 'POST') {
      return new Response('Method not allowed.', {
        status: 405,
      })
    }

    return handlePaystackWebhook(request, env)
  }

  if (url.pathname === '/api/paystack/health') {
    return jsonResponse({
      success: true,
      service: 'VERITAS Paystack API',
      environment: 'test',
    })
  }

  return null
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*'

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      })
    }

    const url = new URL(request.url)

    /*
      Paystack returns the customer to /wallet with a reference.

      Before serving the normal Vite wallet page, verify and process
      that reference server-side. This means the wallet can be
      credited even if Paystack does not deliver its webhook.
    */
    if (
      request.method === 'GET' &&
      url.pathname === '/wallet' &&
      (
        url.searchParams.has('reference') ||
        url.searchParams.has('trxref')
      )
    ) {
      await handlePaystackCallback(request, env)
    }

    if (url.pathname.startsWith('/api/paystack/')) {
      try {
        const response = await handleApi(request, env)

        if (response) {
          return withCors(response, origin)
        }
      } catch (error) {
        console.error(
          'Paystack Worker error:',
          error
        )

        return withCors(
          jsonResponse({
            success: false,
            message: 'Paystack service temporarily unavailable.',
          }, 500),
          origin
        )
      }
    }

    /*
      All normal VERITAS pages continue to come from Vite's
      dist folder through Cloudflare Assets.
    */
    return env.ASSETS.fetch(request)
  },
}

