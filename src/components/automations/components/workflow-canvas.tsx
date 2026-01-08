"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, X, Settings, Play, Zap, Webhook, Clock, MousePointerClick, Database, Mail, FileText, 
  CheckCircle, AlertCircle, ZoomIn, ZoomOut, Maximize2, Move, Users, Briefcase, Building2, 
  Calendar, BarChart3, DollarSign, Target, Bell, MessageSquare, Phone, Video, MapPin, 
  Tag, Filter, Search, RefreshCw, Trash2, Edit, Save, Download, Upload, Share2, Link, 
  Copy, Scissors, Eye, EyeOff, Lock, Unlock, Shield, UserPlus, UserMinus, Star, Heart, 
  ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, ArrowRight, ArrowLeft, Repeat, 
  RotateCcw, RotateCw, Pause, Square, SkipForward, SkipBack, Volume2, VolumeX, 
  Image, Music, File, Folder, FolderOpen, Archive, Inbox, 
  Send, Receipt, CreditCard, Wallet, Banknote, Coins, 
  PieChart, LineChart, Activity, Gauge, Layers, Box, Package, ShoppingCart, 
  Store, ShoppingBag, Truck, Home, Building, Factory, School, Hospital, 
  Coffee, UtensilsCrossed, Car, Plane, Train, Ship, Bike, 
  Code, Terminal, Server, Cloud, Wifi, Bluetooth, Radio, Satellite, 
  Lightbulb, Flame, Droplet, Wind, Snowflake, Sun, Moon, CloudRain, 
  Hash, AtSign, Percent, Calculator, Variable, GitBranch, 
  Workflow, Network, Share, Merge, Split, Route, Navigation, Compass
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'filter' | 'delay'
  subtype: string
  title: string
  description?: string
  x: number
  y: number
  config: any
  isEnabled: boolean
}

export interface WorkflowConnection {
  id: string
  sourceId: string
  targetId: string
  conditionType?: 'always' | 'if' | 'unless'
  conditionConfig?: any
}

interface WorkflowCanvasProps {
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  onNodesChange: (nodes: WorkflowNode[]) => void
  onConnectionsChange: (connections: WorkflowConnection[]) => void
  onNodeClick?: (node: WorkflowNode) => void
}

