'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/reports?resolved=false')
  }, [router])

  return <Suspense fallback={<div></div>}></Suspense>
}
