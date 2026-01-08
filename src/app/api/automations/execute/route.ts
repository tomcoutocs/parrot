import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { sendInvitationEmail, sendInvoiceEmail } from '@/lib/email'
import { createTask } from '@/lib/database-functions'

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    const { automationId, triggerData } = await request.json()

    if (!automationId) {
      return NextResponse.json(
        { success: false, error: 'Automation ID is required' },
        { status: 400 }
      )
    }

    // Get automation with nodes and connections
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('*, nodes:automation_nodes(*), connections:automation_connections(*)')
      .eq('id', automationId)
      .eq('is_active', true)
      .single()

    if (automationError || !automation) {
      return NextResponse.json(
        { success: false, error: 'Automation not found or not active' },
        { status: 404 }
      )
    }

    // Verify user has access
    const hasAccess = 
      automation.user_id === currentUser.id ||
      (automation.space_id && currentUser.companyId === automation.space_id) ||
      currentUser.role === 'system_admin' ||
      currentUser.role === 'admin'

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create execution record
    const executionStart = new Date()
    const { data: execution, error: executionError } = await supabase
      .from('automation_executions')
      .insert({
        automation_id: automationId,
        trigger_data: triggerData || {},
        status: 'running',
        execution_data: {
          nodes: automation.nodes,
          connections: automation.connections,
        },
      })
      .select()
      .single()

    if (executionError || !execution) {
      return NextResponse.json(
        { success: false, error: 'Failed to create execution record' },
        { status: 500 }
      )
    }

    // Execute automation workflow
    // This is a simplified version - in production, this would be a queue-based system
    try {
      const executionResult = await executeWorkflow(
        automation.nodes || [],
        automation.connections || [],
        triggerData || {},
        currentUser.id,
        automation.space_id || currentUser.companyId || undefined
      )

      const executionEnd = new Date()
      const executionTime = executionEnd.getTime() - executionStart.getTime()

      // Update execution record
      await supabase
        .from('automation_executions')
        .update({
          status: executionResult.success ? 'completed' : 'failed',
          completed_at: executionEnd.toISOString(),
          execution_time_ms: executionTime,
          execution_data: {
            ...execution.execution_data,
            result: executionResult,
          },
          error_message: executionResult.error || null,
        })
        .eq('id', execution.id)

      // Update automation stats
      await supabase
        .from('automations')
        .update({
          last_run_at: executionEnd.toISOString(),
          run_count: (automation.run_count || 0) + 1,
          success_count: executionResult.success 
            ? (automation.success_count || 0) + 1 
            : automation.success_count || 0,
          failure_count: !executionResult.success 
            ? (automation.failure_count || 0) + 1 
            : automation.failure_count || 0,
        })
        .eq('id', automationId)

      return NextResponse.json({
        success: true,
        executionId: execution.id,
        result: executionResult,
      })
    } catch (error: any) {
      const executionEnd = new Date()
      const executionTime = executionEnd.getTime() - executionStart.getTime()

      await supabase
        .from('automation_executions')
        .update({
          status: 'failed',
          completed_at: executionEnd.toISOString(),
          execution_time_ms: executionTime,
          error_message: error.message || 'Execution failed',
        })
        .eq('id', execution.id)

      await supabase
        .from('automations')
        .update({
          last_run_at: executionEnd.toISOString(),
          run_count: (automation.run_count || 0) + 1,
          failure_count: (automation.failure_count || 0) + 1,
        })
        .eq('id', automationId)

      return NextResponse.json(
        { success: false, error: error.message || 'Execution failed' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error executing automation:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute automation' },
      { status: 500 }
    )
  }
}

// Simplified workflow execution engine
async function executeWorkflow(
  nodes: any[],
  connections: any[],
  triggerData: any,
  userId?: string,
  spaceId?: string
): Promise<{ success: boolean; error?: string; results?: any[] }> {
  const results: any[] = []
  const nodeOutputs: Record<string, any> = {}
  
  // Sort nodes by order_index
  const sortedNodes = [...nodes].sort((a, b) => a.order_index - b.order_index)
  
  // Find trigger node
  const triggerNode = sortedNodes.find(n => n.node_type === 'trigger')
  if (!triggerNode) {
    return { success: false, error: 'No trigger node found' }
  }

  // Execute trigger
  nodeOutputs[triggerNode.id] = await executeNode(triggerNode, triggerData, userId, spaceId)
  results.push({ nodeId: triggerNode.id, output: nodeOutputs[triggerNode.id] })

  // Execute connected nodes in order
  const executedNodes = new Set([triggerNode.id])
  
  for (const node of sortedNodes) {
    if (node.node_type === 'trigger' || executedNodes.has(node.id)) continue
    
    // Check if all source connections have been executed
    const sourceConnections = connections.filter(c => c.target_node_id === node.id)
    const canExecute = sourceConnections.every(conn => executedNodes.has(conn.source_node_id))
    
    if (canExecute) {
      // Get input from source nodes
      const inputs = sourceConnections.map(conn => ({
        sourceId: conn.source_node_id,
        data: nodeOutputs[conn.source_node_id],
        condition: conn.condition_type,
        conditionConfig: conn.condition_config,
      }))

      // Check conditions
      let shouldExecute = true
      for (const input of inputs) {
        if (input.condition === 'if' && !input.conditionConfig) {
          shouldExecute = false
          break
        }
        if (input.condition === 'unless' && input.conditionConfig) {
          shouldExecute = false
          break
        }
      }

      if (shouldExecute) {
        const nodeInput = inputs.length > 0 ? inputs[0].data : triggerData
        nodeOutputs[node.id] = await executeNode(node, nodeInput, userId, spaceId)
        results.push({ nodeId: node.id, output: nodeOutputs[node.id] })
        executedNodes.add(node.id)
      }
    }
  }

  return { success: true, results }
}

