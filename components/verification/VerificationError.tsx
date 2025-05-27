'use client'

import { Card } from '@/common/Card'
import { Component, ReactNode } from 'react'

interface VerificationErrorBoundaryProps {
  children: ReactNode
  uri?: string
}

class VerificationErrorBoundary extends Component<
  VerificationErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Verification item error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mb-3 text-sm px-3 text-red-500 dark:text-red-300">
          Something went wrong when showing verification.
          <br />
          {this.props.uri}
        </Card>
      )
    }

    return this.props.children
  }
}

export default VerificationErrorBoundary
