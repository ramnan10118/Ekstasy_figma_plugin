# Figma Grammar Checker Plugin (Ekstasy)

An AI-powered grammar and text checker plugin for Figma that helps you find and fix grammar, spelling, and style issues in your designs.

## Features

- 🤖 **AI-Powered**: Uses OpenAI's GPT models for intelligent grammar checking
- 🔍 **Smart Detection**: Finds grammar, spelling, and style problems with high accuracy
- 🚀 **Bulk Operations**: Fix multiple issues at once with one click
- 🎯 **Layer Navigation**: Jump directly to problematic text layers
- 📊 **Organized View**: Group issues by layer or by text
- 🎨 **Figma-Native UI**: Clean interface that matches Figma's design
- 🎯 **Focused Analysis**: Only flags real grammar and spelling errors, not style preferences

## Setup

### For Team Members (Using Pre-built Plugin)
See [DEPLOYMENT.md](./DEPLOYMENT.md) for simple installation instructions.

### For Developers/Team Admins

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure OpenAI API Key**:
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
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
2. **AI Analysis**: Sends text to OpenAI's GPT models for intelligent grammar/spell checking
3. **Smart Suggestions**: Provides accurate corrections and improvements
4. **Non-Destructive**: All changes can be undone using Figma's history
5. **Batch Processing**: Efficiently processes multiple text layers simultaneously

## Architecture

- **Frontend**: React + TypeScript with Zustand state management
- **AI Service**: OpenAI GPT API integration for grammar analysis
- **Build Tool**: Webpack with TypeScript compilation
- **Styling**: CSS with Figma design system patterns

## API Usage

The plugin uses OpenAI's GPT models to analyze text for grammar and spelling errors. You'll need an OpenAI API key for usage. For team deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

Built with ❤️ using React, TypeScript, and OpenAI
