## Environment Variables

Create a `.env` file (not committed) using `.env.example` as a template. Do not commit real secrets.

See `.env.example` for the full list of keys. The important ones are:

- `SLACK_WEBHOOK_URL`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` (either a single-line JSON or a filesystem path to a JSON file that is not committed)

# Grain-Slack MCP

This project is a TypeScript-based application that integrates with Google Sheets and Slack, utilizing Google's Generative AI. It appears to be a backend service that can be extended to perform various tasks based on data from Google Sheets and interactions within Slack.

## Features

- **Express Server**: A simple server setup using Express.
- **Google Sheets Integration**: Includes tools to interact with Google Sheets API.
- **Slack Integration**: Contains modules for interacting with the Slack API.
- **Gemini AI**: Leverages Google's Gemini for generative AI capabilities.
- **TypeScript**: The entire codebase is in TypeScript, providing type safety.

## Prerequisites

- Node.js
- npm (or yarn)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/RO0ger/G_Sheet-MCP.git
    cd G_Sheet-MCP
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Copy the example environment file and fill in your credentials.
    ```bash
    cp .env.example .env
    ```
    Now, open the `.env` file and add your secret credentials.

4.  **Claude Desktop (optional):**
    Use `claude_desktop_config.example.json` as a template. Do not commit your real `claude_desktop_config.json` since it can contain secrets and absolute paths.

5.  **Build the project:**
    ```bash
    npm run build
    ```

6.  **Run the server:**
    ```bash
    npm start
    ```

## Available Scripts

-   `npm run clean`: Removes the `dist` directory.
-   `npm run build`: Compiles the TypeScript code and copies necessary assets to the `dist` directory.
-   `npm run start`: Starts the server from the `dist` directory.
-   `npm run dev`: Builds and starts the server in one command.
-   `npm test`: (Not yet implemented)
