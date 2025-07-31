# Figma Grammar Checker Plugin (Ekstasy)

An AI-powered grammar and text checker plugin for Figma that helps you find and fix grammar, spelling, and style issues in your designs.

## Features

- 🤖 **AI-Powered Analysis**: Uses OpenAI's GPT-4 to analyze text for issues
- 🔍 **Smart Detection**: Finds grammar, spelling, and style problems
- ⚡ **Bulk Operations**: Fix multiple issues at once with one click
- 🎯 **Layer Navigation**: Jump directly to problematic text layers
- 📊 **Organized View**: Group issues by layer or by text
- 🎨 **Figma-Native UI**: Clean interface that matches Figma's design

## Setup

### For Team Members (Using Pre-built Plugin)
See [DEPLOYMENT.md](./DEPLOYMENT.md) for simple installation instructions.

### For Developers/Team Admins

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure API Key**:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your OpenAI API key to .env
   OPENAI_API_KEY=sk-your-api-key-here
   ```

3. **Build the Plugin**:
   ```bash
   npm run build
   ```

4. **Load in Figma**:
   - Open Figma Desktop
   - Go to Plugins → Development → Import plugin from manifest
   - Select the `manifest.json` file in this directory

## Usage

1. **Open the Plugin**: 
   - In Figma, go to Plugins → Grammar Checker
   
2. **Automatic Scanning**: 
   - Plugin immediately scans all text layers (no setup required!)
   - View issues organized by layer or text
   
3. **Review & Fix**:
   - Review each suggestion
   - Click "Apply Fix" for individual issues
   - Use "Auto fix all" for bulk corrections
   - Jump to layers with the "jump to layer" link

## Development

- **Watch Mode**: `npm run dev` - Rebuilds on file changes
- **Build**: `npm run build` - Production build

## How It Works

1. **Text Extraction**: Scans all text layers in the current Figma page
2. **AI Analysis**: Sends text to OpenAI GPT-4 for grammar/spell checking
3. **Smart Suggestions**: Provides contextual corrections and improvements
4. **Non-Destructive**: All changes can be undone using Figma's history
5. **Bulk Processing**: Handles multiple corrections efficiently

## Architecture

- **Frontend**: React + TypeScript with Zustand state management
- **AI Integration**: Direct OpenAI API calls with fetch
- **Build Tool**: Webpack with TypeScript compilation
- **Styling**: CSS with Figma design system patterns

## API Usage

The plugin uses OpenAI's API to analyze text. The API key is embedded during the build process for seamless team usage. For team deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

Built with ❤️ using React, TypeScript, and OpenAI GPT-4o-mini
