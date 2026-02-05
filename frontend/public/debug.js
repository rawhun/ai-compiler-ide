// Debug script to catch and log runtime errors
window.addEventListener('error', function(event) {
  console.error('Runtime Error Details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error ? event.error.stack : 'No stack trace available'
  });
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

console.log('Debug script loaded - runtime errors will be logged with details');