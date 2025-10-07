# Go Playground MCP Server

A Model Context Protocol (MCP) server that integrates with the Go Playground API to execute Go code and generate shareable URLs.

[![tag](https://img.shields.io/github/tag/samber/go-playground-mcp.svg)](https://github.com/samber/go-playground-mcp/releases)
![Build Status](https://github.com/samber/go-playground-mcp/actions/workflows/test.yml/badge.svg)
[![Coverage](https://img.shields.io/codecov/c/github/samber/go-playground-mcp)](https://codecov.io/gh/samber/go-playground-mcp)
[![npm](https://img.shields.io/badge/npm-go--playground--mcp-red?logo=npm)](https://www.npmjs.com/package/go-playground-mcp)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🧙 Features

- **Run Go Code**: Execute Go code in the Go Playground sandbox
- **Share Code**: Generate shareable URLs for Go code snippets
- **Run and Share**: Execute code and get both results and share URL in one operation
- **Read from URL**: Read Go code from existing Go Playground URLs
- **Execute from URL**: Execute Go code from existing Go Playground URLs
- **MCP Integration**: Full Model Context Protocol compliance

## 🏃‍♂️ Usage

The server can be used with any MCP-compatible client. The server provides five tools:

1. **`run_go_code`** - Execute Go code and return results
2. **`share_go_code`** - Share Go code and get a URL
3. **`run_and_share_go_code`** - Execute code and get both results and share URL
4. **`read_go_playground_url`** - Read Go code from an existing Go Playground URL
5. **`execute_go_playground_url`** - Execute Go code from an existing Go Playground URL

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "go-playground": {
      "command": "npx",
      "args": ["-y", "go-playground-mcp"]
    }
  }
}
```

### Examples

#### Reading code from a Go Playground URL

```typescript
// Read code from https://go.dev/play/xyz123
const result = await mcpClient.callTool("read_go_playground_url", {
  url: "https://go.dev/play/xyz123"
});
```

#### Executing code from a Go Playground URL

```typescript
// Execute code from https://go.dev/play/xyz123
const result = await mcpClient.callTool("execute_go_playground_url", {
  url: "https://go.dev/play/xyz123",
  withVet: true
});
```

#### URL Formats Supported

The new URL-based tools support these Go Playground URL formats:

- `https://go.dev/play/<snippet-id>`
- `https://go.dev/play/p/<snippet-id>`
- `https://play.golang.org/p/<snippet-id>`

## 🤝 Contributing

- Ping me on Twitter [@samuelberthe](https://twitter.com/samuelberthe) (DMs, mentions, whatever :))
- Fork the [project](https://github.com/samber/go-playground-mcp)
- Fix [open issues](https://github.com/samber/go-playground-mcp/issues) or request new features

Don't hesitate ;)

### Install

1. Clone this repository:
```bash
git clone https://github.com/samber/go-playground-mcp.git
cd go-playground-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "go-playground": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## 👤 Contributors

![Contributors](https://contrib.rocks/image?repo=samber/go-playground-mcp)

## 💫 Show your support

Give a ⭐️ if this project helped you!

[![GitHub Sponsors](https://img.shields.io/github/sponsors/samber?style=for-the-badge)](https://github.com/sponsors/samber)

## 📝 License

Copyright © 2025 [Samuel Berthe](https://github.com/samber).

This project is [MIT](./LICENSE) licensed.
