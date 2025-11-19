# Healthcare Management System with Advanced Security

A secure, HIPAA-compliant healthcare management system featuring advanced bot detection, honeypot networks, and comprehensive audit logging.

## 🛡️ Security Features

This project implements defense-in-depth security measures:

-   **Advanced Honeypot Network**:
    -   Decoy API endpoints (`/api/admin/*`, `/api/auth/*`) to trap bots.
    -   Fake stack traces and "leaked" internal paths to confuse attackers.
    -   Payload inspection to detect SQLi, XSS, and RCE attempts.
    -   Aggressive tarpitting (delays) for malicious requests.
-   **Bot Detection**: Behavioral analysis (mouse movements, typing speed) to distinguish humans from bots.
-   **Security Headers**: Strict CSP, HSTS, and anti-sniffing headers.
-   **Audit Logging**: detailed logs of all security-relevant events.

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+
-   npm or pnpm

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env.local
    ```
4.  Enable the Honeypot (optional):
    Add `ENABLE_HONEYPOT=true` to your `.env.local` file.

### Running the Project

```bash
npm run dev
```

## 🧪 Security Testing

You can verify the security features using the included tools:

-   **Trigger a Honeypot**: Visit `/api/admin/config` to see the decoy response (and potential fake stack trace).
-   **Run Security Audit**: `npm run audit`

## 📂 Project Structure

-   `app/`: Next.js application routes.
-   `lib/`: Core logic, including `honeypot-network.ts` and `security-monitor.ts`.
-   `components/`: React components.
-   `security-logs/`: Storage for detected threats and honeypot triggers.
-   `_docs_archive/`: Archived documentation and setup scripts.

## 🔒 Security Policy

Please refer to [SECURITY.md](SECURITY.md) for our vulnerability disclosure policy and supported versions.