const NODE_TYPES = {
  trigger: [
    // Web & API Triggers
    { subtype: 'webhook', label: 'Webhook', icon: Webhook, color: 'bg-blue-500' },
    { subtype: 'api_request', label: 'API Request', icon: Code, color: 'bg-blue-600' },
    { subtype: 'form_submission', label: 'Form Submission', icon: FileText, color: 'bg-blue-400' },
    
    // Time-based Triggers
    { subtype: 'schedule', label: 'Schedule', icon: Clock, color: 'bg-green-500' },
    { subtype: 'daily', label: 'Daily', icon: Sun, color: 'bg-green-400' },
    { subtype: 'weekly', label: 'Weekly', icon: Calendar, color: 'bg-green-600' },
    { subtype: 'monthly', label: 'Monthly', icon: Calendar, color: 'bg-green-700' },
    { subtype: 'cron', label: 'Cron Expression', icon: Terminal, color: 'bg-green-800' },
    
    // Event Triggers
    { subtype: 'event', label: 'Event', icon: MousePointerClick, color: 'bg-purple-500' },
    { subtype: 'user_action', label: 'User Action', icon: MousePointerClick, color: 'bg-purple-400' },
    { subtype: 'button_click', label: 'Button Click', icon: MousePointerClick, color: 'bg-purple-600' },
    
    // CRM Triggers
    { subtype: 'contact_created', label: 'Contact Created', icon: UserPlus, color: 'bg-emerald-500' },
    { subtype: 'contact_updated', label: 'Contact Updated', icon: Edit, color: 'bg-emerald-600' },
    { subtype: 'deal_created', label: 'Deal Created', icon: Briefcase, color: 'bg-emerald-400' },
    { subtype: 'deal_stage_changed', label: 'Deal Stage Changed', icon: ArrowRight, color: 'bg-emerald-700' },
    { subtype: 'account_created', label: 'Account Created', icon: Building2, color: 'bg-emerald-800' },
    { subtype: 'activity_created', label: 'Activity Created', icon: Calendar, color: 'bg-emerald-300' },
    
    // Invoicing Triggers
    { subtype: 'invoice_created', label: 'Invoice Created', icon: FileText, color: 'bg-amber-500' },
    { subtype: 'invoice_sent', label: 'Invoice Sent', icon: Send, color: 'bg-amber-600' },
    { subtype: 'invoice_paid', label: 'Invoice Paid', icon: CheckCircle, color: 'bg-amber-400' },
    { subtype: 'invoice_overdue', label: 'Invoice Overdue', icon: AlertCircle, color: 'bg-amber-700' },
    { subtype: 'payment_received', label: 'Payment Received', icon: DollarSign, color: 'bg-amber-300' },
    { subtype: 'expense_created', label: 'Expense Created', icon: Receipt, color: 'bg-amber-800' },
    
    // Lead Generation Triggers
    { subtype: 'lead_created', label: 'Lead Created', icon: Target, color: 'bg-blue-500' },
    { subtype: 'lead_status_changed', label: 'Lead Status Changed', icon: RefreshCw, color: 'bg-blue-600' },
    { subtype: 'lead_scored', label: 'Lead Scored', icon: Star, color: 'bg-blue-400' },
    { subtype: 'campaign_triggered', label: 'Campaign Triggered', icon: Zap, color: 'bg-blue-700' },
    { subtype: 'form_capture', label: 'Form Capture', icon: FileText, color: 'bg-blue-300' },
    
    // Analytics Triggers
    { subtype: 'metric_threshold', label: 'Metric Threshold', icon: Gauge, color: 'bg-rose-500' },
    { subtype: 'report_generated', label: 'Report Generated', icon: BarChart3, color: 'bg-rose-600' },
    { subtype: 'data_updated', label: 'Data Updated', icon: RefreshCw, color: 'bg-rose-400' },
    
    // User Management Triggers
    { subtype: 'user_created', label: 'User Created', icon: UserPlus, color: 'bg-indigo-500' },
    { subtype: 'user_invited', label: 'User Invited', icon: Mail, color: 'bg-indigo-600' },
    { subtype: 'permission_changed', label: 'Permission Changed', icon: Shield, color: 'bg-indigo-400' },
    
    // Manual Triggers
    { subtype: 'manual', label: 'Manual', icon: Play, color: 'bg-orange-500' },
    { subtype: 'button_trigger', label: 'Button Trigger', icon: MousePointerClick, color: 'bg-orange-400' },
  ],
  action: [
    // Communication Actions
    { subtype: 'send_email', label: 'Send Email', icon: Mail, color: 'bg-red-500' },
    { subtype: 'send_sms', label: 'Send SMS', icon: MessageSquare, color: 'bg-red-400' },
    { subtype: 'send_notification', label: 'Send Notification', icon: Bell, color: 'bg-red-600' },
    { subtype: 'make_call', label: 'Make Call', icon: Phone, color: 'bg-red-300' },
    { subtype: 'schedule_call', label: 'Schedule Call', icon: Calendar, color: 'bg-red-700' },
    
    // CRM Actions
    { subtype: 'create_contact', label: 'Create Contact', icon: UserPlus, color: 'bg-emerald-500' },
    { subtype: 'update_contact', label: 'Update Contact', icon: Edit, color: 'bg-emerald-600' },
    { subtype: 'create_deal', label: 'Create Deal', icon: Briefcase, color: 'bg-emerald-400' },
    { subtype: 'update_deal', label: 'Update Deal', icon: RefreshCw, color: 'bg-emerald-700' },
    { subtype: 'move_deal_stage', label: 'Move Deal Stage', icon: ArrowRight, color: 'bg-emerald-300' },
    { subtype: 'create_account', label: 'Create Account', icon: Building2, color: 'bg-emerald-800' },
    { subtype: 'create_activity', label: 'Create Activity', icon: Calendar, color: 'bg-emerald-200' },
    { subtype: 'add_note', label: 'Add Note', icon: FileText, color: 'bg-emerald-900' },
    { subtype: 'assign_owner', label: 'Assign Owner', icon: Users, color: 'bg-emerald-100' },
    { subtype: 'add_tag', label: 'Add Tag', icon: Tag, color: 'bg-emerald-50' },
    
    // Invoicing Actions
    { subtype: 'create_invoice', label: 'Create Invoice', icon: FileText, color: 'bg-amber-500' },
    { subtype: 'send_invoice', label: 'Send Invoice', icon: Send, color: 'bg-amber-600' },
    { subtype: 'update_invoice', label: 'Update Invoice', icon: Edit, color: 'bg-amber-400' },
    { subtype: 'mark_paid', label: 'Mark Paid', icon: CheckCircle, color: 'bg-amber-300' },
    { subtype: 'create_payment', label: 'Create Payment', icon: DollarSign, color: 'bg-amber-700' },
    { subtype: 'create_expense', label: 'Create Expense', icon: Receipt, color: 'bg-amber-800' },
    { subtype: 'create_recurring', label: 'Create Recurring Invoice', icon: Repeat, color: 'bg-amber-200' },
    { subtype: 'send_reminder', label: 'Send Reminder', icon: Bell, color: 'bg-amber-900' },
    { subtype: 'apply_discount', label: 'Apply Discount', icon: Percent, color: 'bg-amber-100' },
    
    // Lead Generation Actions
    { subtype: 'create_lead', label: 'Create Lead', icon: Target, color: 'bg-blue-500' },
    { subtype: 'update_lead', label: 'Update Lead', icon: Edit, color: 'bg-blue-600' },
    { subtype: 'score_lead', label: 'Score Lead', icon: Star, color: 'bg-blue-400' },
    { subtype: 'assign_lead', label: 'Assign Lead', icon: Users, color: 'bg-blue-700' },
    { subtype: 'create_campaign', label: 'Create Campaign', icon: Zap, color: 'bg-blue-300' },
    { subtype: 'add_to_pipeline', label: 'Add to Pipeline', icon: ArrowRight, color: 'bg-blue-800' },
    { subtype: 'enrich_lead', label: 'Enrich Lead', icon: Search, color: 'bg-blue-200' },
    
    // Task & Project Actions
    { subtype: 'create_task', label: 'Create Task', icon: CheckCircle, color: 'bg-violet-500' },
    { subtype: 'update_task', label: 'Update Task', icon: Edit, color: 'bg-violet-600' },
    { subtype: 'complete_task', label: 'Complete Task', icon: CheckCircle, color: 'bg-violet-400' },
    { subtype: 'assign_task', label: 'Assign Task', icon: UserPlus, color: 'bg-violet-700' },
    { subtype: 'create_project', label: 'Create Project', icon: Folder, color: 'bg-violet-300' },
    { subtype: 'update_project', label: 'Update Project', icon: Edit, color: 'bg-violet-800' },
    
    // Document Actions
    { subtype: 'create_document', label: 'Create Document', icon: FileText, color: 'bg-yellow-500' },
    { subtype: 'update_document', label: 'Update Document', icon: Edit, color: 'bg-yellow-600' },
    { subtype: 'share_document', label: 'Share Document', icon: Share2, color: 'bg-yellow-400' },
    { subtype: 'generate_pdf', label: 'Generate PDF', icon: File, color: 'bg-yellow-700' },
    { subtype: 'upload_file', label: 'Upload File', icon: Upload, color: 'bg-yellow-300' },
    { subtype: 'download_file', label: 'Download File', icon: Download, color: 'bg-yellow-800' },
    
    // Database Actions (Read-only)
    { subtype: 'query_database', label: 'Query Database', icon: Search, color: 'bg-green-300' },
    
    // Integration Actions
    { subtype: 'webhook_call', label: 'Webhook Call', icon: Webhook, color: 'bg-purple-500' },
    { subtype: 'api_call', label: 'API Call', icon: Code, color: 'bg-purple-400' },
    { subtype: 'stripe_action', label: 'Stripe Action', icon: CreditCard, color: 'bg-purple-600' },
    { subtype: 'slack_message', label: 'Slack Message', icon: MessageSquare, color: 'bg-purple-300' },
    { subtype: 'google_sheets', label: 'Google Sheets', icon: FileText, color: 'bg-purple-700' },
    
    // Analytics Actions
    { subtype: 'track_event', label: 'Track Event', icon: Activity, color: 'bg-rose-500' },
    { subtype: 'update_metric', label: 'Update Metric', icon: BarChart3, color: 'bg-rose-600' },
    { subtype: 'generate_report', label: 'Generate Report', icon: FileText, color: 'bg-rose-400' },
    { subtype: 'send_analytics', label: 'Send Analytics', icon: Share2, color: 'bg-rose-700' },
    
    // User Management Actions
    { subtype: 'create_user', label: 'Create User', icon: UserPlus, color: 'bg-indigo-500' },
    { subtype: 'update_user', label: 'Update User', icon: Edit, color: 'bg-indigo-600' },
    { subtype: 'invite_user', label: 'Invite User', icon: Mail, color: 'bg-indigo-400' },
    { subtype: 'update_permissions', label: 'Update Permissions', icon: Shield, color: 'bg-indigo-700' },
    { subtype: 'deactivate_user', label: 'Deactivate User', icon: UserMinus, color: 'bg-indigo-300' },
    
    // Data Transformation Actions
    { subtype: 'transform_data', label: 'Transform Data', icon: RefreshCw, color: 'bg-slate-500' },
    { subtype: 'format_data', label: 'Format Data', icon: Edit, color: 'bg-slate-600' },
    { subtype: 'merge_data', label: 'Merge Data', icon: Merge, color: 'bg-slate-400' },
    { subtype: 'split_data', label: 'Split Data', icon: Split, color: 'bg-slate-700' },
    { subtype: 'calculate', label: 'Calculate', icon: Calculator, color: 'bg-slate-300' },
    
    // Utility Actions
    { subtype: 'log_message', label: 'Log Message', icon: FileText, color: 'bg-gray-500' },
    { subtype: 'wait', label: 'Wait', icon: Clock, color: 'bg-gray-600' },
    { subtype: 'stop_workflow', label: 'Stop Workflow', icon: Square, color: 'bg-gray-700' },
    { subtype: 'continue_workflow', label: 'Continue Workflow', icon: Play, color: 'bg-gray-400' },
    
    // Advanced/Custom Actions
    { subtype: 'custom_code', label: 'Custom Code', icon: Code, color: 'bg-orange-600' },
    
    // Error Handling Actions
    { subtype: 'on_error', label: 'On Error', icon: AlertCircle, color: 'bg-red-500' },
    { subtype: 'retry', label: 'Retry', icon: RefreshCw, color: 'bg-red-400' },
    { subtype: 'catch_error', label: 'Catch Error', icon: Shield, color: 'bg-red-600' },
    { subtype: 'fallback', label: 'Fallback', icon: ArrowRight, color: 'bg-red-300' },
  ],
  condition: [
    { subtype: 'if', label: 'If', icon: AlertCircle, color: 'bg-yellow-500' },
    { subtype: 'if_else', label: 'If/Else', icon: GitBranch, color: 'bg-yellow-600' },
    { subtype: 'switch', label: 'Switch', icon: Zap, color: 'bg-indigo-500' },
    { subtype: 'compare', label: 'Compare', icon: AlertCircle, color: 'bg-yellow-400' },
    { subtype: 'check_field', label: 'Check Field', icon: Search, color: 'bg-yellow-700' },
    { subtype: 'check_value', label: 'Check Value', icon: Eye, color: 'bg-yellow-300' },
    { subtype: 'check_exists', label: 'Check Exists', icon: CheckCircle, color: 'bg-yellow-800' },
    { subtype: 'check_empty', label: 'Check Empty', icon: EyeOff, color: 'bg-yellow-200' },
    { subtype: 'check_type', label: 'Check Type', icon: Tag, color: 'bg-yellow-100' },
    { subtype: 'check_permission', label: 'Check Permission', icon: Shield, color: 'bg-yellow-900' },
  ],
  filter: [
    { subtype: 'filter', label: 'Filter', icon: Filter, color: 'bg-gray-500' },
    { subtype: 'filter_by_field', label: 'Filter by Field', icon: Search, color: 'bg-gray-600' },
    { subtype: 'filter_by_value', label: 'Filter by Value', icon: Tag, color: 'bg-gray-400' },
    { subtype: 'filter_by_date', label: 'Filter by Date', icon: Calendar, color: 'bg-gray-700' },
    { subtype: 'filter_by_status', label: 'Filter by Status', icon: CheckCircle, color: 'bg-gray-300' },
    { subtype: 'filter_by_user', label: 'Filter by User', icon: Users, color: 'bg-gray-800' },
    { subtype: 'filter_by_tag', label: 'Filter by Tag', icon: Tag, color: 'bg-gray-200' },
    { subtype: 'exclude', label: 'Exclude', icon: X, color: 'bg-gray-900' },
    { subtype: 'include_only', label: 'Include Only', icon: CheckCircle, color: 'bg-gray-100' },
  ],
  delay: [
    { subtype: 'delay', label: 'Delay', icon: Clock, color: 'bg-slate-500' },
    { subtype: 'wait_seconds', label: 'Wait Seconds', icon: Clock, color: 'bg-slate-400' },
    { subtype: 'wait_minutes', label: 'Wait Minutes', icon: Clock, color: 'bg-slate-600' },
    { subtype: 'wait_hours', label: 'Wait Hours', icon: Clock, color: 'bg-slate-700' },
    { subtype: 'wait_days', label: 'Wait Days', icon: Clock, color: 'bg-slate-800' },
    { subtype: 'wait_until', label: 'Wait Until', icon: Calendar, color: 'bg-slate-300' },
    { subtype: 'wait_for_event', label: 'Wait for Event', icon: Bell, color: 'bg-slate-200' },
    { subtype: 'wait_for_condition', label: 'Wait for Condition', icon: AlertCircle, color: 'bg-slate-900' },
  ],
}

