# Prompt Enhancer Chrome Extension

A powerful Chrome extension that enhances your AI prompting experience on Claude.ai (with more platforms coming soon). Get better results from AI by improving, expanding, and customizing your prompts with one click.

## 🌟 Features

### Quick Actions
- **✨ Improve**: Make prompts clearer, more specific, and more effective
- **📝 Expand**: Add more detail and context to your prompts
- **📋 Summarize**: Create concise versions of your text
- **🌐 Translate**: Prepare text for translation
- **🔍 Analyze**: Set up analytical prompts
- **🎨 Creative**: Transform text with creative flair

### Preset Styles
- **Professional**: Formal and business-appropriate tone
- **Casual**: Friendly and conversational style
- **Technical**: Precise and detailed technical language
- **Beginner-friendly**: Simple, easy-to-understand explanations

### Custom Enhancement
- Write your own custom instructions
- Apply personalized prompt modifications
- Save time with reusable enhancements

### Smart Features
- **Keyboard Shortcuts**: `Ctrl/Cmd + Shift + E` to toggle
- **Usage Statistics**: Track your enhancement patterns
- **Settings Sync**: Your preferences sync across devices
- **Non-intrusive**: Seamlessly integrates with Claude's interface

## 🚀 Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Prompt Enhancer"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your toolbar

## 📖 How to Use

### Getting Started
1. Navigate to [Claude.ai](https://claude.ai)
2. Look for the prompt enhancer button (three horizontal lines icon) next to the input controls
3. Click to open the enhancement panel

### Using Quick Actions
1. Type your prompt in Claude's input field
2. Click the enhancer button to open the panel
3. Choose any quick action (Improve, Expand, etc.)
4. Your prompt will be automatically enhanced
5. Review and send your improved prompt

### Custom Enhancement
1. Open the enhancer panel
2. Type your custom instruction in the text area
3. Examples:
   - "Make this more professional"
   - "Add technical details"
   - "Simplify for beginners"
   - "Add specific examples"
4. Click "Apply" to enhance your prompt

### Preset Styles
1. Open the enhancer panel
2. Click any preset style button
3. Your prompt will be rewritten in that style

## ⚙️ Settings

Access settings by clicking the extension icon in your Chrome toolbar.

### Available Options
- **Enable Extension**: Turn the enhancer on/off
- **Keyboard Shortcuts**: Enable/disable hotkeys
- **Show Notifications**: Control success/error messages

### Export/Import Settings
- Export your settings and stats as JSON
- Reset to defaults if needed
- Settings automatically sync across Chrome instances

## 🎯 Supported Platforms

### Currently Supported
- ✅ **Claude.ai** - Full feature support

### Coming Soon
- 🚀 **ChatGPT** - In development
- 💎 **Google Gemini** - Planned
- 🔮 **Other AI platforms** - Based on user requests

## 🛠️ Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension standards
- **Content Scripts**: Non-intrusive DOM injection
- **Storage API**: Settings and stats persistence
- **Modular Design**: Easy to extend for new platforms

### File Structure
```
prompt-dir-ext/
├── manifest.json              # Extension configuration
├── src/
│   ├── content/
│   │   └── claude-enhancer.js # Main content script
│   ├── popup/
│   │   ├── popup.html         # Settings interface
│   │   ├── popup.css          # Popup styling
│   │   └── popup.js           # Popup functionality
│   └── styles/
│       └── claude-enhancer.css # Content script styling
├── assets/
│   └── icons/                 # Extension icons
└── README.md
```

### Permissions
- `activeTab`: Access current tab for injection
- `storage`: Save settings and statistics
- `host_permissions`: Access to Claude.ai

## 🔧 Development

### Prerequisites
- Node.js (for development tools)
- Chrome browser
- Basic knowledge of JavaScript/HTML/CSS

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd prompt-enhancer-extension

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the project folder
```

### Testing
1. Load the extension in developer mode
2. Navigate to Claude.ai
3. Test all enhancement features
4. Check console for any errors
5. Verify settings persist correctly

### Adding New Platforms
1. Create new content script in `src/content/`
2. Add platform-specific selectors
3. Update manifest.json with new host permissions
4. Add platform detection in popup

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Bug Reports
1. Check existing issues first
2. Provide detailed reproduction steps
3. Include browser version and extension version
4. Add screenshots if relevant

### Feature Requests
1. Describe the feature clearly
2. Explain the use case
3. Consider implementation complexity
4. Check if it fits the extension's scope

### Code Contributions
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 Changelog

### Version 1.0.0 (Initial Release)
- ✨ Quick action buttons for common enhancements
- 🎨 Preset style transformations
- ✏️ Custom enhancement instructions
- ⚙️ Settings panel with preferences
- 📊 Usage statistics tracking
- ⌨️ Keyboard shortcuts
- 🎯 Claude.ai integration

## 🔒 Privacy

- **No Data Collection**: We don't collect or store your prompts
- **Local Storage**: Settings stored locally in your browser
- **No Tracking**: No analytics or user tracking
- **Open Source**: Code available for review

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Extension not appearing on Claude.ai**
- Refresh the page after installing
- Check if developer mode is enabled
- Verify the extension is enabled in chrome://extensions/

**Button not responding**
- Make sure you've entered text in the input field first
- Check browser console for JavaScript errors
- Try disabling other extensions that might conflict

**Settings not saving**
- Ensure you have storage permissions
- Check if Chrome sync is working
- Try exporting/importing settings manually

### Getting Help
- Create an issue on GitHub
- Check the FAQ section
- Review existing issues for solutions

## 🌟 Star History

If you find this extension helpful, please consider giving it a star on GitHub!

## 🚀 Roadmap

### Short Term
- [ ] ChatGPT support
- [ ] Additional quick actions
- [ ] Import/export custom templates
- [ ] Dark/light theme toggle

### Long Term
- [ ] AI-powered enhancement suggestions
- [ ] Team collaboration features
- [ ] Integration with more AI platforms
- [ ] Mobile app companion

---

**Made with ❤️ for better AI prompting**

*Have suggestions or found a bug? We'd love to hear from you!* 