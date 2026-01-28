"use client"

import { Card } from "@/components/ui/card"
import { ExternalLink, MessageSquare, FolderOpen, FileText, Calendar, Mail, Plus, X } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSession } from "@/components/providers/session-provider"
import { 
  fetchSpaceBookmarks, 
  createSpaceBookmark, 
  deleteSpaceBookmark,
  type SpaceBookmark 
} from "@/lib/database-functions"

const initialLinks = [
  { id: 1, name: "Slack Channel", iconName: "MessageSquare", url: "#", color: "#4A154B" },
  { id: 2, name: "Google Drive", iconName: "FolderOpen", url: "#", color: "#4285F4" },
  { id: 3, name: "Shared Docs", iconName: "FileText", url: "#", color: "#6b7280" },
  { id: 4, name: "Calendar", iconName: "Calendar", url: "#", color: "#EA4335" },
  { id: 5, name: "Email Thread", iconName: "Mail", url: "#", color: "#6b7280" },
]

const availableIcons = [
  { name: "MessageSquare", icon: MessageSquare, color: "#4A154B" },
  { name: "FolderOpen", icon: FolderOpen, color: "#4285F4" },
  { name: "FileText", icon: FileText, color: "#6b7280" },
  { name: "Calendar", icon: Calendar, color: "#EA4335" },
  { name: "Mail", icon: Mail, color: "#6b7280" },
  { name: "ExternalLink", icon: ExternalLink, color: "#6b7280" },
]

// Icon name to component mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  MessageSquare,
  FolderOpen,
  FileText,
  Calendar,
  Mail,
  ExternalLink,
}

interface BookmarkLink {
  id: string | number
  name: string
  iconName: string
  url: string
  color: string
  faviconUrl?: string
}

// Helper function to extract root domain from URL
function getDomainFromUrl(url: string): string {
  try {
    // Handle relative URLs
    if (url.startsWith('#') || url.startsWith('/')) {
      return ''
    }
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    let hostname = urlObj.hostname.replace('www.', '')
    
    // Extract root domain (eTLD+1) by taking the last 2 parts
    // This handles cases like:
    // - app.slack.com -> slack.com
    // - drive.google.com -> google.com
    // - subdomain.example.co.uk -> example.co.uk (handles country code TLDs)
    const parts = hostname.split('.')
    
    // Common country code TLDs that need special handling
    const countryCodeTLDs = ['co.uk', 'com.au', 'co.nz', 'co.za', 'com.br', 'com.mx', 'co.jp', 'com.cn']
    
    // Check if it ends with a country code TLD
    const lastTwoParts = parts.slice(-2).join('.')
    if (countryCodeTLDs.some(tld => hostname.endsWith('.' + tld) || hostname.endsWith(tld))) {
      // For country code TLDs, take last 3 parts (e.g., example.co.uk)
      if (parts.length >= 3) {
        return parts.slice(-3).join('.')
      }
    }
    
    // For regular domains, take last 2 parts
    if (parts.length >= 2) {
      return parts.slice(-2).join('.')
    }
    
    return hostname
  } catch {
    return ''
  }
}

