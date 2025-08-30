## Environment Variables

Create a `.env` file (not committed) using `.env.example` as a template. Do not commit real secrets.

See `.env.example` for the full list of keys. The important ones are:

- `SLACK_WEBHOOK_URL`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` (either a single-line JSON or a filesystem path to a JSON file that is not committed)

# G-Sheet Slack MCP Server

## Project Overview
This project is an **MCP (Model Context Protocol) server** designed to integrate Google Sheets and Slack, enabling powerful AI-driven automation and analysis workflows. It serves as a refactor from a low-level `Server` class to a high-level `McpServer` class, addressing issues with disabled tools in Claude Desktop and adopting proper tool registration patterns.

Our primary goal is to provide a robust and extensible platform for: 
- Loading and analyzing hypotheses from Google Sheets.
- Updating Google Sheets with analysis results.
- Sending notifications to Slack channels.

This server leverages the `@modelcontextprotocol/sdk` to expose its functionalities as discoverable tools for compatible MCP clients, such as Claude Desktop.

## Features
- **Google Sheets Integration**: Seamlessly load and update data from specified Google Sheets.
- **Slack Integration**: Send rich notifications to Slack channels based on analysis results or other triggers.
- **Hypothesis Management**: Tools for loading, analyzing, and updating business hypotheses stored in Google Sheets.
- **AI-Powered Analysis**: Designed to work with LLMs (e.g., Claude) via MCP for tasks like hypothesis enrichment and scoring.
- **Tool-Based Architecture**: Implements the latest MCP guidelines for robust and discoverable tools.
- **ESM Compatibility**: Uses modern JavaScript modules (`.js` extensions) for better compatibility and performance.

## Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
- Node.js (v18 or higher recommended)
- npm (Node Package Manager)
- Google Cloud Project with Google Sheets API enabled and credentials downloaded.
- Slack App with necessary permissions and a Bot Token.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/G-Sheet-MCP.git
   cd G-Sheet-MCP
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Configuration

1. **Google Sheets API Credentials:**
   - Follow the Google Cloud documentation to create a service account and enable the Google Sheets API.
   - Download your service account key file (usually `service-account.json`).
   - Place this file in the root of the `G_Sheet-MCP` directory or configure the path in `src/config/index.ts`.

2. **Slack Bot Token:**
   - Create a Slack App, add a bot, and grant it the necessary permissions (e.g., `chat:write`, `channels:read`).
   - Obtain your Bot User OAuth Token (starts with `xoxb-`).
   - Set this as an environment variable or configure it in `src/config/index.ts`.

3. **MCP Configuration (`claude_desktop_config.json`):**
   - Copy `claude_desktop_config.example.json` to `claude_desktop_config.json`.
   - Update the `path` in `claude_desktop_config.json` to the absolute path of your `server.ts` file:
     ```json
     {
       "mcp_servers": [
         {
           "path": "/Users/your-username/Work/Gsheet_Slack_Mcp/G_Sheet-MCP/dist/server.js"
         }
       ]
     }
     ```
   - **Important**: The `path` should point to the compiled `server.js` file in the `dist` directory.

### Running the Server

1. **Compile the TypeScript code:**
   ```bash
   npm run build
   ```

2. **Start the MCP Server:**
   ```bash
   npm start
   ```
   The server will start and listen for MCP client connections, typically via standard I/O (stdio).

3. **Integrate with Claude Desktop (or other MCP Clients):**
   - Ensure Claude Desktop is configured to load MCP servers from your `claude_desktop_config.json`.
   - Restart Claude Desktop to pick up the changes. You should see the registered tools available.

## Available Tools
This MCP server registers the following tools, which can be invoked by an MCP client:

- **`load_hypotheses`**:
  - **Description**: Loads hypotheses from a specified Google Sheet.
  - **Input**: Sheet ID, Range.
  - **Output**: JSON array of hypotheses.

- **`analyze_hypothesis`**:
  - **Description**: Analyzes a given hypothesis using an internal LLM (via MCP sampling) for enrichment or scoring.
  - **Input**: Hypothesis text, Analysis type (e.g., 'enrichment', 'scoring').
  - **Output**: JSON object with analysis results.

- **`update_hypotheses`**:
  - **Description**: Updates a Google Sheet with new or modified hypothesis data.
  - **Input**: Sheet ID, Range, Data to update.
  - **Output**: Confirmation of update.

- **`slack_notification`**:
  - **Description**: Sends a message to a specified Slack channel.
  - **Input**: Channel ID, Message text.
  - **Output**: Confirmation of message sent.

## Usage Examples

### Example: Loading Hypotheses from Google Sheets
An MCP client (e.g., Claude Desktop) could invoke this tool like:
```json
{
  "tool_name": "load_hypotheses",
  "parameters": {
    "sheetId": "YOUR_GOOGLE_SHEET_ID",
    "range": "Sheet1!A1:D10"
  }
}
```

### Example: Sending a Slack Notification
```json
{
  "tool_name": "slack_notification",
  "parameters": {
    "channelId": "YOUR_SLACK_CHANNEL_ID",
    "message": "A new set of hypotheses has been loaded for review."
  }
}
```

## Development Workflow

1. **Consult MCP Documentation**: Always refer to the [official MCP documentation](https://modelcontextprotocol.io/) for the latest specifications and best practices.
2. **Incremental Development**: Build and test tools individually.
3. **Debugging**: Use MCP inspector tools if available for debugging tool registration and invocation.
4. **Testing**: Validate end-to-end functionality within your chosen MCP client (e.g., Claude Desktop).

## Troubleshooting
- **Tools not appearing in Claude Desktop**: 
  - Ensure `claude_desktop_config.json` points to the correct absolute path of `dist/server.js`.
  - Restart Claude Desktop after any configuration changes.
  - Verify that the server is running without errors (`npm start`).
- **Google Sheets API errors**: 
  - Check if the `service-account.json` file is correctly placed and has the right permissions.
  - Ensure the Google Sheets API is enabled in your Google Cloud Project.
- **Slack notification issues**: 
  - Verify your Slack Bot Token is correct and has the necessary permissions.
  - Check the channel ID.
- **MCP Server startup issues**: 
  - Review terminal output for any errors during `npm install`, `npm run build`, or `npm start`.
  - Ensure Node.js version compatibility.

## Contributing
Contributions are welcome! Please feel free to open issues or submit pull requests.

## License
This project is licensed under the MIT License - see the `LICENSE` file for details. (Note: A `LICENSE` file should be created if not already present.)
