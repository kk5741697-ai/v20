import { NextResponse } from 'next/server'

export async function GET() {
  const securityTxt = `Contact: mailto:security@pixoratools.com
Contact: https://pixoratools.com/contact
Expires: 2025-12-31T23:59:59.000Z
Encryption: https://pixoratools.com/pgp-key.txt
Acknowledgments: https://pixoratools.com/security/acknowledgments
Policy: https://pixoratools.com/security/policy
Hiring: https://pixoratools.com/careers

# Security Policy
# We take security seriously and appreciate responsible disclosure.
# Please report security vulnerabilities to security@pixoratools.com

# Scope
# This security.txt applies to:
# - https://pixoratools.com
# - https://pixorapdf.com  
# - https://pixoraimg.com
# - https://pixoraqrcode.com
# - https://pixoracode.com
# - https://pixoraseo.com

# Out of Scope
# - Third-party services and integrations
# - Social engineering attacks
# - Physical security issues
# - Denial of service attacks

# Response Time
# We aim to respond to security reports within 48 hours
# and provide updates every 72 hours until resolution.`

  return new NextResponse(securityTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}