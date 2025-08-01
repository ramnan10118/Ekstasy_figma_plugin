# Figma Grammar Checker Plugin (Ekstasy)

A lightning-fast grammar and text checker plugin for Figma that helps you find and fix grammar, spelling, and style issues in your designs.

## Features

- ⚡ **Lightning Fast**: Uses LanguageTool API for near-instant grammar checking
- 🔍 **Smart Detection**: Finds grammar, spelling, and style problems with high accuracy
- 🚀 **Bulk Operations**: Fix multiple issues at once with one click
- 🎯 **Layer Navigation**: Jump directly to problematic text layers
- 📊 **Organized View**: Group issues by layer or by text
- 🎨 **Figma-Native UI**: Clean interface that matches Figma's design
- 💰 **Cost-Effective**: Uses free LanguageTool API (no expensive AI costs)

## Setup

### For Team Members (Using Pre-built Plugin)
See [DEPLOYMENT.md](./DEPLOYMENT.md) for simple installation instructions.

### For Developers/Team Admins

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build the Plugin**:
   ```bash
   npm run build
   ```
   *No API key configuration needed - LanguageTool public API is free!*

3. **Load in Figma**:
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
2. **LanguageTool Analysis**: Sends text to LanguageTool API for grammar/spell checking
3. **Smart Suggestions**: Provides accurate corrections and improvements
4. **Non-Destructive**: All changes can be undone using Figma's history
5. **Fast Processing**: Handles individual texts quickly (no batching needed!)

## Architecture

- **Frontend**: React + TypeScript with Zustand state management
- **Grammar Service**: LanguageTool API integration with fetch
- **Build Tool**: Webpack with TypeScript compilation
- **Styling**: CSS with Figma design system patterns

## API Usage

The plugin uses LanguageTool's free public API to analyze text. No API key configuration is required! For team deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

Built with ❤️ using React, TypeScript, and LanguageTool
