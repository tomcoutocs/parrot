/**
 * Date utility functions to handle timezone issues with date inputs
 */

/**
 * Formats a date string for HTML date input (YYYY-MM-DD)
 * Handles timezone conversion properly by using local date components
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  try {
    // If the dateString is already in YYYY-MM-DD format, return it as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // Parse the date - handle both ISO strings and date-only strings
    let date: Date
    if (dateString.includes('T')) {
      // ISO string with time - parse directly
      date = new Date(dateString)
    } else {
      // Date-only string (YYYY-MM-DD) - create date in local timezone
      const [year, month, day] = dateString.split('-').map(Number)
      date = new Date(year, month - 1, day)
    }
    
    // Get the date components using local timezone (not UTC)
    // This ensures the date displayed matches what the user selected
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('Error formatting date for input:', error)
    return ''
  }
}

/**
 * Formats a date string for database storage
 * Stores as YYYY-MM-DD string to avoid timezone issues
 */
export function formatDateForDatabase(dateString: string): string {
  if (!dateString) return ''
  
  try {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // Parse the date components to avoid timezone issues
    // If it's a date-only string, parse directly
    if (!dateString.includes('T')) {
      // Already in YYYY-MM-DD format or similar
      const parts = dateString.split('-').map(Number)
      if (parts.length === 3) {
        const year = parts[0]
        const month = String(parts[1]).padStart(2, '0')
        const day = String(parts[2]).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    }
    
    // Parse ISO string and extract date components in local timezone
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    // Return as YYYY-MM-DD (date-only, no time component)
    // This avoids timezone shift issues
    return `${year}-${month}-${day}`
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
