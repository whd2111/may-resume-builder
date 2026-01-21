# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Problem: `npm install` fails
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try with legacy peer deps
npm install --legacy-peer-deps
```

#### Problem: Wrong Node version
```
error: This package requires Node.js version 16 or higher
```

**Solution:**
```bash
# Check your Node version
node --version

# If below v16, update Node:
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
```

---

### API Key Issues

#### Problem: "Invalid API key" error

**Possible Causes:**
1. API key is incorrect
2. API key doesn't have credits
3. API key was revoked
4. Copy-paste added extra spaces

**Solutions:**
```bash
# 1. Verify your API key
# Go to https://console.anthropic.com/
# Check "API Keys" section
# Copy the key carefully (no spaces!)

# 2. Check your credits
# In Anthropic console, look for "Usage" or "Billing"
# Make sure you have credits available

# 3. Try creating a new API key
# Delete old key, generate new one
```

**How to properly enter API key:**
1. Copy from console (Ctrl+C / Cmd+C)
2. Paste into May (Ctrl+V / Cmd+V)
3. Check for NO spaces before/after
4. Should start with `sk-ant-`

#### Problem: API key not persisting

**Cause:** localStorage is disabled or cleared

**Solution:**
```javascript
// Test localStorage in browser console:
localStorage.setItem('test', 'value')
localStorage.getItem('test') // Should return 'value'

// If this fails, check:
// - Browser settings → Privacy → Allow localStorage
// - Not in Private/Incognito mode
// - Browser extensions not blocking
```

---

### Chat/Conversation Issues

#### Problem: May stops responding mid-conversation

**Possible Causes:**
1. API rate limit hit
2. Network connection lost
3. Token limit exceeded
4. Browser error

**Solutions:**
1. Check browser console (F12) for errors
2. Wait 30 seconds and try again
3. Refresh page (resume will be saved if completed)
4. Check internet connection

#### Problem: May's responses are cut off

**Cause:** Token limit reached

**Solution:**
- Currently set to 4096 tokens (plenty for resumes)
- If consistently hitting limit, May is being too verbose
- You can increase in `src/utils/claudeApi.js`:
```javascript
max_tokens: 8192 // Doubled
```

#### Problem: May asks repetitive questions

**Cause:** Conversation history not being tracked properly

**Solution:**
Check `Stage1Chatbot.jsx` - ensure messages array includes full history:
```javascript
const conversationHistory = [
  ...messages.map(m => ({ role: m.role, content: m.content })),
  { role: 'user', content: userMessage }
]
```

---

### Resume Generation Issues

#### Problem: Resume won't generate / stuck on "Generating..."

**Possible Causes:**
1. Claude didn't return valid JSON
2. JSON parsing failed
3. API call failed silently

**Debug Steps:**
```javascript
// Add to Stage1Chatbot.jsx after API call:
console.log('Claude response:', response)

// Check if JSON is present:
const jsonMatch = response.match(/\{[\s\S]*"action":\s*"generate_resume"[\s\S]*\}/)
console.log('JSON match:', jsonMatch)

// Try parsing:
try {
  const data = JSON.parse(jsonMatch[0])
  console.log('Parsed data:', data)
} catch (error) {
  console.error('Parse error:', error)
}
```

**Solution:**
- If Claude is chatting but not generating, say: "Please generate my resume now"
- If JSON is malformed, this is a prompt issue - May needs clearer structure examples

#### Problem: Generated resume is missing sections

**Cause:** Data not captured properly during conversation

**Solution:**
1. Check localStorage: `localStorage.getItem('may_master_resume')`
2. Verify all required fields exist
3. If missing, click "Edit Master Resume" to add them

---

### DOCX Export Issues

#### Problem: Download button doesn't work

**Possible Causes:**
1. Browser blocking downloads
2. File-saver library issue
3. Document generation failed

**Debug:**
```javascript
// Add to docxGenerator.js before saveAs():
console.log('Generating blob...')
const blob = await Packer.toBlob(doc)
console.log('Blob size:', blob.size)
console.log('Saving as:', filename)
saveAs(blob, filename)
```

**Solutions:**
- Check browser console for errors
- Allow downloads in browser settings
- Try different browser (Chrome, Firefox)
- Check if file-saver is installed: `npm list file-saver`

#### Problem: DOCX file won't open

**Error message:** "File is corrupted" or "Cannot open file"

**Cause:** Invalid docx structure

**Debug:**
1. Unzip the .docx file (it's a zip archive)
2. Check `word/document.xml` for XML errors
3. Validate XML structure

**Quick fix:**
```bash
# Try opening in LibreOffice or Google Docs first
# They're more forgiving than Microsoft Word