// Execute a single node
async function executeNode(node: any, input: any, userId?: string, spaceId?: string): Promise<any> {
  const currentUser = getCurrentUser()
  const executingUserId = userId || currentUser?.id || ''
  
  switch (node.node_subtype) {
    case 'send_email':
      try {
        const emailConfig = node.config || {}
        const emailData = input?.emailData || {}
        
        // Determine email type based on config or input
        if (emailConfig.type === 'invoice' || emailData.type === 'invoice') {
          // Send invoice email
          const invoiceEmailData = {
            to: emailConfig.to || emailData.to || input?.to,
            clientName: emailConfig.clientName || emailData.clientName || input?.clientName || 'Customer',
            invoiceNumber: emailConfig.invoiceNumber || emailData.invoiceNumber || input?.invoiceNumber || 'INV-001',
            amount: emailConfig.amount || emailData.amount || input?.amount || 0,
            currency: emailConfig.currency || emailData.currency || input?.currency || 'USD',
            hostedLink: emailConfig.hostedLink || emailData.hostedLink || input?.hostedLink || ''
          }
          
          const result = await sendInvoiceEmail(invoiceEmailData)
          if (!result.success) {
            return { success: false, error: result.error || 'Failed to send invoice email' }
          }
          return { success: true, message: 'Invoice email sent successfully' }
        } else {
          // Send invitation or generic email
          const invitationEmailData = {
            recipientEmail: emailConfig.to || emailData.to || input?.to || input?.email,
            recipientName: emailConfig.recipientName || emailData.recipientName || input?.recipientName || input?.name || 'User',
            companyName: emailConfig.companyName || emailData.companyName || input?.companyName || 'Parrot Portal',
            invitationToken: emailConfig.invitationToken || emailData.invitationToken || input?.token || '',
            inviterName: emailConfig.inviterName || emailData.inviterName || input?.inviterName || 'Admin',
            role: emailConfig.role || emailData.role || input?.role || 'user',
            expiresAt: emailConfig.expiresAt || emailData.expiresAt || input?.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
          
          const result = await sendInvitationEmail(invitationEmailData)
          if (!result.success) {
            return { success: false, error: result.error || 'Failed to send email' }
          }
          return { success: true, message: 'Email sent successfully' }
        }
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to send email' }
      }
    
    case 'create_task':
      try {
        const taskConfig = node.config || {}
        const taskData = input?.taskData || {}
        
        // Extract task data from config or input
        const taskToCreate = {
          title: taskConfig.title || taskData.title || input?.title || 'New Task',
          description: taskConfig.description || taskData.description || input?.description || '',
          status: (taskConfig.status || taskData.status || input?.status || 'todo') as 'todo' | 'in_progress' | 'review' | 'done',
          priority: (taskConfig.priority || taskData.priority || input?.priority || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
          project_id: taskConfig.projectId || taskData.projectId || input?.projectId || spaceId || null,
          assigned_to: taskConfig.assignedTo || taskData.assignedTo || input?.assignedTo || null,
          due_date: taskConfig.dueDate || taskData.dueDate || input?.dueDate || null,
          estimated_hours: taskConfig.estimatedHours || taskData.estimatedHours || input?.estimatedHours || 0,
          actual_hours: 0,
          position: taskConfig.position || taskData.position || input?.position || 0,
          created_by: executingUserId
        }
        
        const createdTask = await createTask(taskToCreate, executingUserId)
        if (!createdTask) {
          return { success: false, error: 'Failed to create task' }
        }
        return { success: true, taskId: createdTask.id, task: createdTask }
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to create task' }
      }
    
    case 'webhook_call':
      try {
        const webhookConfig = node.config || {}
        const webhookData = input?.webhookData || {}
        
        const url = webhookConfig.url || webhookData.url || input?.url
        if (!url) {
          return { success: false, error: 'Webhook URL is required' }
        }
        
        const method = (webhookConfig.method || webhookData.method || input?.method || 'POST').toUpperCase()
        const headers = webhookConfig.headers || webhookData.headers || input?.headers || {}
        const body = webhookConfig.body || webhookData.body || input?.body || input?.data
        
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        }
        
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
        }
        
        const response = await fetch(url, fetchOptions)
        const responseText = await response.text()
        
        let responseData: any
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = responseText
        }
        
        if (!response.ok) {
          return { 
            success: false, 
            error: `Webhook call failed: ${response.status} ${response.statusText}`,
            response: responseData
          }
        }
        
        return { 
          success: true, 
          response: responseData,
          status: response.status,
          statusText: response.statusText
        }
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to call webhook' }
      }
    
    case 'delay':
      const duration = node.config?.duration || 0
      const unit = node.config?.unit || 'seconds'
      const ms = duration * (unit === 'seconds' ? 1000 : unit === 'minutes' ? 60000 : unit === 'hours' ? 3600000 : 86400000)
      await new Promise(resolve => setTimeout(resolve, Math.min(ms, 5000))) // Max 5 seconds for testing
      return { success: true, delayed: true }
    
    default:
      return { success: true, data: input }
  }
}

