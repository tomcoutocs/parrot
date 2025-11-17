"use client"

import { Card } from "@/components/ui/card"
import { ExternalLink, MessageSquare, FolderOpen, FileText, Calendar, Mail, Plus, X } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSession } from "@/components/providers/session-provider"

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
  id: number
  name: string
  iconName: string
  url: string
  color: string
  faviconUrl?: string
}

// Helper function to extract domain from URL
function getDomainFromUrl(url: string): string {
  try {
    // Handle relative URLs
    if (url.startsWith('#') || url.startsWith('/')) {
      return ''
    }
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}

// Helper function to get favicon URL
function getFaviconUrl(url: string): string {
  const domain = getDomainFromUrl(url)
  if (!domain) return ''
  // Use Google's favicon service as a reliable source
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

const STORAGE_KEY = "bookmarks"

export function QuickLinksCard() {
  const { data: session } = useSession()
  const userId = session?.user?.id || "default"
  const storageKey = `${STORAGE_KEY}_${userId}`
  
  // Load bookmarks from localStorage
  const loadBookmarks = (key: string): BookmarkLink[] => {
    if (typeof window === "undefined") return []
    
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored) as BookmarkLink[]
        // Validate that all links have required fields
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(link => 
            link.id && link.name && link.iconName && link.url && link.color
          )
        }
      }
    } catch (error) {
      console.error("Error loading bookmarks:", error)
    }
    
    return []
  }

  const [links, setLinks] = useState<BookmarkLink[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Load bookmarks from localStorage on mount and when user changes
  useEffect(() => {
    const loaded = loadBookmarks(storageKey)
    setLinks(loaded)
    setIsInitialized(true)
  }, [storageKey])
  
  // Save bookmarks to localStorage whenever they change (but not on initial load)
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(links))
    } catch (error) {
      console.error("Error saving bookmarks:", error)
    }
  }, [links, storageKey, isInitialized])
  const [isAdding, setIsAdding] = useState(false)
  const [newLink, setNewLink] = useState({ name: "", url: "", iconName: "ExternalLink", color: "#6b7280" })
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleAddLink = () => {
    if (newLink.name && newLink.url) {
      const selectedIcon = availableIcons.find(i => i.name === newLink.iconName) || availableIcons[5]
      const faviconUrl = getFaviconUrl(newLink.url)
      setLinks([
        ...links,
        {
          id: Date.now(),
          name: newLink.name,
          iconName: newLink.iconName,
          url: newLink.url,
          color: selectedIcon.color,
          faviconUrl: faviconUrl || undefined,
        },
      ])
      setNewLink({ name: "", url: "", iconName: "ExternalLink", color: "#6b7280" })
      setIsAdding(false)
    }
  }

  const handleRemoveLink = (id: number) => {
    setLinks(links.filter(link => link.id !== id))
  }

  return (
    <Card className="p-4 border-border/60 h-full">
      <div className="flex items-center justify-between mb-3">
        <h4>Bookmarks</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          className="h-7 px-2"
        >
          {isAdding ? (
            <X className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      <div className="space-y-0.5">
        {links.map((link) => {
          const Icon = iconMap[link.iconName] || ExternalLink
          const faviconUrl = link.faviconUrl || getFaviconUrl(link.url)
          
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
              {editingId === link.id && (
                <button
                  onClick={() => handleRemoveLink(link.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          )
        })}

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