# If it opens there, save and re-export
```

#### Problem: DOCX formatting looks wrong

**Common issues:**
- Bullets not showing → Check numbering config
- Text size wrong → Verify size values (size: 22 = 11pt)
- Page size wrong → Check width/height in DXA units
- Margins off → Verify margin calculations

**Fix template in `src/utils/docxGenerator.js`:**
```javascript
// US Letter dimensions
page: {
  size: {
    width: 12240,   // 8.5 inches
    height: 15840   // 11 inches
  },
  margin: {
    top: 720,    // 0.5 inch
    right: 720,
    bottom: 720,
    left: 720
  }
}
```

---

### Job Tailoring Issues

#### Problem: Tailoring changes nothing / minimal changes

**Cause:** Job description too vague or resume already optimized

**Solutions:**
1. Provide fuller job description (include requirements, skills, responsibilities)
2. Try a very different job type to see dramatic tailoring
3. Check that master resume has variety to pull from

#### Problem: Tailored resume fabricates experience

**This should NEVER happen!**

**If it does:**
1. Report this immediately - it's a serious prompt issue
2. Check the system prompt in `Stage2Tailor.jsx`
3. Add emphasis:
```javascript
CRITICAL RULE: NEVER fabricate or invent experience. ONLY reframe existing accomplishments from the master resume. If the resume lacks relevant experience, be honest about it.
```

#### Problem: Tailoring takes too long (>15 seconds)

**Cause:** Large resume + long job description

**Solutions:**
- Simplify master resume (remove less relevant roles)
- Shorten job description (paste only key sections)
- Increase timeout if needed

---

### Data Persistence Issues

#### Problem: Resume lost after browser refresh

**Causes:**
1. localStorage not working
2. Different browser/profile
3. localStorage cleared
4. Incognito/Private mode

**Solutions:**
- Check: `localStorage.getItem('may_master_resume')`
- Don't use Incognito mode
- Export resume JSON manually as backup:
```javascript
// In browser console:
const resume = JSON.parse(localStorage.getItem('may_master_resume'))
console.log(JSON.stringify(resume, null, 2))
// Copy and save to file
```

#### Problem: Can't clear old resume data

**Solution:**
```javascript
// Browser console:
localStorage.removeItem('may_master_resume')
localStorage.removeItem('may_api_key')
location.reload()
```

---

### Performance Issues

#### Problem: App is slow/laggy

**Common causes:**
1. Too many messages in chat history
2. Large localStorage data
3. Browser extensions interfering
4. Low device resources

**Solutions:**
```javascript
// Clear old chat messages after generation
// In Stage1Chatbot.jsx, after resume generates:
setMessages([
  { role: 'assistant', content: 'Resume generated! Moving to Stage 2...' }
])
```

#### Problem: Build is huge (>5MB)

**Cause:** Unoptimized build

**Solution:**
```bash
# Analyze bundle
npm install --save-dev rollup-plugin-visualizer
# Add to vite.config.js:
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [react(), visualizer()],
})

# Build and check stats.html
npm run build
```

---

### Browser Compatibility Issues

#### Problem: App doesn't work in Safari

**Common Safari issues:**
1. LocalStorage in private mode
2. Older webkit version
3. Cross-origin restrictions

**Solutions:**
- Update Safari to latest version
- Check Console (Cmd+Option+C) for errors
- Try in Chrome/Firefox first

#### Problem: Mobile browser issues

**Known limitations:**
- DOCX download on iOS can be tricky
- Small screen makes chat hard to read
- Virtual keyboard covers input

**Solutions:**
- Use desktop browser for best experience
- On mobile, rotate to landscape
- Use "share" to save DOCX on iOS

---

### Development Issues

#### Problem: Hot reload not working

**Solution:**
```bash
# Restart dev server
# Press Ctrl+C to stop
npm run dev

# If still not working:
rm -rf node_modules/.vite
npm run dev
```

#### Problem: TypeScript errors (even though this is JavaScript)

**Cause:** IDE treating .jsx as TypeScript

**Solution:**
- Ensure files are .jsx not .tsx
- Configure VSCode settings:
```json
{
  "javascript.validate.enable": true,
  "typescript.validate.enable": false
}
```

#### Problem: ESLint errors

**Cause:** Missing ESLint configuration

**Solution:**
```bash
# Disable ESLint or install config:
npm install --save-dev eslint eslint-plugin-react
```

---

## Getting Help

### Before asking for help:

1. **Check browser console** (F12 → Console tab)
2. **Look for error messages** (screenshot them)
3. **Note what you were doing** when error occurred
4. **Try in incognito mode** to rule out extensions
5. **Clear cache and reload** (Ctrl+Shift+R / Cmd+Shift+R)

### Information to provide:

- Node.js version: `node --version`
- npm version: `npm --version`
- Browser and version
- Operating system
- Full error message
- Steps to reproduce

### Useful console commands:

```javascript
// Check what's in localStorage
Object.keys(localStorage)
localStorage.getItem('may_master_resume')

// Check API configuration
console.log('API key starts with:', localStorage.getItem('may_api_key')?.substring(0, 10))

// Test API connectivity
fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': localStorage.getItem('may_api_key'),
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Hi' }]
  })
}).then(r => r.json()).then(console.log)
```

---

## Emergency Reset

If everything is broken and you want to start fresh:

```bash
# 1. Clear all data
localStorage.clear()

# 2. Delete and reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Restart dev server
npm run dev

# 4. Hard refresh browser
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)
```

---

## Still Having Issues?

Contact: whdubbs@gmail.com

Include:
- Description of the problem
- What you've tried
- Error messages/screenshots
- Browser console logs

I'll help you debug!
