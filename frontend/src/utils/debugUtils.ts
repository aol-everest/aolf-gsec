/**
 * Debug logging utility for development environment
 */

/**
 * Gets the name of the function that called the logger
 * @returns The name of the calling function or component
 */
const getCallerInfo = () => {
  try {
    // Create an error to get the stack trace
    const err = new Error();
    // Get the stack trace and split it into lines
    const stackLines = err.stack?.split('\n') || [];
    
    // The calling function will be 3 levels up in the stack (after Error, getCallerInfo, and debugLog)
    const callerLine = stackLines[3] || '';
    
    // Extract function or component name using regex
    // This will match:
    // - Regular function names: "at functionName ("
    // - Component render functions: "at ComponentName.render ("
    // - Anonymous functions in components: "at ComponentName ("
    const functionMatch = callerLine.match(/at\s+([\w.]+)\s*[(.]/) || [];
    let caller = functionMatch[1] || 'unknown';
    
    // Clean up common patterns
    caller = caller
      .replace('Object.', '') // Remove Object. prefix
      .replace('.render', '') // Remove .render suffix
      .replace('<anonymous>', 'anonymous'); // Clean up anonymous functions
    
    return caller;
  } catch (error) {
    // Fallback if stack trace parsing fails
    return 'unknown';
  }
};

/**
 * Debug logging utility that only logs in development environment
 * @param context The context/component name (optional, will be auto-detected if not provided)
 * @param message The message to log
 * @param data Additional data to log (optional)
 */
export const debugLog = (message: string, data?: any, context?: string) => {
  if (process.env.NODE_ENV !== 'production') {
    const caller = context || getCallerInfo();
    const timestamp = new Date().toISOString();
    
    // Format the log message
    const logPrefix = `[${timestamp}] [${caller}]`;
    
    if (data !== undefined) {
      console.log(`${logPrefix} ${message}`, data);
    } else {
      console.log(`${logPrefix} ${message}`);
    }
  }
};

/**
 * Creates a debug logger instance with a predefined context
 * @param context The context/component name to use for all logs
 * @returns A debug logger function bound to the specified context
 */
export const createDebugLogger = (context: string) => {
  return (message: string, data?: any) => debugLog(message, data, context);
}; 