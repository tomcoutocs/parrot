"use client"

import { useState, useEffect } from "react"
import { MetricsCard } from "./metrics-card"
import { QuickLinksCard } from "./quick-links-card"
import { ProjectsOverview } from "./projects-overview"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form } from "@/lib/supabase"
import { fetchFormsForSpace, hasUserSubmittedForm } from "@/lib/database-functions"
import { useSession } from "@/components/providers/session-provider"
import { FileText } from "lucide-react"

interface ModernOverviewTabProps {
  activeSpace: string | null
  onNavigateToTab?: (tab: string) => void
}

export function ModernOverviewTab({ activeSpace, onNavigateToTab }: ModernOverviewTabProps) {
  const { data: session } = useSession()
  const [onboardingForm, setOnboardingForm] = useState<Form | null>(null)
  const [hasSubmittedOnboarding, setHasSubmittedOnboarding] = useState(false)
  const [checkingSubmission, setCheckingSubmission] = useState(false)

  // Check for onboarding form and submission status
  const checkOnboardingForm = async () => {
    if (!activeSpace || !session?.user?.id) {
      setOnboardingForm(null)
      setHasSubmittedOnboarding(false)
      return
    }

    setCheckingSubmission(true)
    try {
      // Fetch forms assigned to this space
      const assignedForms = await fetchFormsForSpace(activeSpace)
      
      // Find onboarding form
      const onboarding = assignedForms.find(form => 
        form.title.toLowerCase() === 'onboarding' || 
        form.title.toLowerCase().includes('onboarding')
      )

      if (onboarding) {
        setOnboardingForm(onboarding)
        
        // Check if user has submitted this form
        const submitted = await hasUserSubmittedForm(session.user.id, onboarding.id, activeSpace)
        setHasSubmittedOnboarding(submitted)
      } else {
        setOnboardingForm(null)
        setHasSubmittedOnboarding(false)
      }
    } catch (error) {
      console.error('Error checking onboarding form:', error)
      setOnboardingForm(null)
      setHasSubmittedOnboarding(false)
    } finally {
      setCheckingSubmission(false)
    }
  }

  useEffect(() => {
    checkOnboardingForm()
  }, [activeSpace, session?.user?.id])

  // Listen for form submission events to refresh onboarding status
  useEffect(() => {
    const handleFormSubmitted = () => {
      // Refresh onboarding form status after submission
      if (activeSpace && session?.user?.id) {
        checkOnboardingForm()
      }
    }

    window.addEventListener('formSubmitted', handleFormSubmitted)
    return () => {
      window.removeEventListener('formSubmitted', handleFormSubmitted)
    }
  }, [activeSpace, session?.user?.id])

  const handleFillOnboardingForm = () => {
    if (onNavigateToTab && onboardingForm) {
      onNavigateToTab('forms')
      // Trigger form fill after a short delay to ensure forms tab is loaded
      setTimeout(() => {
        const event = new CustomEvent('fillOnboardingForm', { detail: { formId: onboardingForm.id } })
        window.dispatchEvent(event)
      }, 100)
    }
  }

  return (
    <div className="space-y-4 -m-8 p-8">
      {/* Onboarding Form Card */}
      {onboardingForm && !hasSubmittedOnboarding && !checkingSubmission && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Complete Onboarding</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Please fill out the onboarding form to get started
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleFillOnboardingForm}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Fill Form
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Row: Metrics and Bookmarks */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <MetricsCard activeSpace={activeSpace || "1"} />
        </div>
        <div className="col-span-1">
          <QuickLinksCard activeSpace={activeSpace} />
        </div>
      </div>

      {/* Projects/Lists Table */}
      <ProjectsOverview activeSpace={activeSpace || "1"} />
    </div>
  )
}

