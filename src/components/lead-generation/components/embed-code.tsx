"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function EmbedCode({ formId }: { formId: string | null }) {
  const [copied, setCopied] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'
  
  const embedCode = `<script src="${baseUrl}/lead-generation/widget.js"></script>
<script>
  LeadGen.init({
    formId: '${formId || 'your-form-id'}',
    container: '#lead-form-container'
  });
</script>`

  const iframeCode = `<iframe 
  src="${baseUrl}/apps/lead-generation/embed/${formId || 'your-form-id'}"
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: none;">
</iframe>`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed Code</CardTitle>
        <CardDescription>
          Copy and paste this code to embed your form on your website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="script">
          <TabsList>
            <TabsTrigger value="script">JavaScript</TabsTrigger>
            <TabsTrigger value="iframe">iFrame</TabsTrigger>
            <TabsTrigger value="direct">Direct Link</TabsTrigger>
          </TabsList>

          <TabsContent value="script" className="space-y-2">
            <Label>JavaScript Embed Code</Label>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                <code>{embedCode}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(embedCode)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="iframe" className="space-y-2">
            <Label>iFrame Embed Code</Label>
            <div className="relative">
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                <code>{iframeCode}</code>
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(iframeCode)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="direct" className="space-y-2">
            <Label>Direct Link</Label>
            <div className="flex gap-2">
              <Input
                value={`${baseUrl}/apps/lead-generation/form/${formId || 'your-form-id'}`}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(`${baseUrl}/apps/lead-generation/form/${formId || 'your-form-id'}`)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