export function WorkflowCanvas({ nodes, connections, onNodesChange, onConnectionsChange, onNodeClick }: WorkflowCanvasProps) {
  const [draggedNode, setDraggedNode] = useState<{ type: string; subtype: string } | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hasDragged, setHasDragged] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [showZoomControls, setShowZoomControls] = useState(false)
  const [nodeSearchTerm, setNodeSearchTerm] = useState('')
  const hasDraggedRef = useRef(false)

  // Pan handlers - click and drag anywhere (not on nodes) to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't pan if clicking on a node, connection handle, or button
    const target = e.target as HTMLElement
    if (
      target.closest('[data-node-id]') || 
      target.closest('.connection-handle') ||
      target.closest('button') ||
      target.closest('svg') ||
      e.button !== 0 // Only left mouse button
    ) {
      return
    }

    // Start panning on left click + drag
    setIsPanning(true)
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const canvasX = (e.clientX - rect.left - pan.x) / scale
      const canvasY = (e.clientY - rect.top - pan.y) / scale
      setMousePos({ x: canvasX, y: canvasY })
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    } else if (draggedNodeId && !connectingFrom) {
      const node = nodes.find(n => n.id === draggedNodeId)
      if (node && canvasRef.current) {
        // Check if mouse has moved significantly (more than 5px) to consider it a drag
        const moveDistance = Math.sqrt(
          Math.pow(e.clientX - dragStartPos.x, 2) + Math.pow(e.clientY - dragStartPos.y, 2)
        )
        if (moveDistance > 5) {
          setHasDragged(true)
          hasDraggedRef.current = true
        }
        
        const rect = canvasRef.current.getBoundingClientRect()
        const newX = (e.clientX - rect.left - pan.x - dragOffset.x) / scale
        const newY = (e.clientY - rect.top - pan.y - dragOffset.y) / scale
        onNodesChange(nodes.map(n => 
          n.id === draggedNodeId ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n
        ))
      }
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setDraggedNodeId(null)
    setHasDragged(false)
    hasDraggedRef.current = false
    setDragStartPos({ x: 0, y: 0 })
  }

  // Zoom handlers
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5))
  }

  const handleZoomReset = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }


  const handleDragStart = (e: React.DragEvent, type: string, subtype: string) => {
    setDraggedNode({ type, subtype })
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedNode || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / scale
    const y = (e.clientY - rect.top - pan.y) / scale

    const nodeType = draggedNode.type as WorkflowNode['type']
    const nodeInfo = NODE_TYPES[nodeType]?.find(n => n.subtype === draggedNode.subtype)
    
    if (nodeInfo) {
      const newNode: WorkflowNode = {
        id: `node-${Date.now()}`,
        type: nodeType,
        subtype: draggedNode.subtype,
        title: nodeInfo.label,
        x: Math.max(0, x - 100),
        y: Math.max(0, y - 50),
        config: {},
        isEnabled: true,
      }
      onNodesChange([...nodes, newNode])
    }

    setDraggedNode(null)
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    // Don't start node drag if we're connecting
    if (connectingFrom) return
    
    if (e.button === 0 && !e.shiftKey && !(e.target as HTMLElement).closest('.connection-handle')) {
      const node = nodes.find(n => n.id === nodeId)
      if (node && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        setDraggedNodeId(nodeId)
        setHasDragged(false)
        hasDraggedRef.current = false
        setDragStartPos({ x: e.clientX, y: e.clientY })
        setDragOffset({
          x: (e.clientX - rect.left - pan.x) / scale - node.x,
          y: (e.clientY - rect.top - pan.y) / scale - node.y,
        })
      }
    }
  }

  const handleConnectionStart = (e: React.MouseEvent, nodeId: string, isOutput: boolean) => {
    e.stopPropagation()
    e.preventDefault()
    if (isOutput) {
      setConnectingFrom(nodeId)
      // Prevent node dragging when starting connection
      setDraggedNodeId(null)
    }
  }

  const handleConnectionEnd = (e: React.MouseEvent, nodeId: string, isInput: boolean) => {
    e.stopPropagation()
    e.preventDefault()
    if (connectingFrom && isInput && connectingFrom !== nodeId) {
      // Check if connection already exists
      const exists = connections.some(
        c => c.sourceId === connectingFrom && c.targetId === nodeId
      )
      
      if (!exists) {
        const newConnection: WorkflowConnection = {
          id: `conn-${Date.now()}`,
          sourceId: connectingFrom,
          targetId: nodeId,
          conditionType: 'always',
        }
        console.log('Creating connection:', newConnection)
        onConnectionsChange([...connections, newConnection])
      } else {
        console.log('Connection already exists')
      }
    }
    setConnectingFrom(null)
  }

  // Handle mouse up on canvas to cancel connection
  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (connectingFrom && e.target === canvasRef.current) {
      setConnectingFrom(null)
    }
    handleMouseUp()
  }

  const handleNodeClick = (node: WorkflowNode) => {
    // Only open settings if node wasn't dragged and we're not connecting
    if (!hasDraggedRef.current && !connectingFrom) {
      setSelectedNode(node)
      setIsConfigOpen(true)
      onNodeClick?.(node)
    }
  }

  const handleDeleteNode = (nodeId: string) => {
    onNodesChange(nodes.filter(n => n.id !== nodeId))
    onConnectionsChange(connections.filter(c => c.sourceId !== nodeId && c.targetId !== nodeId))
  }

  const handleDeleteConnection = (connectionId: string) => {
    onConnectionsChange(connections.filter(c => c.id !== connectionId))
  }

  const updateNode = (updatedNode: WorkflowNode) => {
    onNodesChange(nodes.map(n => n.id === updatedNode.id ? updatedNode : n))
    setSelectedNode(null)
    setIsConfigOpen(false)
  }

  const getNodeColor = (node: WorkflowNode) => {
    const nodeInfo = NODE_TYPES[node.type]?.find(n => n.subtype === node.subtype)
    return nodeInfo?.color || 'bg-gray-500'
  }

  const getNodeIcon = (node: WorkflowNode) => {
    const nodeInfo = NODE_TYPES[node.type]?.find(n => n.subtype === node.subtype)
    const Icon = nodeInfo?.icon || Zap
    return Icon
  }

  // Calculate connection paths
  const getConnectionPath = (conn: WorkflowConnection) => {
    const source = nodes.find(n => n.id === conn.sourceId)
    const target = nodes.find(n => n.id === conn.targetId)
    
    if (!source || !target) return ''

    const NODE_WIDTH = 200
    const NODE_HEIGHT = 100
    const CONNECTION_POINT_SIZE = 8

    const x1 = source.x + NODE_WIDTH
    const y1 = source.y + NODE_HEIGHT / 2
    const x2 = target.x
    const y2 = target.y + NODE_HEIGHT / 2

    const dx = x2 - x1
    const dy = y2 - y1
    const midX = x1 + dx / 2

    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
  }

  // Handle global mouse up to cancel connection if not over input handle
  useEffect(() => {
    const handleGlobalMouseUp = (event: MouseEvent) => {
      if (connectingFrom) {
        // Check if we're over an input handle
        const target = event.target as HTMLElement
        const inputHandle = target.closest('.connection-handle[data-is-input="true"]')
        
        // If not over an input handle, cancel the connection
        // (Connection completion is handled by the input handle's onMouseUp)
        if (!inputHandle) {
          setConnectingFrom(null)
        }
      }
    }
    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [connectingFrom])

  // Attach wheel event listener for zooming
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const wheelHandler = (e: WheelEvent) => {
      // Always prevent browser zoom and parent scrolling
      e.preventDefault()
      e.stopPropagation()
      
      // Get mouse position relative to canvas container
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Calculate zoom point in canvas coordinates (before zoom)
      const zoomPointX = (mouseX - pan.x) / scale
      const zoomPointY = (mouseY - pan.y) / scale
      
      // Calculate zoom delta (scroll up = zoom in, scroll down = zoom out)
      // Use smaller increments for smoother zooming
      const zoomSpeed = 0.05
      const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed
      const newScale = Math.max(0.5, Math.min(2, scale + delta))
      
      // Calculate new pan to keep zoom point under mouse cursor
      const newPanX = mouseX - zoomPointX * newScale
      const newPanY = mouseY - zoomPointY * newScale
      
      setScale(newScale)
      setPan({ x: newPanX, y: newPanY })
    }

    canvas.addEventListener('wheel', wheelHandler, { passive: false })
    return () => canvas.removeEventListener('wheel', wheelHandler)
  }, [scale, pan])

  return (
    <div className="flex h-full w-full">
      {/* Node Palette Sidebar */}
      <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b space-y-3">
          <h3 className="text-sm font-semibold">Node Palette</h3>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={nodeSearchTerm}
              onChange={(e) => setNodeSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {nodeSearchTerm && (
              <button
                onClick={() => setNodeSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {Object.entries(NODE_TYPES).map(([type, typeNodes]) => {
              // Filter nodes based on search term
              const filteredNodes = nodeSearchTerm
                ? typeNodes.filter(node => 
                    node.label.toLowerCase().includes(nodeSearchTerm.toLowerCase()) ||
                    node.subtype.toLowerCase().includes(nodeSearchTerm.toLowerCase()) ||
                    type.toLowerCase().includes(nodeSearchTerm.toLowerCase())
                  )
                : typeNodes

              // Don't render category if no nodes match
              if (filteredNodes.length === 0) return null

              return (
                <div key={type}>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 capitalize">
                    {type}s {nodeSearchTerm && <span className="text-muted-foreground/70">({filteredNodes.length})</span>}
                  </h4>
                  <div className="space-y-2">
                    {filteredNodes.map((nodeInfo) => {
                      const Icon = nodeInfo.icon
                      return (
                        <div
                          key={nodeInfo.subtype}
                          draggable
                          onDragStart={(e) => handleDragStart(e, type, nodeInfo.subtype)}
                          className="flex items-center gap-2 p-2 rounded border cursor-move hover:bg-muted transition-colors"
                        >
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${nodeInfo.color} text-white`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm">{nodeInfo.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {nodeSearchTerm && Object.entries(NODE_TYPES).every(([_, typeNodes]) => {
              const filtered = typeNodes.filter(node => 
                node.label.toLowerCase().includes(nodeSearchTerm.toLowerCase()) ||
                node.subtype.toLowerCase().includes(nodeSearchTerm.toLowerCase())
              )
              return filtered.length === 0
            }) && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No nodes found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Canvas */}
        <Card className="flex-1 min-h-0 m-4 relative group">
          {/* Toggle button for zoom controls */}
          <div className="absolute top-2 right-2 z-20">
            {!showZoomControls ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowZoomControls(true)}
                className="bg-card border shadow-lg"
                title="Show zoom controls"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 bg-card border rounded-lg p-2 shadow-lg">
                <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="icon" onClick={handleZoomReset} title="Reset Zoom">
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Move className="w-3 h-3" />
              <span>Click+Drag to pan • Scroll to zoom</span>
            </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowZoomControls(false)}
                  className="ml-1"
                  title="Hide controls"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          <CardContent 
            className="p-0 h-full relative overflow-hidden scrollbar-hide"
          >
            <div
              ref={canvasRef}
              className="relative bg-muted/20 cursor-grab active:cursor-grabbing h-full w-full"
              style={{ 
                width: '1000%',
                height: '1000%',
                minWidth: '100%',
                minHeight: '100%',
                backgroundImage: 'radial-gradient(circle, rgba(136, 136, 136, 0.3) 1px, transparent 1px)', 
                backgroundSize: `${20 * scale}px ${20 * scale}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`
              }}
              onDrop={handleCanvasDrop}
              onDragOver={(e) => e.preventDefault()}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            >
              {/* Transform container for zoom and pan */}
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  transformOrigin: '0 0',
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                }}
              >
                {/* SVG for connections - positioned to match nodes */}
                <svg 
                  className="absolute pointer-events-none" 
                  style={{ 
                    zIndex: 1, 
                    top: 0,
                    left: 0,
                    width: '1000%',
                    height: '1000%',
                    overflow: 'visible'
                  }}
                >
                  {connections.map((conn) => {
                    const path = getConnectionPath(conn)
                    if (!path) return null
                    const source = nodes.find(n => n.id === conn.sourceId)
                    const target = nodes.find(n => n.id === conn.targetId)
                    if (!source || !target) return null

                    return (
                      <g key={conn.id}>
                        <path
                          d={path}
                          fill="none"
                          stroke="rgb(59, 130, 246)"
                          strokeWidth="4"
                          className="pointer-events-auto cursor-pointer hover:stroke-blue-600"
                          onClick={() => handleDeleteConnection(conn.id)}
                          style={{ opacity: 1 }}
                        />
                        {/* Arrow marker at the end */}
                        <circle
                          cx={target.x}
                          cy={target.y + 50}
                          r="6"
                          fill="rgb(59, 130, 246)"
                        />
                      </g>
                    )
                  })}
                  {/* Temporary connection line while connecting */}
                  {connectingFrom && (() => {
                    const source = nodes.find(n => n.id === connectingFrom)
                    if (!source) return null
                    return (
                      <line
                        x1={source.x + 200}
                        y1={source.y + 50}
                        x2={mousePos.x}
                        y2={mousePos.y}
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                        style={{ opacity: 0.7 }}
                      />
                    )
                  })()}
                </svg>

                {/* Nodes */}
                {nodes.map((node) => {
                  const Icon = getNodeIcon(node)
                  const color = getNodeColor(node)
                  return (
                    <div
                      key={node.id}
                      data-node-id={node.id}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      onMouseUp={(e) => {
                        e.stopPropagation() // Prevent canvas mouse up from firing first
                        
                        // Don't open settings if clicking on delete button or connection handles
                        const target = e.target as HTMLElement
                        if (
                          target.closest('button') ||
                          target.closest('.connection-handle')
                        ) {
                          return
                        }
                        
                        // Only handle click if this node was being dragged/clicked
                        if (draggedNodeId === node.id) {
                          // If it was a drag, don't open settings
                          if (hasDraggedRef.current) {
                            // Reset drag state
                            setDraggedNodeId(null)
                            setHasDragged(false)
                            hasDraggedRef.current = false
                            setDragStartPos({ x: 0, y: 0 })
                            return
                          }
                          
                          // It was a click (no drag), open settings
                          if (!connectingFrom) {
                            handleNodeClick(node)
                          }
                          
                          // Reset drag state after handling click
                          setDraggedNodeId(null)
                          setHasDragged(false)
                          hasDraggedRef.current = false
                          setDragStartPos({ x: 0, y: 0 })
                        }
                      }}
                      className={`absolute cursor-move group ${!node.isEnabled ? 'opacity-50' : ''}`}
                      style={{ left: `${node.x}px`, top: `${node.y}px`, zIndex: 2 }}
                    >
                      <div className={`${color} text-white rounded-lg p-4 min-w-[200px] shadow-lg hover:shadow-xl transition-shadow relative`}>
                        {/* Output connection point */}
                        <div
                          className="connection-handle absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-800 cursor-crosshair hover:bg-primary hover:border-primary z-10"
                          onMouseDown={(e) => handleConnectionStart(e, node.id, true)}
                          onMouseUp={(e) => {
                            e.stopPropagation()
                            // Connection will be completed on target node's input handle
                          }}
                          title="Connect from here - drag to another node's input"
                        />
                        {/* Input connection point */}
                        <div
                          className="connection-handle absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-800 cursor-crosshair hover:bg-primary hover:border-primary z-10"
                          data-is-input="true"
                          data-node-id={node.id}
                          onMouseUp={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            // Complete connection if we're connecting from another node
                            if (connectingFrom && connectingFrom !== node.id) {
                              handleConnectionEnd(e, node.id, true)
                            }
                          }}
                          title="Connect to here - drag from another node's output"
                        />
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5" />
                            <Badge variant="secondary" className="text-xs capitalize">{node.type}</Badge>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              handleDeleteNode(node.id)
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                            }}
                            onMouseUp={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{node.title}</h3>
                        {node.description && (
                          <p className="text-xs opacity-90">{node.description}</p>
                        )}
                        {node.type === 'trigger' && (
                          <div className="mt-2 pt-2 border-t border-white/20">
                            <div className="text-xs opacity-75">Start here</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {nodes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">Drag nodes from the palette to start building</p>
                      <p className="text-xs text-muted-foreground">Click+Drag to pan • Scroll to zoom</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Node Configuration Modal */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Node</DialogTitle>
            <DialogDescription>
              {selectedNode && `${selectedNode.type}: ${selectedNode.title}`}
            </DialogDescription>
          </DialogHeader>
          {selectedNode && (
            <NodeConfigForm
              node={selectedNode}
              onSave={updateNode}
              onCancel={() => {
                setSelectedNode(null)
                setIsConfigOpen(false)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NodeConfigForm({ node, onSave, onCancel }: { node: WorkflowNode; onSave: (node: WorkflowNode) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(node.title)
  const [description, setDescription] = useState(node.description || '')
  const [config, setConfig] = useState(node.config || {})
  const [isEnabled, setIsEnabled] = useState(node.isEnabled)
  const [configMode, setConfigMode] = useState<'form' | 'json'>('form')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleSave = () => {
    onSave({
      ...node,
      title,
      description,
      config,
      isEnabled,
    })
  }

  const renderConfigFields = () => {
    switch (node.subtype) {
      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Webhook URL</Label>
              <Input
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://your-domain.com/webhook"
              />
            </div>
            <div>
              <Label className="mb-2 block">Method</Label>
              <Select value={config.method || 'POST'} onValueChange={(value) => setConfig({ ...config, method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      case 'schedule':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Schedule Type</Label>
              <Select value={config.scheduleType || 'interval'} onValueChange={(value) => setConfig({ ...config, scheduleType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interval">Every X minutes/hours</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="cron">Cron Expression</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.scheduleType === 'interval' && (
              <div>
                <Label className="mb-2 block">Interval (minutes)</Label>
                <Input
                  type="number"
                  value={config.interval || ''}
                  onChange={(e) => setConfig({ ...config, interval: parseInt(e.target.value) || 0 })}
                  placeholder="60"
                />
              </div>
            )}
          </div>
        )
      
      case 'user_action':
      case 'button_click':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Action Type</Label>
              <Select value={config.actionType || 'page_view'} onValueChange={(value) => setConfig({ ...config, actionType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page_view">Page View</SelectItem>
                  <SelectItem value="button_click">Button Click</SelectItem>
                  <SelectItem value="form_submit">Form Submit</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="create">Create Record</SelectItem>
                  <SelectItem value="update">Update Record</SelectItem>
                  <SelectItem value="delete">Delete Record</SelectItem>
                  <SelectItem value="file_upload">File Upload</SelectItem>
                  <SelectItem value="file_download">File Download</SelectItem>
                  <SelectItem value="search">Search</SelectItem>
                  <SelectItem value="filter">Filter</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="share">Share</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {config.actionType === 'page_view' && (
              <>
                <div>
                  <Label className="mb-2 block">Page Path</Label>
                  <Input
                    value={config.pagePath || ''}
                    onChange={(e) => setConfig({ ...config, pagePath: e.target.value })}
                    placeholder="/dashboard, /crm/contacts, etc."
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Match Type</Label>
                  <Select value={config.matchType || 'exact'} onValueChange={(value) => setConfig({ ...config, matchType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">Exact Match</SelectItem>
                      <SelectItem value="starts_with">Starts With</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="regex">Regex Pattern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {config.actionType === 'button_click' && (
              <>
                <div>
                  <Label className="mb-2 block">Button ID or Text</Label>
                  <Input
                    value={config.buttonId || ''}
                    onChange={(e) => setConfig({ ...config, buttonId: e.target.value })}
                    placeholder="button-id or button text"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Page Context (optional)</Label>
                  <Input
                    value={config.pageContext || ''}
                    onChange={(e) => setConfig({ ...config, pageContext: e.target.value })}
                    placeholder="Page where button appears"
                  />
                </div>
              </>
            )}
            
            {config.actionType === 'form_submit' && (
              <>
                <div>
                  <Label className="mb-2 block">Form ID or Name</Label>
                  <Input
                    value={config.formId || ''}
                    onChange={(e) => setConfig({ ...config, formId: e.target.value })}
                    placeholder="form-id or form name"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Page Context (optional)</Label>
                  <Input
                    value={config.pageContext || ''}
                    onChange={(e) => setConfig({ ...config, pageContext: e.target.value })}
                    placeholder="Page where form appears"
                  />
                </div>
              </>
            )}
            
            {(config.actionType === 'create' || config.actionType === 'update' || config.actionType === 'delete') && (
              <>
                <div>
                  <Label className="mb-2 block">Entity Type</Label>
                  <Select value={config.entityType || 'contact'} onValueChange={(value) => setConfig({ ...config, entityType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">Contact</SelectItem>
                      <SelectItem value="deal">Deal</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {config.actionType === 'update' && (
                  <div>
                    <Label className="mb-2 block">Field Changed (optional)</Label>
                    <Input
                      value={config.fieldChanged || ''}
                      onChange={(e) => setConfig({ ...config, fieldChanged: e.target.value })}
                      placeholder="Specific field to watch (leave empty for any field)"
                    />
                  </div>
                )}
              </>
            )}
            
            {(config.actionType === 'file_upload' || config.actionType === 'file_download') && (
              <>
                <div>
                  <Label className="mb-2 block">File Type (optional)</Label>
                  <Select value={config.fileType || 'any'} onValueChange={(value) => setConfig({ ...config, fileType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any File Type</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">File Name Pattern (optional)</Label>
                  <Input
                    value={config.fileNamePattern || ''}
                    onChange={(e) => setConfig({ ...config, fileNamePattern: e.target.value })}
                    placeholder="e.g., invoice-*.pdf"
                  />
                </div>
              </>
            )}
            
            {config.actionType === 'search' && (
              <>
                <div>
                  <Label className="mb-2 block">Search Context</Label>
                  <Select value={config.searchContext || 'any'} onValueChange={(value) => setConfig({ ...config, searchContext: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Search</SelectItem>
                      <SelectItem value="contacts">Contacts</SelectItem>
                      <SelectItem value="deals">Deals</SelectItem>
                      <SelectItem value="leads">Leads</SelectItem>
                      <SelectItem value="invoices">Invoices</SelectItem>
                      <SelectItem value="documents">Documents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Minimum Query Length (optional)</Label>
                  <Input
                    type="number"
                    value={config.minQueryLength || ''}
                    onChange={(e) => setConfig({ ...config, minQueryLength: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </>
            )}
            
            {config.actionType === 'filter' && (
              <>
                <div>
                  <Label className="mb-2 block">Filter Context</Label>
                  <Select value={config.filterContext || 'any'} onValueChange={(value) => setConfig({ ...config, filterContext: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Filter</SelectItem>
                      <SelectItem value="contacts">Contacts</SelectItem>
                      <SelectItem value="deals">Deals</SelectItem>
                      <SelectItem value="leads">Leads</SelectItem>
                      <SelectItem value="invoices">Invoices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Filter Field (optional)</Label>
                  <Input
                    value={config.filterField || ''}
                    onChange={(e) => setConfig({ ...config, filterField: e.target.value })}
                    placeholder="Specific field being filtered"
                  />
                </div>
              </>
            )}
            
            {config.actionType === 'export' && (
              <>
                <div>
                  <Label className="mb-2 block">Export Type</Label>
                  <Select value={config.exportType || 'any'} onValueChange={(value) => setConfig({ ...config, exportType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Export</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Data Type</Label>
                  <Select value={config.dataType || 'any'} onValueChange={(value) => setConfig({ ...config, dataType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Data</SelectItem>
                      <SelectItem value="contacts">Contacts</SelectItem>
                      <SelectItem value="deals">Deals</SelectItem>
                      <SelectItem value="invoices">Invoices</SelectItem>
                      <SelectItem value="reports">Reports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {config.actionType === 'share' && (
              <>
                <div>
                  <Label className="mb-2 block">Share Type</Label>
                  <Select value={config.shareType || 'any'} onValueChange={(value) => setConfig({ ...config, shareType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Share</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div>
              <Label className="mb-2 block">User Role Filter (optional)</Label>
              <Select value={config.userRole || 'any'} onValueChange={(value) => setConfig({ ...config, userRole: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Role</SelectItem>
                  <SelectItem value="admin">Admin Only</SelectItem>
                  <SelectItem value="manager">Manager Only</SelectItem>
                  <SelectItem value="internal">Internal Only</SelectItem>
                  <SelectItem value="user">User Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      case 'send_email':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">To</Label>
              <Input
                value={config.to || ''}
                onChange={(e) => setConfig({ ...config, to: e.target.value })}
                placeholder="recipient@example.com"
              />
            </div>
            <div>
              <Label className="mb-2 block">Subject</Label>
              <Input
                value={config.subject || ''}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label className="mb-2 block">Body</Label>
              <Textarea
                value={config.body || ''}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                placeholder="Email body (supports variables like {{trigger.data}})"
                rows={5}
              />
            </div>
          </div>
        )
      case 'create_task':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Task Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div>
              <Label className="mb-2 block">Description</Label>
              <Textarea
                value={config.description || ''}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div>
              <Label className="mb-2 block">Status</Label>
              <Select value={config.status || 'todo'} onValueChange={(value) => setConfig({ ...config, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Delay Duration</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={config.duration || ''}
                  onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) || 0 })}
                  placeholder="5"
                />
                <Select value={config.unit || 'minutes'} onValueChange={(value) => setConfig({ ...config, unit: value })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )
      // API & Webhook Actions
      case 'api_request':
      case 'webhook_call':
      case 'api_call':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">URL</Label>
              <Input
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div>
              <Label className="mb-2 block">Method</Label>
              <Select value={config.method || 'POST'} onValueChange={(value) => setConfig({ ...config, method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Authorization Header</Label>
              <Input
                value={config.authHeader || ''}
                onChange={(e) => setConfig({ ...config, authHeader: e.target.value })}
                placeholder="Bearer token or API key"
              />
            </div>
            <div>
              <Label className="mb-2 block">Content Type</Label>
              <Select value={config.contentType || 'application/json'} onValueChange={(value) => setConfig({ ...config, contentType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application/json">JSON</SelectItem>
                  <SelectItem value="application/x-www-form-urlencoded">Form Data</SelectItem>
                  <SelectItem value="text/plain">Plain Text</SelectItem>
                  <SelectItem value="application/xml">XML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Request Body</Label>
              <Textarea
                value={typeof config.body === 'string' ? config.body : (config.body ? JSON.stringify(config.body, null, 2) : '')}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                placeholder='{"key": "value"} or plain text'
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">Supports JSON, form data, or plain text based on content type</p>
            </div>
          </div>
        )
      
      // Time-based Triggers
      case 'daily':
      case 'weekly':
      case 'monthly':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Time</Label>
              <Input
                type="time"
                value={config.time || '09:00'}
                onChange={(e) => setConfig({ ...config, time: e.target.value })}
              />
            </div>
            {node.subtype === 'weekly' && (
              <div>
                <Label className="mb-2 block">Day of Week</Label>
                <Select value={config.dayOfWeek || 'monday'} onValueChange={(value) => setConfig({ ...config, dayOfWeek: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {node.subtype === 'monthly' && (
              <div>
                <Label className="mb-2 block">Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={config.dayOfMonth || '1'}
                  onChange={(e) => setConfig({ ...config, dayOfMonth: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}
          </div>
        )
      
      case 'cron':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Cron Expression</Label>
              <Input
                value={config.cronExpression || ''}
                onChange={(e) => setConfig({ ...config, cronExpression: e.target.value })}
                placeholder="0 9 * * *"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: minute hour day month weekday</p>
            </div>
          </div>
        )
      
      // Communication Actions
      case 'send_sms':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Phone Number</Label>
              <Input
                value={config.phoneNumber || ''}
                onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label className="mb-2 block">Message</Label>
              <Textarea
                value={config.message || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                placeholder="SMS message text"
                rows={4}
              />
            </div>
          </div>
        )
      
      case 'send_notification':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label className="mb-2 block">Message</Label>
              <Textarea
                value={config.message || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                placeholder="Notification message"
                rows={3}
              />
            </div>
            <div>
              <Label className="mb-2 block">Type</Label>
              <Select value={config.type || 'info'} onValueChange={(value) => setConfig({ ...config, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      
      // CRM Actions
      case 'create_contact':
      case 'update_contact':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Name</Label>
              <Input
                value={config.name || ''}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Contact name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Email</Label>
              <Input
                type="email"
                value={config.email || ''}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <Label className="mb-2 block">Phone</Label>
              <Input
                value={config.phone || ''}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label className="mb-2 block">Company</Label>
              <Input
                value={config.company || ''}
                onChange={(e) => setConfig({ ...config, company: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Job Title</Label>
              <Input
                value={config.jobTitle || ''}
                onChange={(e) => setConfig({ ...config, jobTitle: e.target.value })}
                placeholder="Job title"
              />
            </div>
            <div>
              <Label className="mb-2 block">Address</Label>
              <Textarea
                value={config.address || ''}
                onChange={(e) => setConfig({ ...config, address: e.target.value })}
                placeholder="Street address"
                rows={2}
              />
            </div>
            <div>
              <Label className="mb-2 block">Notes</Label>
              <Textarea
                value={config.notes || ''}
                onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>
        )
      
      case 'create_deal':
      case 'update_deal':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Deal Name</Label>
              <Input
                value={config.name || ''}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Deal name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={config.amount || ''}
                onChange={(e) => setConfig({ ...config, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="mb-2 block">Currency</Label>
              <Select value={config.currency || 'USD'} onValueChange={(value) => setConfig({ ...config, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Stage</Label>
              <Select value={config.stage || 'prospecting'} onValueChange={(value) => setConfig({ ...config, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Contact ID</Label>
              <Input
                value={config.contactId || ''}
                onChange={(e) => setConfig({ ...config, contactId: e.target.value })}
                placeholder="Contact ID"
              />
            </div>
            <div>
              <Label className="mb-2 block">Expected Close Date</Label>
              <Input
                type="date"
                value={config.closeDate || ''}
                onChange={(e) => setConfig({ ...config, closeDate: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Probability (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={config.probability || ''}
                onChange={(e) => setConfig({ ...config, probability: parseInt(e.target.value) || 0 })}
                placeholder="50"
              />
            </div>
          </div>
        )
      
      case 'move_deal_stage':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">New Stage</Label>
              <Select value={config.newStage || 'prospecting'} onValueChange={(value) => setConfig({ ...config, newStage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      
      // Invoicing Actions
      case 'create_invoice':
      case 'update_invoice':
        const invoiceItems = Array.isArray(config.items) ? config.items : (config.items ? [config.items] : [])
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Client ID</Label>
              <Input
                value={config.clientId || ''}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="Client ID"
              />
            </div>
            <div>
              <Label className="mb-2 block">Invoice Number</Label>
              <Input
                value={config.invoiceNumber || ''}
                onChange={(e) => setConfig({ ...config, invoiceNumber: e.target.value })}
                placeholder="INV-001"
              />
            </div>
            <div>
              <Label className="mb-2 block">Currency</Label>
              <Select value={config.currency || 'USD'} onValueChange={(value) => setConfig({ ...config, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Due Date (days from now)</Label>
              <Input
                type="number"
                value={config.dueDateDays || '30'}
                onChange={(e) => setConfig({ ...config, dueDateDays: parseInt(e.target.value) || 30 })}
                placeholder="30"
              />
            </div>
            <div>
              <Label className="mb-2 block">Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.taxRate || '0'}
                onChange={(e) => setConfig({ ...config, taxRate: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="mb-2 block">Notes</Label>
              <Textarea
                value={config.notes || ''}
                onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                placeholder="Invoice notes or terms"
                rows={3}
              />
            </div>
            <div>
              <Label className="mb-2 block">Line Items</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {invoiceItems.map((item: any, index: number) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => {
                          const newItems = [...invoiceItems]
                          newItems[index] = { ...newItems[index], description: e.target.value }
                          setConfig({ ...config, items: newItems })
                        }}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => {
                          const newItems = [...invoiceItems]
                          newItems[index] = { ...newItems[index], quantity: parseFloat(e.target.value) || 0 }
                          setConfig({ ...config, items: newItems })
                        }}
                        placeholder="1"
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price || ''}
                        onChange={(e) => {
                          const newItems = [...invoiceItems]
                          newItems[index] = { ...newItems[index], price: parseFloat(e.target.value) || 0 }
                          setConfig({ ...config, items: newItems })
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newItems = invoiceItems.filter((_: any, i: number) => i !== index)
                        setConfig({ ...config, items: newItems })
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfig({ ...config, items: [...invoiceItems, { description: '', quantity: 1, price: 0 }] })
                  }}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
          </div>
        )
      
      case 'send_invoice':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Invoice ID</Label>
              <Input
                value={config.invoiceId || ''}
                onChange={(e) => setConfig({ ...config, invoiceId: e.target.value })}
                placeholder="Invoice ID"
              />
            </div>
            <div>
              <Label className="mb-2 block">Email Template</Label>
              <Select value={config.emailTemplate || 'default'} onValueChange={(value) => setConfig({ ...config, emailTemplate: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      
      // Lead Generation Actions
      case 'create_lead':
      case 'update_lead':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Lead Name</Label>
              <Input
                value={config.name || ''}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Lead name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Email</Label>
              <Input
                type="email"
                value={config.email || ''}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                placeholder="lead@example.com"
              />
            </div>
            <div>
              <Label className="mb-2 block">Phone</Label>
              <Input
                value={config.phone || ''}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label className="mb-2 block">Company</Label>
              <Input
                value={config.company || ''}
                onChange={(e) => setConfig({ ...config, company: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Source</Label>
              <Select value={config.source || 'website'} onValueChange={(value) => setConfig({ ...config, source: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="email_campaign">Email Campaign</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Status</Label>
              <Select value={config.status || 'new'} onValueChange={(value) => setConfig({ ...config, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Notes</Label>
              <Textarea
                value={config.notes || ''}
                onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>
        )
      
      case 'score_lead':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Score Field</Label>
              <Input
                value={config.scoreField || 'score'}
                onChange={(e) => setConfig({ ...config, scoreField: e.target.value })}
                placeholder="score"
              />
            </div>
            <div>
              <Label className="mb-2 block">Base Score</Label>
              <Input
                type="number"
                value={config.baseScore || '0'}
                onChange={(e) => setConfig({ ...config, baseScore: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="mb-2 block">Email Exists Score</Label>
              <Input
                type="number"
                value={config.emailScore || '10'}
                onChange={(e) => setConfig({ ...config, emailScore: parseInt(e.target.value) || 10 })}
                placeholder="10"
              />
            </div>
            <div>
              <Label className="mb-2 block">Phone Exists Score</Label>
              <Input
                type="number"
                value={config.phoneScore || '10'}
                onChange={(e) => setConfig({ ...config, phoneScore: parseInt(e.target.value) || 10 })}
                placeholder="10"
              />
            </div>
            <div>
              <Label className="mb-2 block">Company Exists Score</Label>
              <Input
                type="number"
                value={config.companyScore || '15'}
                onChange={(e) => setConfig({ ...config, companyScore: parseInt(e.target.value) || 15 })}
                placeholder="15"
              />
            </div>
          </div>
        )
      
      // Condition Nodes
      case 'if':
      case 'if_else':
      case 'compare':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Field/Value 1</Label>
              <Input
                value={config.field1 || ''}
                onChange={(e) => setConfig({ ...config, field1: e.target.value })}
                placeholder="Field name or value"
              />
            </div>
            <div>
              <Label className="mb-2 block">Operator</Label>
              <Select value={config.operator || 'equals'} onValueChange={(value) => setConfig({ ...config, operator: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="not_equals">Not Equals</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="starts_with">Starts With</SelectItem>
                  <SelectItem value="ends_with">Ends With</SelectItem>
                  <SelectItem value="exists">Exists</SelectItem>
                  <SelectItem value="empty">Is Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Field/Value 2</Label>
              <Input
                value={config.field2 || ''}
                onChange={(e) => setConfig({ ...config, field2: e.target.value })}
                placeholder="Field name or value to compare"
              />
            </div>
          </div>
        )
      
      case 'switch':
        const switchCases = config.cases && typeof config.cases === 'object' ? Object.entries(config.cases) : []
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Field to Switch On</Label>
              <Input
                value={config.field || ''}
                onChange={(e) => setConfig({ ...config, field: e.target.value })}
                placeholder="Field name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Cases</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {switchCases.map(([key, value]: [string, any], index: number) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const newCases: any = { ...config.cases }
                        delete newCases[key]
                        newCases[e.target.value] = value
                        setConfig({ ...config, cases: newCases })
                      }}
                      placeholder="Case value"
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                      value={value}
                      onChange={(e) => {
                        const newCases: any = { ...config.cases }
                        newCases[key] = e.target.value
                        setConfig({ ...config, cases: newCases })
                      }}
                      placeholder="Output"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newCases: any = { ...config.cases }
                        delete newCases[key]
                        setConfig({ ...config, cases: newCases })
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newCases: any = { ...config.cases || {} }
                    newCases[''] = ''
                    setConfig({ ...config, cases: newCases })
                  }}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Case
                </Button>
              </div>
            </div>
          </div>
        )
      
      // Filter Nodes
      case 'filter':
      case 'filter_by_field':
      case 'filter_by_value':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Field Name</Label>
              <Input
                value={config.field || ''}
                onChange={(e) => setConfig({ ...config, field: e.target.value })}
                placeholder="Field to filter by"
              />
            </div>
            <div>
              <Label className="mb-2 block">Filter Value</Label>
              <Input
                value={config.value || ''}
                onChange={(e) => setConfig({ ...config, value: e.target.value })}
                placeholder="Value to match"
              />
            </div>
            <div>
              <Label className="mb-2 block">Match Type</Label>
              <Select value={config.matchType || 'equals'} onValueChange={(value) => setConfig({ ...config, matchType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="starts_with">Starts With</SelectItem>
                  <SelectItem value="ends_with">Ends With</SelectItem>
                  <SelectItem value="regex">Regex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      
      case 'filter_by_date':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Date Field</Label>
              <Input
                value={config.field || ''}
                onChange={(e) => setConfig({ ...config, field: e.target.value })}
                placeholder="Date field name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Filter Type</Label>
              <Select value={config.filterType || 'after'} onValueChange={(value) => setConfig({ ...config, filterType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="after">After Date</SelectItem>
                  <SelectItem value="before">Before Date</SelectItem>
                  <SelectItem value="between">Between Dates</SelectItem>
                  <SelectItem value="last_days">Last N Days</SelectItem>
                  <SelectItem value="next_days">Next N Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.filterType && (
              <div>
                <Label className="mb-2 block">Date Value</Label>
                <Input
                  type={config.filterType === 'between' ? 'text' : 'date'}
                  value={config.dateValue || ''}
                  onChange={(e) => setConfig({ ...config, dateValue: e.target.value })}
                  placeholder={config.filterType === 'between' ? 'YYYY-MM-DD,YYYY-MM-DD' : ''}
                />
              </div>
            )}
          </div>
        )
      
      // Delay Nodes
      case 'wait_seconds':
      case 'wait_minutes':
      case 'wait_hours':
      case 'wait_days':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Duration</Label>
              <Input
                type="number"
                value={config.duration || ''}
                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
        )
      
      case 'wait_until':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Date & Time</Label>
              <Input
                type="datetime-local"
                value={config.dateTime || ''}
                onChange={(e) => setConfig({ ...config, dateTime: e.target.value })}
              />
            </div>
          </div>
        )
      
      // Event Trigger
      case 'event':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Event Name</Label>
              <Input
                value={config.eventName || ''}
                onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
                placeholder="custom.event.name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Event Data Filter (optional)</Label>
              <Textarea
                value={config.eventFilter ? JSON.stringify(config.eventFilter, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const filter = e.target.value ? JSON.parse(e.target.value) : null
                    setConfig({ ...config, eventFilter: filter })
                  } catch {}
                }}
                placeholder='{"key": "value"} - Only trigger if event data matches'
                rows={4}
              />
            </div>
          </div>
        )
      
      // Form Submission Trigger
      case 'form_submission':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Form ID or Name</Label>
              <Input
                value={config.formId || ''}
                onChange={(e) => setConfig({ ...config, formId: e.target.value })}
                placeholder="form-id or form name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Page Context (optional)</Label>
              <Input
                value={config.pageContext || ''}
                onChange={(e) => setConfig({ ...config, pageContext: e.target.value })}
                placeholder="Page where form appears"
              />
            </div>
          </div>
        )
      
      // Database Actions
      case 'update_database':
      case 'create_record':
      case 'update_record':
      case 'delete_record':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Table Name</Label>
              <Input
                value={config.tableName || ''}
                onChange={(e) => setConfig({ ...config, tableName: e.target.value })}
                placeholder="table_name"
              />
            </div>
            {node.subtype !== 'delete_record' && (
              <div>
                <Label className="mb-2 block">Data (JSON)</Label>
                <Textarea
                  value={config.data ? JSON.stringify(config.data, null, 2) : '{}'}
                  onChange={(e) => {
                    try {
                      const data = JSON.parse(e.target.value)
                      setConfig({ ...config, data })
                    } catch {}
                  }}
                  placeholder='{"field": "value"}'
                  rows={6}
                />
              </div>
            )}
            {node.subtype === 'update_record' && (
              <div>
                <Label className="mb-2 block">Where Condition (JSON)</Label>
                <Textarea
                  value={config.where ? JSON.stringify(config.where, null, 2) : '{}'}
                  onChange={(e) => {
                    try {
                      const where = JSON.parse(e.target.value)
                      setConfig({ ...config, where })
                    } catch {}
                  }}
                  placeholder='{"id": "value"}'
                  rows={3}
                />
              </div>
            )}
            {node.subtype === 'delete_record' && (
              <div>
                <Label className="mb-2 block">Where Condition (JSON)</Label>
                <Textarea
                  value={config.where ? JSON.stringify(config.where, null, 2) : '{}'}
                  onChange={(e) => {
                    try {
                      const where = JSON.parse(e.target.value)
                      setConfig({ ...config, where })
                    } catch {}
                  }}
                  placeholder='{"id": "value"}'
                  rows={3}
                />
              </div>
            )}
          </div>
        )
      
      case 'query_database':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Table Name</Label>
              <Input
                value={config.tableName || ''}
                onChange={(e) => setConfig({ ...config, tableName: e.target.value })}
                placeholder="table_name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Select Fields (comma-separated)</Label>
              <Input
                value={config.select || '*'}
                onChange={(e) => setConfig({ ...config, select: e.target.value })}
                placeholder="* or field1, field2, field3"
              />
            </div>
            <div>
              <Label className="mb-2 block">Where Condition (JSON)</Label>
              <Textarea
                value={config.where ? JSON.stringify(config.where, null, 2) : '{}'}
                onChange={(e) => {
                  try {
                    const where = JSON.parse(e.target.value)
                    setConfig({ ...config, where })
                  } catch {}
                }}
                placeholder='{"field": "value"}'
                rows={3}
              />
            </div>
            <div>
              <Label className="mb-2 block">Limit</Label>
              <Input
                type="number"
                value={config.limit || ''}
                onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) || undefined })}
                placeholder="100"
              />
            </div>
          </div>
        )
      
      // Analytics Actions
      case 'track_event':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Event Name</Label>
              <Input
                value={config.eventName || ''}
                onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
                placeholder="event.name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Event Properties (JSON)</Label>
              <Textarea
                value={config.properties ? JSON.stringify(config.properties, null, 2) : '{}'}
                onChange={(e) => {
                  try {
                    const properties = JSON.parse(e.target.value)
                    setConfig({ ...config, properties })
                  } catch {}
                }}
                placeholder='{"key": "value"}'
                rows={5}
              />
            </div>
          </div>
        )
      
      case 'update_metric':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Metric Name</Label>
              <Input
                value={config.metricName || ''}
                onChange={(e) => setConfig({ ...config, metricName: e.target.value })}
                placeholder="metric.name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Value</Label>
              <Input
                type="number"
                value={config.value || ''}
                onChange={(e) => setConfig({ ...config, value: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="mb-2 block">Operation</Label>
              <Select value={config.operation || 'set'} onValueChange={(value) => setConfig({ ...config, operation: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="increment">Increment</SelectItem>
                  <SelectItem value="decrement">Decrement</SelectItem>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="subtract">Subtract</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      
      case 'generate_report':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Report Name</Label>
              <Input
                value={config.reportName || ''}
                onChange={(e) => setConfig({ ...config, reportName: e.target.value })}
                placeholder="Report name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Report Type</Label>
              <Select value={config.reportType || 'summary'} onValueChange={(value) => setConfig({ ...config, reportType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Data Source</Label>
              <Input
                value={config.dataSource || ''}
                onChange={(e) => setConfig({ ...config, dataSource: e.target.value })}
                placeholder="Data source or query"
              />
            </div>
          </div>
        )
      
      // User Management Actions
      case 'create_user':
      case 'update_user':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Email</Label>
              <Input
                type="email"
                value={config.email || ''}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label className="mb-2 block">Full Name</Label>
              <Input
                value={config.fullName || ''}
                onChange={(e) => setConfig({ ...config, fullName: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Role</Label>
              <Select value={config.role || 'user'} onValueChange={(value) => setConfig({ ...config, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {node.subtype === 'create_user' && (
              <div>
                <Label className="mb-2 block">Send Invitation Email</Label>
                <Select value={config.sendInvitation !== false ? 'true' : 'false'} onValueChange={(value) => setConfig({ ...config, sendInvitation: value === 'true' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )
      
      case 'invite_user':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Email</Label>
              <Input
                type="email"
                value={config.email || ''}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label className="mb-2 block">Role</Label>
              <Select value={config.role || 'user'} onValueChange={(value) => setConfig({ ...config, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Custom Message (optional)</Label>
              <Textarea
                value={config.message || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                placeholder="Custom invitation message"
                rows={3}
              />
            </div>
          </div>
        )
      
      case 'update_permissions':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">User ID</Label>
              <Input
                value={config.userId || ''}
                onChange={(e) => setConfig({ ...config, userId: e.target.value })}
                placeholder="User ID"
              />
            </div>
            <div>
              <Label className="mb-2 block">Permissions (JSON array)</Label>
              <Textarea
                value={config.permissions ? JSON.stringify(config.permissions, null, 2) : '[]'}
                onChange={(e) => {
                  try {
                    const permissions = JSON.parse(e.target.value)
                    setConfig({ ...config, permissions })
                  } catch {}
                }}
                placeholder='["crm:contacts", "invoicing:invoices"]'
                rows={4}
              />
            </div>
          </div>
        )
      
      // Data Transformation
      case 'transform_data':
      case 'format_data':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Input Field</Label>
              <Input
                value={config.inputField || ''}
                onChange={(e) => setConfig({ ...config, inputField: e.target.value })}
                placeholder="Field name to transform"
              />
            </div>
            <div>
              <Label className="mb-2 block">Output Field</Label>
              <Input
                value={config.outputField || ''}
                onChange={(e) => setConfig({ ...config, outputField: e.target.value })}
                placeholder="Output field name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Transformation Type</Label>
              <Select value={config.transformType || 'uppercase'} onValueChange={(value) => setConfig({ ...config, transformType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uppercase">Uppercase</SelectItem>
                  <SelectItem value="lowercase">Lowercase</SelectItem>
                  <SelectItem value="trim">Trim Whitespace</SelectItem>
                  <SelectItem value="format_date">Format Date</SelectItem>
                  <SelectItem value="format_number">Format Number</SelectItem>
                  <SelectItem value="custom">Custom (JSON)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.transformType === 'format_date' && (
              <div>
                <Label className="mb-2 block">Date Format</Label>
                <Input
                  value={config.dateFormat || 'YYYY-MM-DD'}
                  onChange={(e) => setConfig({ ...config, dateFormat: e.target.value })}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            )}
          </div>
        )
      
      case 'calculate':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Expression</Label>
              <Input
                value={config.expression || ''}
                onChange={(e) => setConfig({ ...config, expression: e.target.value })}
                placeholder="field1 + field2 or field1 * 0.1"
              />
            </div>
            <div>
              <Label className="mb-2 block">Output Field</Label>
              <Input
                value={config.outputField || ''}
                onChange={(e) => setConfig({ ...config, outputField: e.target.value })}
                placeholder="result"
              />
            </div>
          </div>
        )
      
      case 'log_message':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Message</Label>
              <Textarea
                value={config.message || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                placeholder="Log message (supports variables)"
                rows={4}
              />
            </div>
            <div>
              <Label className="mb-2 block">Log Level</Label>
              <Select value={config.level || 'info'} onValueChange={(value) => setConfig({ ...config, level: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      
      case 'wait_for_event':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Event Name</Label>
              <Input
                value={config.eventName || ''}
                onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
                placeholder="event.name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Timeout (seconds)</Label>
              <Input
                type="number"
                value={config.timeout || '300'}
                onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 300 })}
                placeholder="300"
              />
            </div>
          </div>
        )
      
      case 'wait_for_condition':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Field to Check</Label>
              <Input
                value={config.field || ''}
                onChange={(e) => setConfig({ ...config, field: e.target.value })}
                placeholder="Field name"
              />
            </div>
            <div>
              <Label className="mb-2 block">Expected Value</Label>
              <Input
                value={config.expectedValue || ''}
                onChange={(e) => setConfig({ ...config, expectedValue: e.target.value })}
                placeholder="Expected value"
              />
            </div>
            <div>
              <Label className="mb-2 block">Check Interval (seconds)</Label>
              <Input
                type="number"
                value={config.checkInterval || '5'}
                onChange={(e) => setConfig({ ...config, checkInterval: parseInt(e.target.value) || 5 })}
                placeholder="5"
              />
            </div>
            <div>
              <Label className="mb-2 block">Timeout (seconds)</Label>
              <Input
                type="number"
                value={config.timeout || '300'}
                onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 300 })}
                placeholder="300"
              />
            </div>
          </div>
        )
      
      // Error Handling Nodes
      case 'on_error':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/50 bg-red-50/50 dark:bg-red-950/20 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                    Error Handler
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    This node executes when a previous node fails. Connect this to nodes that should handle errors.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">Error Type Filter (optional)</Label>
              <Select value={config.errorType || 'any'} onValueChange={(value) => setConfig({ ...config, errorType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Error</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                  <SelectItem value="network">Network Error</SelectItem>
                  <SelectItem value="validation">Validation Error</SelectItem>
                  <SelectItem value="permission">Permission Error</SelectItem>
                  <SelectItem value="not_found">Not Found</SelectItem>
                  <SelectItem value="custom">Custom Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block">Error Message Pattern (optional)</Label>
              <Input
                value={config.errorPattern || ''}
                onChange={(e) => setConfig({ ...config, errorPattern: e.target.value })}
                placeholder="Error message pattern to match"
              />
            </div>
          </div>
        )
      
      case 'retry':
        return (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Max Retries</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={config.maxRetries || '3'}
                onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) || 3 })}
                placeholder="3"
              />
            </div>
            
            <div>
              <Label className="mb-2 block">Retry Delay (seconds)</Label>
              <Input
                type="number"
                min="0"
                value={config.retryDelay || '1'}
                onChange={(e) => setConfig({ ...config, retryDelay: parseInt(e.target.value) || 1 })}
                placeholder="1"
              />
            </div>
            
            <div>
              <Label className="mb-2 block">Backoff Strategy</Label>
              <Select value={config.backoffStrategy || 'fixed'} onValueChange={(value) => setConfig({ ...config, backoffStrategy: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Delay</SelectItem>
                  <SelectItem value="exponential">Exponential Backoff</SelectItem>
                  <SelectItem value="linear">Linear Increase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block">Retry on Error Types</Label>
              <Textarea
                value={config.retryOnErrors ? JSON.stringify(config.retryOnErrors, null, 2) : '[]'}
                onChange={(e) => {
                  try {
                    const retryOnErrors = JSON.parse(e.target.value)
                    setConfig({ ...config, retryOnErrors })
                  } catch {}
                }}
                placeholder='["timeout", "network"] - Leave empty to retry on all errors'
                rows={3}
              />
            </div>
          </div>
        )
      
      case 'catch_error':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Error Catcher
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Catches errors from connected nodes and allows the workflow to continue.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">Error Handling Action</Label>
              <Select value={config.action || 'log'} onValueChange={(value) => setConfig({ ...config, action: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="log">Log Error</SelectItem>
                  <SelectItem value="notify">Send Notification</SelectItem>
                  <SelectItem value="continue">Continue Silently</SelectItem>
                  <SelectItem value="default_value">Use Default Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {config.action === 'default_value' && (
              <div>
                <Label className="mb-2 block">Default Value (JSON)</Label>
                <Textarea
                  value={config.defaultValue ? JSON.stringify(config.defaultValue, null, 2) : '{}'}
                  onChange={(e) => {
                    try {
                      const defaultValue = JSON.parse(e.target.value)
                      setConfig({ ...config, defaultValue })
                    } catch {}
                  }}
                  placeholder='{"result": null}'
                  rows={3}
                />
              </div>
            )}
            
            {config.action === 'notify' && (
              <div>
                <Label className="mb-2 block">Notification Recipient</Label>
                <Input
                  value={config.notifyTo || ''}
                  onChange={(e) => setConfig({ ...config, notifyTo: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            )}
          </div>
        )
      
      case 'fallback':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 p-4">
              <div className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                    Fallback Action
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Executes when the previous node fails. Provides an alternative path for the workflow.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">Fallback Type</Label>
              <Select value={config.fallbackType || 'default'} onValueChange={(value) => setConfig({ ...config, fallbackType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use Default Value</SelectItem>
                  <SelectItem value="skip">Skip Node</SelectItem>
                  <SelectItem value="alternative">Alternative Action</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {config.fallbackType === 'default' && (
              <div>
                <Label className="mb-2 block">Default Value (JSON)</Label>
                <Textarea
                  value={config.defaultValue ? JSON.stringify(config.defaultValue, null, 2) : '{}'}
                  onChange={(e) => {
                    try {
                      const defaultValue = JSON.parse(e.target.value)
                      setConfig({ ...config, defaultValue })
                    } catch {}
                  }}
                  placeholder='{"result": null}'
                  rows={3}
                />
              </div>
            )}
          </div>
        )
      
      // Custom Code Node
      case 'custom_code':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                    Advanced: Custom Code Execution
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    This node allows you to write custom JavaScript code. Use with caution - incorrect code may cause errors in your automation.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">Language</Label>
              <Select value={config.language || 'javascript'} onValueChange={(value) => setConfig({ ...config, language: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block">Code</Label>
              <Textarea
                value={config.code || ''}
                onChange={(e) => setConfig({ ...config, code: e.target.value })}
                placeholder={`// Access workflow data via 'data' object
// Return result via 'return' statement
// Example:
const result = data.input * 2;
return { output: result };`}
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Write your custom code here. Access previous node outputs via the <code className="px-1 py-0.5 bg-muted rounded">data</code> object.
              </p>
            </div>
            
            <div>
              <Label className="mb-2 block">Timeout (seconds)</Label>
              <Input
                type="number"
                value={config.timeout || '30'}
                onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 30 })}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum execution time before the node times out
              </p>
            </div>
            
            <div>
              <Label className="mb-2 block">Error Handling</Label>
              <Select value={config.errorHandling || 'stop'} onValueChange={(value) => setConfig({ ...config, errorHandling: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stop">Stop Workflow on Error</SelectItem>
                  <SelectItem value="continue">Continue Workflow</SelectItem>
                  <SelectItem value="retry">Retry (3 times)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-xs font-medium mb-2">Available Variables:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li><code className="px-1 py-0.5 bg-background rounded">data</code> - Previous node outputs</li>
                <li><code className="px-1 py-0.5 bg-background rounded">trigger</code> - Trigger data</li>
                <li><code className="px-1 py-0.5 bg-background rounded">context</code> - Workflow context</li>
                <li><code className="px-1 py-0.5 bg-background rounded">return</code> - Return value for next node</li>
              </ul>
            </div>
          </div>
        )
      
      // Generic configuration for nodes without specific config
      default:
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">
                This node type doesn't have a specific form configuration yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Switch to the <strong>JSON (Advanced)</strong> tab to configure this node using JSON.
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6 mt-4">
      <div>
        <Label className="mb-2 block">Node Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Node title"
        />
      </div>
      <div>
        <Label className="mb-2 block">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={2}
        />
      </div>
      
      <div>
        <Tabs value={configMode} onValueChange={(value) => {
          setConfigMode(value as 'form' | 'json')
          setJsonError(null)
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="json">JSON (Advanced)</TabsTrigger>
          </TabsList>
          <TabsContent value="form" className="mt-4">
            {renderConfigFields()}
          </TabsContent>
          <TabsContent value="json" className="mt-4">
            <div className="space-y-2">
              <Label className="mb-2 block">Configuration (JSON)</Label>
              <Textarea
                value={JSON.stringify(config, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setConfig(parsed)
                    setJsonError(null)
                  } catch (error) {
                    setJsonError(error instanceof Error ? error.message : 'Invalid JSON')
                  }
                }}
                placeholder='{"key": "value"}'
                rows={12}
                className="font-mono text-sm"
              />
              {jsonError && (
                <p className="text-sm text-destructive">{jsonError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter configuration as JSON. Changes here will override form values.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Error Handling Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Error Handling</Label>
        </div>
        
        <div>
          <Label className="mb-2 block">On Error</Label>
          <Select 
            value={config.onError || 'stop'} 
            onValueChange={(value) => setConfig({ ...config, onError: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stop">Stop Workflow</SelectItem>
              <SelectItem value="continue">Continue to Next Node</SelectItem>
              <SelectItem value="retry">Retry Node</SelectItem>
              <SelectItem value="fallback">Use Fallback Node</SelectItem>
              <SelectItem value="skip">Skip This Node</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {config.onError === 'retry' && (
          <>
            <div>
              <Label className="mb-2 block">Max Retries</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={config.maxRetries || '3'}
                onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) || 3 })}
                placeholder="3"
              />
            </div>
            <div>
              <Label className="mb-2 block">Retry Delay (seconds)</Label>
              <Input
                type="number"
                min="0"
                value={config.retryDelay || '1'}
                onChange={(e) => setConfig({ ...config, retryDelay: parseInt(e.target.value) || 1 })}
                placeholder="1"
              />
            </div>
          </>
        )}
        
        {config.onError === 'continue' && (
          <div>
            <Label className="mb-2 block">Default Output Value (JSON, optional)</Label>
            <Textarea
              value={config.defaultOutput ? JSON.stringify(config.defaultOutput, null, 2) : '{}'}
              onChange={(e) => {
                try {
                  const defaultOutput = JSON.parse(e.target.value)
                  setConfig({ ...config, defaultOutput })
                } catch {}
              }}
              placeholder='{"result": null} - Value to pass to next node on error'
              rows={3}
            />
          </div>
        )}
        
        {config.onError === 'fallback' && (
          <div>
            <Label className="mb-2 block">Fallback Node ID (optional)</Label>
            <Input
              value={config.fallbackNodeId || ''}
              onChange={(e) => setConfig({ ...config, fallbackNodeId: e.target.value })}
              placeholder="Node ID to execute on error"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to use the connected error handler node
            </p>
          </div>
        )}
        
        <div>
          <Label className="mb-2 block">Error Notification (optional)</Label>
          <Select 
            value={config.errorNotification || 'none'} 
            onValueChange={(value) => setConfig({ ...config, errorNotification: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Notification</SelectItem>
              <SelectItem value="email">Send Email</SelectItem>
              <SelectItem value="notification">In-App Notification</SelectItem>
              <SelectItem value="log">Log Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {config.errorNotification && config.errorNotification !== 'none' && config.errorNotification !== 'log' && (
          <div>
            <Label className="mb-2 block">Notification Recipient</Label>
            <Input
              value={config.notificationRecipient || ''}
              onChange={(e) => setConfig({ ...config, notificationRecipient: e.target.value })}
              placeholder={config.errorNotification === 'email' ? 'email@example.com' : 'User ID or email'}
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
          className="w-4 h-4"
        />
        <Label htmlFor="enabled" className="cursor-pointer">Node Enabled</Label>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  )
}
