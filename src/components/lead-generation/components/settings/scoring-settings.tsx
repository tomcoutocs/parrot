"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const scoringRules = [
  { id: '1', criteria: 'Email Domain', condition: 'Contains', value: '@company.com', points: 20 },
  { id: '2', criteria: 'Company Size', condition: 'Greater than', value: '100', points: 15 },
  { id: '3', criteria: 'Page Visited', condition: 'Equals', value: 'Pricing', points: 25 },
]

export function ScoringSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Scoring Rules</CardTitle>
          <CardDescription>
            Configure how leads are scored automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {scoringRules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2 p-3 border rounded-lg">
                <div className="flex-1 grid grid-cols-4 gap-2">
                  <Select defaultValue={rule.criteria}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Email Domain">Email Domain</SelectItem>
                      <SelectItem value="Company Size">Company Size</SelectItem>
                      <SelectItem value="Page Visited">Page Visited</SelectItem>
                      <SelectItem value="Industry">Industry</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue={rule.condition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contains">Contains</SelectItem>
                      <SelectItem value="Equals">Equals</SelectItem>
                      <SelectItem value="Greater than">Greater than</SelectItem>
                      <SelectItem value="Less than">Less than</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input defaultValue={rule.value} placeholder="Value" />
                  <Input type="number" defaultValue={rule.points} placeholder="Points" />
                </div>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
          <div className="pt-4 border-t">
            <Button variant="outline">Save Scoring Rules</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

