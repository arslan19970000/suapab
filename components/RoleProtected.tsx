'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface RoleProtectedProps {
  children: React.ReactNode
  allowedRole: string
}

export default function RoleProtected({ children, allowedRole }: RoleProtectedProps) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkRole = async () => {
      try {
        // 1. Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('Session error:', sessionError.message)
          router.replace('/auth/login')
          return
        }

        const user = session?.user
        if (!user) {
          console.warn('No user found in session')
          router.replace('/auth/login')
          return
        }

        // 2. Fetch profile + role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError.message)
          router.replace('/auth/login')
          return
        }

        console.log('User role:', profile?.role, 'AllowedRole:', allowedRole)

        // 3. Role check
        // if (profile && profile.role && profile.role.toLowerCase() === allowedRole.toLowerCase()) {
          setAllowed(true)
        // } else {
          // console.warn('Role mismatch or missing role for user', user.email)
          // router.replace('/auth/login')
        // }
      } catch (err) {
        console.error('Unexpected error in RoleProtected:', err)
        router.replace('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [allowedRole, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  return allowed ? <>{children}</> : null
}
