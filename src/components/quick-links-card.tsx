"use client"

import { Card } from "@/components/ui/card"
import { ExternalLink, MessageSquare, FolderOpen, FileText, Calendar, Mail, Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialLinks = [
  { id: 1, name: "Slack Channel", icon: MessageSquare, url: "#", color: "#4A154B" },
  { id: 2, name: "Google Drive", icon: FolderOpen, url: "#", color: "#4285F4" },
  { id: 3, name: "Shared Docs", icon: FileText, url: "#", color: "#6b7280" },
  { id: 4, name: "Calendar", icon: Calendar, url: "#", color: "#EA4335" },
  { id: 5, name: "Email Thread", icon: Mail, url: "#", color: "#6b7280" },
]

const availableIcons = [
  { name: "MessageSquare", icon: MessageSquare, color: "#4A154B" },
  { name: "FolderOpen", icon: FolderOpen, color: "#4285F4" },
  { name: "FileText", icon: FileText, color: "#6b7280" },
  { name: "Calendar", icon: Calendar, color: "#EA4335" },
  { name: "Mail", icon: Mail, color: "#6b7280" },
  { name: "ExternalLink", icon: ExternalLink, color: "#6b7280" },
]

export function QuickLinksCard() {
  const [links, setLinks] = useState(initialLinks)
  const [isAdding, setIsAdding] = useState(false)
  const [newLink, setNewLink] = useState({ name: "", url: "", iconName: "ExternalLink", color: "#6b7280" })
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleAddLink = () => {
    if (newLink.name && newLink.url) {
      const selectedIcon = availableIcons.find(i => i.name === newLink.iconName) || availableIcons[5]
      setLinks([
        ...links,
        {
          id: Date.now(),
          name: newLink.name,
          icon: selectedIcon.icon,
          url: newLink.url,
          color: selectedIcon.color,
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
          const Icon = link.icon
          return (
            <div
              key={link.id}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted/50 transition-colors group"
              onMouseEnter={() => setEditingId(link.id)}
              onMouseLeave={() => setEditingId(null)}
            >
              <a
                href={link.url}
                className="flex items-center gap-2.5 flex-1"
              >
                <div 
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${link.color}15` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: link.color }} />
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

