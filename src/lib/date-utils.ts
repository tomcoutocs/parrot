/**
 * Date utility functions to handle timezone issues with date inputs
 */

/**
 * Formats a date string for HTML date input (YYYY-MM-DD)
 * Handles timezone conversion properly
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  try {
    // If the dateString is already in YYYY-MM-DD format, return it as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // Parse the date and extract the date components
    const date = new Date(dateString)
    
    // Get the date components (this will work correctly with noon UTC dates)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('Error formatting date for input:', error)
    return ''
  }
}

/**
 * Formats a date string for database storage
 * Creates a date that represents the correct day in the user's timezone
 */
export function formatDateForDatabase(dateString: string): string {
  if (!dateString) return ''
  
  try {
    // Parse the date components to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number)
    
    // Create a date object in local timezone that represents the correct day
    // We'll store it as noon UTC to avoid midnight timezone shifts
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    
    return date.toISOString()
  } catch (error) {
    console.error('Error formatting date for database:', error)
    return ''
  }
}

/**
 * Gets current date string in YYYY-MM-DD format for date inputs
 */
export function getCurrentDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}
