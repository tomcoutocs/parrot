"use client"

import { useState, useEffect } from 'react'
import { fetchFormSubmissions } from '@/lib/database-functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Search, Download, Eye, Calendar, User } from 'lucide-react'
import { Form, FormSubmission } from '@/lib/supabase'
import { format } from 'date-fns'
import { Label } from '@/components/ui/label'

interface ViewSubmissionsModalProps {
  isOpen: boolean
  onClose: () => void
  form: Form
}

interface SubmissionWithUser extends FormSubmission {
  user?: {
    id: string
    full_name: string
    email: string
  }
}

export default function ViewSubmissionsModal({ isOpen, onClose, form }: ViewSubmissionsModalProps) {
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithUser | null>(null)

  // Load submissions when modal opens
  useEffect(() => {
    if (isOpen && form) {
      loadSubmissions()
    }
  }, [isOpen, form])

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const submissionsData = await fetchFormSubmissions(form.id)
      setSubmissions(submissionsData as SubmissionWithUser[])
    } catch (error) {
      console.error('Error loading submissions:', error)
      setError('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const filteredSubmissions = submissions.filter(submission => {
    const searchLower = searchTerm.toLowerCase()
    const userName = submission.user?.full_name?.toLowerCase() || ''
    const userEmail = submission.user?.email?.toLowerCase() || ''
    const submissionData = JSON.stringify(submission.submission_data).toLowerCase()
    
    return userName.includes(searchLower) || 
           userEmail.includes(searchLower) || 
           submissionData.includes(searchLower)
  })

  const getFieldValue = (submission: SubmissionWithUser, fieldId: string) => {
    const value = submission.submission_data[fieldId]
    if (value === null || value === undefined) return 'Not provided'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) return

    const headers = ['User', 'Email', 'Submitted At']
    form.fields.forEach(field => {
      headers.push(field.label)
    })

    const csvData = [
      headers.join(','),
      ...filteredSubmissions.map(submission => {
        const row = [
          submission.user?.full_name || 'Unknown',
          submission.user?.email || 'Unknown',
          format(new Date(submission.submitted_at), 'yyyy-MM-dd HH:mm:ss')
        ]
        
        form.fields.forEach(field => {
          row.push(`"${getFieldValue(submission, field.id)}"`)
        })
        
        return row.join(',')
      })
    ].join('\n')

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.title}_submissions.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportSingleSubmission = (submission: SubmissionWithUser) => {
    const headers = ['User', 'Email', 'Submitted At']
    form.fields.forEach(field => {
      headers.push(field.label)
    })

    const row = [
      submission.user?.full_name || 'Unknown',
      submission.user?.email || 'Unknown',
      format(new Date(submission.submitted_at), 'yyyy-MM-dd HH:mm:ss')
    ]
    
    form.fields.forEach(field => {
      row.push(`"${getFieldValue(submission, field.id)}"`)
    })

    const csvData = [headers.join(','), row.join(',')].join('\n')

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.title}_submission_${submission.id}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedSubmission(null)
      setSearchTerm('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submissions for: {form.title}</DialogTitle>
          <DialogDescription>
            View and manage form submissions. {submissions.length} total submissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Export */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={filteredSubmissions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Loading submissions...</span>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No submissions found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Submissions Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {submission.user?.full_name || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {submission.user?.email || 'No email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(submission.submitted_at), 'HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => exportSingleSubmission(submission)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Export
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Submission Details Modal */}
              {selectedSubmission && (
                <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
                  <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <DialogTitle>Submission Details</DialogTitle>
                          <DialogDescription>
                            Submitted by {selectedSubmission.user?.full_name} on{' '}
                            {format(new Date(selectedSubmission.submitted_at), 'MMM d, yyyy HH:mm')}
                          </DialogDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportSingleSubmission(selectedSubmission)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export CSV
                        </Button>
                      </div>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* User Info */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center">
                            <User className="h-5 w-5 mr-2" />
                            User Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Name</Label>
                              <p className="text-sm text-gray-600">
                                {selectedSubmission.user?.full_name || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Email</Label>
                              <p className="text-sm text-gray-600">
                                {selectedSubmission.user?.email || 'No email'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Form Responses */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Form Responses</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {form.fields.map((field) => (
                              <div key={field.id} className="border-b pb-3 last:border-b-0">
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-sm font-medium">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </Label>
                                  <Badge variant="outline" className="text-xs">
                                    {field.type}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-700">
                                  {getFieldValue(selectedSubmission, field.id)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Submission Metadata */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center">
                            <Calendar className="h-5 w-5 mr-2" />
                            Submission Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Submission ID</Label>
                              <p className="text-sm text-gray-600 font-mono">
                                {selectedSubmission.id}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Submitted At</Label>
                              <p className="text-sm text-gray-600">
                                {format(new Date(selectedSubmission.submitted_at), 'MMM d, yyyy HH:mm:ss')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 