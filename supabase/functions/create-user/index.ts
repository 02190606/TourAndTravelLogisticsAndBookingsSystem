import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CreateUserPayload {
  email: string
  password: string
  full_name: string
  role: 'admin' | 'logistics' | 'trips'
  phone: string
  is_active: boolean
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!caller || caller.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admins only' }), { status: 403 })
  }

  const payload: CreateUserPayload = await req.json()

  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
  })

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 })
  }

  const { error: dbError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: payload.email,
      role: payload.role,
      full_name: payload.full_name,
      phone: payload.phone,
      is_active: payload.is_active,
    })

  if (dbError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return new Response(JSON.stringify({ error: dbError.message }), { status: 500 })
  }

  return new Response(
    JSON.stringify({
      id: authData.user.id,
      email: payload.email,
      password: payload.password,
      full_name: payload.full_name,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
