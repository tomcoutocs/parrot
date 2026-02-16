"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GeneralSettings } from '../components/settings/general-settings'
import { ScoringSettings } from '../components/settings/scoring-settings'
import { IntegrationSettings } from '../components/settings/integration-settings'
import { NotificationSettings } from '../components/settings/notification-settings'
import { CustomizationSettings } from '../components/settings/customization-settings'
import { CustomFieldsSettings } from '../components/settings/custom-fields-settings'

export function LeadSettings() {
  return (
    <div className="space-y-6">

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="scoring">
          <ScoringSettings />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="customization">
          <CustomizationSettings />
        </TabsContent>

        <TabsContent value="custom-fields">
          <CustomFieldsSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

