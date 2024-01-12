'use client'
import { Suspense } from 'react'
import RepositoriesListPage from './page-content'

export default function Repositories() {
  return (
    <Suspense fallback={<div></div>}>
      <RepositoriesListPage />
    </Suspense>
  )
}
