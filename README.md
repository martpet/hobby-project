# Hobproj

A lightweight web application showcasing passkey authentication (WebAuthn).\
Built without a heavy framework or single-page application (SPA) architecture.

## Quick Start

1. **Install Deno:**
   ```sh
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Configure environment:**
   ```sh
   cp .env.example .env
   ```
3. **Install Git hooks:**
   ```sh
   deno task install-hooks
   ```

4. **Install VS Code Extensions (optional):**

   Open the project in VS Code and accept the prompt to install the recommended
   extensions listed in `.vscode/extensions.json`.

5. **Run the development server:**
   ```sh
   deno task dev
   ```
