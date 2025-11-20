// Simple password validation helper
// Returns { valid: boolean, errors: string[] }
function validatePassword(pw, options = {}) {
  const minLen = options.minLen || 8;
  const maxLen = options.maxLen || 128;
  const errors = [];

  if (!pw || typeof pw !== 'string') {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  if (pw.length < minLen) errors.push(`At least ${minLen} characters`);
  if (pw.length > maxLen) errors.push(`No more than ${maxLen} characters`);
  if (!/[a-z]/.test(pw)) errors.push('At least one lowercase letter');
  if (!/[A-Z]/.test(pw)) errors.push('At least one uppercase letter');
  if (!/[0-9]/.test(pw)) errors.push('At least one digit');
  if (!/[!@#\$%\^&\*\(\)_+\-=[\]{};':"\\|,.<>\/?]/.test(pw)) errors.push('At least one special character (e.g. !@#$%)');

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePassword };
