# Team Deployment Guide

## Quick Setup for Team Members

### 1. Get the Plugin Files
Download the built plugin files from your team's shared location:
- `manifest.json`
- `dist/` folder (contains `code.js`, `ui.js`, `ui.html`)

### 2. Install in Figma
1. Open Figma Desktop App
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Select the `manifest.json` file
4. Plugin will appear in your Plugins menu as "Grammar Checker"

### 3. Use the Plugin
1. Open any Figma file with text layers
2. Go to **Plugins** → **Grammar Checker**
3. Plugin opens and immediately starts scanning text - no setup required!

---

## For Team Admin: Building & Distributing

### Initial Setup
1. **Get OpenAI API Key**:
   - Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Create new API key for your organization
   - Copy the key (starts with `sk-`)

2. **Configure Environment**:
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env and add your API key
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

### Building for Distribution
```bash
# Production build with embedded API key
npm run build
```

This creates the `dist/` folder with your API key embedded securely.

### Distribution Options

**Option 1: Shared Drive**
- Upload `manifest.json` and `dist/` folder to team shared drive
- Share link with team members

**Option 2: Internal Git Repository**
- Create private repository for your team
- Push built files (add `dist/` to git if needed)
- Team members clone and import

**Option 3: Direct File Sharing**
- Zip the plugin files: `manifest.json` + `dist/`
- Share via email/Slack to team members

### Updates & Maintenance

**To Update the Plugin**:
1. Make code changes
2. Run `npm run build` 
3. Re-distribute the updated files
4. Team members re-import in Figma (overwrites existing)

**Cost Monitoring**:
- Monitor OpenAI API usage at [platform.openai.com/usage](https://platform.openai.com/usage)
- Set up billing alerts in OpenAI dashboard
- Each text analysis costs ~$0.001-0.01 depending on text length

---

## Security Notes

- ✅ **Safe for Internal Teams**: API key is embedded in compiled code
- ⚠️ **Don't Share Publicly**: Anyone with plugin files can extract the API key
- 🔒 **Rotate Keys**: Consider rotating API key periodically
- 📊 **Monitor Usage**: Keep an eye on API costs and usage patterns

---

## Troubleshooting

**Plugin doesn't appear after import**:
- Make sure you're using Figma Desktop (not web)
- Check that `manifest.json` and `dist/` folder are in same directory

**"OpenAI API key not configured" error**:
- Plugin wasn't built with API key embedded
- Contact team admin to rebuild with proper .env configuration

**Network/permissions errors**:
- Make sure you're using the latest version of the plugin files
- The plugin requires network access to OpenAI's API

**No text found**:
- Make sure you have text layers in your Figma file
- Plugin only scans the current page

**API quota exceeded**:
- Team has hit OpenAI API limits
- Contact team admin to check billing/upgrade plan

---

## Development Commands

```bash
npm run dev          # Development build with watch mode
npm run build        # Production build with embedded API key
```