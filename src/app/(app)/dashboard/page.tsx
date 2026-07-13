import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardDispatcher() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch preferred role from database profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_role')
    .eq('id', user.id)
    .single()

  if (profile?.preferred_role === 'teacher') {
    redirect('/teacher/dashboard')
  } else {
    redirect('/student/dashboard')
  }
}