// Helper function to get favicon URL
function getFaviconUrl(url: string): string {
  const domain = getDomainFromUrl(url)
  if (!domain) return ''
  // Use Google's favicon service as a reliable source
  // This will fetch the favicon from the root domain
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

interface QuickLinksCardProps {
  activeSpace?: string | null
}

export function QuickLinksCard({ activeSpace }: QuickLinksCardProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [links, setLinks] = useState<BookmarkLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newLink, setNewLink] = useState({ name: "", url: "", iconName: "ExternalLink", color: "#6b7280" })
  const [editingId, setEditingId] = useState<string | number | null>(null)

  // Convert SpaceBookmark to BookmarkLink
  const convertBookmarkToLink = useCallback((bookmark: SpaceBookmark): BookmarkLink => ({
    id: bookmark.id,
    name: bookmark.name,
    iconName: bookmark.icon_name,
    url: bookmark.url,
    color: bookmark.color,
    faviconUrl: bookmark.favicon_url || undefined,
  }), [])

  // Load bookmarks from database
  const loadBookmarks = useCallback(async (companyId: string | null | undefined) => {
    if (!companyId) {
      setLinks([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await fetchSpaceBookmarks(companyId)
      if (result.success && result.bookmarks) {
        setLinks(result.bookmarks.map(convertBookmarkToLink))
      } else {
        console.error("Error loading bookmarks:", result.error)
        setLinks([])
      }
    } catch (error) {
      console.error("Error loading bookmarks:", error)
      setLinks([])
    } finally {
      setIsLoading(false)
    }
  }, [convertBookmarkToLink])

  // Load bookmarks when activeSpace changes
  useEffect(() => {
    loadBookmarks(activeSpace)
  }, [activeSpace, loadBookmarks])

  const handleAddLink = async () => {
    if (!newLink.name || !newLink.url || !activeSpace || !userId) {
      return
    }

    const selectedIcon = availableIcons.find(i => i.name === newLink.iconName) || availableIcons[5]
    const faviconUrl = getFaviconUrl(newLink.url)

    try {
      const result = await createSpaceBookmark(
        activeSpace,
        {
          name: newLink.name,
          url: newLink.url,
          icon_name: newLink.iconName,
          color: selectedIcon.color,
          favicon_url: faviconUrl || undefined,
        },
        userId
      )

      if (result.success && result.bookmark) {
        setLinks([...links, convertBookmarkToLink(result.bookmark)])
        setNewLink({ name: "", url: "", iconName: "ExternalLink", color: "#6b7280" })
        setIsAdding(false)
      } else {
        console.error("Error adding bookmark:", result.error)
      }
    } catch (error) {
      console.error("Error adding bookmark:", error)
    }
  }

  const handleRemoveLink = async (id: string | number) => {
    if (typeof id !== 'string') {
      // Legacy support for numeric IDs (shouldn't happen with database)
      setLinks(links.filter(link => link.id !== id))
      return
    }

    try {
      const result = await deleteSpaceBookmark(id)
      if (result.success) {
        setLinks(links.filter(link => link.id !== id))
      } else {
        console.error("Error deleting bookmark:", result.error)
      }
    } catch (error) {
      console.error("Error deleting bookmark:", error)
    }
  }

  return (
    <Card className="p-4 border-border/60 h-full">
      <div className="flex items-center justify-between mb-3">
        <h4>Bookmarks</h4>
        {activeSpace && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="h-7 px-2"
            disabled={isLoading}
          >
            {isAdding ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>

      <div className="space-y-0.5">
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Loading bookmarks...
          </div>
        ) : !activeSpace ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Select a space to view bookmarks
          </div>
        ) : links.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No bookmarks yet. Click + to add one.
          </div>
        ) : (
          links.map((link) => {
          const Icon = iconMap[link.iconName] || ExternalLink
          // Always use the root domain favicon URL to ensure correct logo
          // If stored faviconUrl exists but might be wrong, regenerate from root domain
          const rootDomainFavicon = getFaviconUrl(link.url)
          const faviconUrl = rootDomainFavicon || link.faviconUrl
          
          return (
            <div
              key={link.id}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted/50 transition-colors group"
              onMouseEnter={() => setEditingId(link.id)}
              onMouseLeave={() => setEditingId(null)}
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 flex-1"
              >
                <div 
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: faviconUrl ? 'transparent' : `${link.color}15` }}
                >
                  {faviconUrl ? (
                    <img 
                      src={faviconUrl} 
                      alt={`${link.name} favicon`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback to icon if favicon fails to load
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.style.backgroundColor = `${link.color}15`
                        }
                      }}
                    />
                  ) : (
                    <Icon className="w-3.5 h-3.5" style={{ color: link.color }} />
                  )}
                </div>
                <span className="text-sm flex-1">{link.name}</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              {editingId === link.id && activeSpace && (
                <button
                  onClick={() => handleRemoveLink(link.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          )
          })
        )}

        {isAdding && (
          <div className="pt-2 space-y-2 border-t border-border/50 mt-2">
            <Input
              placeholder="Bookmark name"
              value={newLink.name}
              onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
              className="h-8 text-sm"
            />
            <Input
              placeholder="URL"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className="h-8 text-sm"
            />
            <select
              value={newLink.iconName}
              onChange={(e) => setNewLink({ ...newLink, iconName: e.target.value })}
              className="w-full h-8 text-sm px-3 rounded-md border border-input bg-background"
            >
              {availableIcons.map((icon) => (
                <option key={icon.name} value={icon.name}>
                  {icon.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddLink}
                className="flex-1 h-7"
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false)
                  setNewLink({ name: "", url: "", iconName: "ExternalLink", color: "#6b7280" })
                }}
                className="flex-1 h-7"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

