// Central password rules for frontend validation and display
export const rules = [
  {
    key: 'minLength',
    label: 'At least 8 characters',
    test: (pw) => typeof pw === 'string' && pw.length >= 8,
  },
  {
    key: 'lowercase',
    label: 'At least one lowercase letter',
    test: (pw) => /[a-z]/.test(pw || ''),
  },
  {
    key: 'uppercase',
    label: 'At least one uppercase letter',
    test: (pw) => /[A-Z]/.test(pw || ''),
  },
  {
    key: 'digit',
    label: 'At least one digit',
    test: (pw) => /[0-9]/.test(pw || ''),
  },
  {
    key: 'special',
    label: 'At least one special character (e.g. !@#$%)',
    test: (pw) => /[!@#\$%\^&\*\(\)_+\-=[\]{};':"\\|,.<>\/?]/.test(pw || ''),
  },
]

export function validate(pw) {
  const unmet = []
  for (const r of rules) {
    if (!r.test(pw)) unmet.push(r.key)
  }
  return { valid: unmet.length === 0, unmet }
}
