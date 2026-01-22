import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // Handle auth errors (e.g., expired OTP)
  if (error) {
    console.error('Auth callback error:', { error, errorCode, errorDescription })
    const errorParams = new URLSearchParams()
    errorParams.set('error', error)
    if (errorCode) errorParams.set('error_code', errorCode)
    return NextResponse.redirect(`${origin}/login?${errorParams.toString()}`)
  }

  // Exchange code for session
  if (code) {
    try {
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Failed to exchange code for session:', exchangeError)
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
      }
    } catch (err) {
      console.error('Unexpected error during code exchange:', err)
      return NextResponse.redirect(`${origin}/login?error=server_error`)
    }
  }

  // Validate and redirect to next parameter or fallback to dashboard
  // Only allow relative paths starting with / to prevent open redirect attacks
  const redirectPath = next && next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(`${origin}${redirectPath}`)
}
