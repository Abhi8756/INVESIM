'use client'

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: 
              "bg-primary hover:bg-primary/90 text-sm normal-case"
          }
        }}
      />
    </div>
  )
}
