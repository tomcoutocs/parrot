/**
 * Example usage of space-wide notifications
 * 
 * This file shows how to use the createSpaceWideNotification function
 * to send notifications to all users in a space.
 */

import { createSpaceWideNotification } from './notification-functions'

/**
 * Example: Send a general space update notification
 */
export async function sendSpaceUpdateExample(
  companyId: string,
  createdByUserId: string,
  updateMessage: string
) {
  const result = await createSpaceWideNotification(companyId, {
    title: 'Space Update',
    message: updateMessage,
    created_by_user_id: createdByUserId,
    metadata: {
      update_type: 'general',
      timestamp: new Date().toISOString()
    }
  })

  if (result.success) {
    console.log(`Successfully sent notification to ${result.createdCount} users`)
  } else {
    console.error('Failed to send notification:', result.error)
  }

  return result
}

/**
 * Example: Send a project-related space notification
 */
export async function sendProjectAnnouncementExample(
  companyId: string,
  projectId: string,
  projectName: string,
  createdByUserId: string,
  announcement: string
) {
  const result = await createSpaceWideNotification(companyId, {
    title: `New Project: ${projectName}`,
    message: announcement,
    created_by_user_id: createdByUserId,
    related_project_id: projectId,
    metadata: {
      announcement_type: 'project',
      project_name: projectName
    }
  })

  return result
}

/**
 * Example: Send a maintenance/announcement notification
 */
export async function sendMaintenanceAnnouncementExample(
  companyId: string,
  createdByUserId: string,
  maintenanceDetails: {
    startTime: string
    endTime: string
    reason: string
  }
) {
  const result = await createSpaceWideNotification(companyId, {
    title: 'Scheduled Maintenance',
    message: `Scheduled maintenance will occur from ${maintenanceDetails.startTime} to ${maintenanceDetails.endTime}. Reason: ${maintenanceDetails.reason}`,
    created_by_user_id: createdByUserId,
    metadata: {
      maintenance_start: maintenanceDetails.startTime,
      maintenance_end: maintenanceDetails.endTime,
      maintenance_reason: maintenanceDetails.reason
    }
  })

  return result
}

