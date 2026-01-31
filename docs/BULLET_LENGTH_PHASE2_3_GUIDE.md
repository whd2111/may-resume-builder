# Bullet Length Optimization - Phase 2 & 3 Implementation Guide

This guide provides ready-to-use code for implementing advanced orphan detection and refinement.

---

## Phase 2: Orphan Detection (2-3 hours)

### **File 1: `src/utils/bulletRenderer.js`**

```javascript
/**
 * Bullet Rendering & Measurement Utilities
 * Detects orphan lines by rendering bullets and measuring line metrics
 */

// Resume styling constants (matching docxGenerator.js)
const FONT_FAMILY = 'Times New Roman'
const FONT_SIZE_PT = 10
const LINE_HEIGHT = 1.2
const PAGE_WIDTH_INCHES = 8.5
const MARGIN_INCHES = 0.5
const BULLET_INDENT_INCHES = 0.25
const DPI = 96

// Calculated values
const CONTENT_WIDTH_PX = (PAGE_WIDTH_INCHES - 2 * MARGIN_INCHES - BULLET_INDENT_INCHES) * DPI
const LINE_HEIGHT_PX = FONT_SIZE_PT * LINE_HEIGHT * DPI / 72

/**
 * Escape HTML for safe rendering
 */
function escapeHTML(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Measure a single bullet's rendering metrics
 * @param {string} bulletText - The bullet text to measure
 * @returns {Object} - { lineCount, lastLineWordCount, lastLineFillRatio, totalChars }
 */
export function measureBullet(bulletText) {
  const measureDiv = document.createElement('div')
  measureDiv.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: ${CONTENT_WIDTH_PX}px;
    font-family: '${FONT_FAMILY}', serif;
    font-size: ${FONT_SIZE_PT}pt;
    line-height: ${LINE_HEIGHT};
    padding: 0;
    margin: 0;
    white-space: normal;
    word-wrap: break-word;
  `
  
  // Create bullet list structure
  const ul = document.createElement('ul')
  ul.style.cssText = `
    margin: 0;
    padding: 0 0 0 ${BULLET_INDENT_INCHES * DPI}px;
    list-style-position: outside;
  `
  
  const li = document.createElement('li')
  li.style.cssText = `
    margin: 0;
    padding: 0;
  `
  li.textContent = bulletText
  
  ul.appendChild(li)
  measureDiv.appendChild(ul)
  document.body.appendChild(measureDiv)
  
  try {
    const height = li.offsetHeight
    const lineCount = Math.round(height / LINE_HEIGHT_PX)
    
    // Estimate last line metrics
    const metrics = estimateLastLineMetrics(bulletText, li, lineCount)
    
    return {
      lineCount,
      lastLineWordCount: metrics.wordCount,
      lastLineFillRatio: metrics.fillRatio,
      totalChars: bulletText.length,
      estimatedCharPerLine: Math.floor(bulletText.length / lineCount)
    }
  } finally {
    document.body.removeChild(measureDiv)
  }
}

/**
 * Estimate last line word count and fill ratio
 * Uses binary search to find last line break point
 */
function estimateLastLineMetrics(bulletText, liElement, lineCount) {
  if (lineCount === 1) {
    const words = bulletText.trim().split(/\s+/)
    return {
      wordCount: words.length,
      fillRatio: liElement.offsetWidth / CONTENT_WIDTH_PX
    }
  }
  
  // For multi-line bullets, estimate where last line starts
  const words = bulletText.trim().split(/\s+/)
  const avgWordsPerLine = words.length / lineCount
  
  // Conservative estimate: assume last line has fewer words than average
  const estimatedLastLineWords = Math.max(1, Math.floor(avgWordsPerLine * 0.8))
  
  // Calculate fill ratio based on word distribution
  const lastLineText = words.slice(-estimatedLastLineWords).join(' ')
  const fillRatio = estimateTextWidth(lastLineText) / CONTENT_WIDTH_PX
  
  return {
    wordCount: estimatedLastLineWords,
    fillRatio: Math.min(1.0, fillRatio)
  }
}

/**
 * Estimate text width using canvas measurement
 * More accurate than character count for proportional fonts
 */
function estimateTextWidth(text) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = `${FONT_SIZE_PT}pt ${FONT_FAMILY}`
  return ctx.measureText(text).width
}

/**
 * Check if a bullet has an orphan last line
 * @param {Object} metrics - Output from measureBullet()
 * @param {Object} options - { wordThreshold: 3, fillThreshold: 0.45 }
 * @returns {boolean}
 */
export function hasOrphanLine(metrics, options = {}) {
  const { wordThreshold = 3, fillThreshold = 0.45 } = options
  
  // Single-line bullets are fine
  if (metrics.lineCount === 1) return false
  
  // Multi-line with very short last line
  if (metrics.lastLineWordCount <= wordThreshold) return true
  
  // Multi-line with unfilled last line
  if (metrics.lastLineFillRatio < fillThreshold) return true
  
  return false
}

/**
 * Analyze all bullets in a resume for orphans
 * @param {Object} resumeData - Resume JSON structure
 * @returns {Array} - Array of { bulletId, bulletText, metrics, hasOrphan }
 */
export function analyzeResumeBullets(resumeData) {
  const results = []
  
  if (!resumeData.experience) return results
  
  resumeData.experience.forEach((exp, expIdx) => {
    if (!exp.bullets) return
    
    exp.bullets.forEach((bullet, bulletIdx) => {
      const bulletId = `exp${expIdx}_bullet${bulletIdx}`
      const metrics = measureBullet(bullet)
      const hasOrphan = hasOrphanLine(metrics)
      
      results.push({
        bulletId,
        bulletText: bullet,
        company: exp.company,
        title: exp.title,
        metrics,
        hasOrphan
      })
    })
  })
  
  return results
}

/**
 * Generate a report of orphan bullets
 * @param {Array} analysis - Output from analyzeResumeBullets()
 * @returns {Object} - Summary statistics
 */
export function generateOrphanReport(analysis) {
  const totalBullets = analysis.length
  const orphanBullets = analysis.filter(a => a.hasOrphan)
  const orphanRate = totalBullets > 0 ? orphanBullets.length / totalBullets : 0
  
  return {
    totalBullets,
    orphanCount: orphanBullets.length,
    orphanRate,
    orphanRatePercent: (orphanRate * 100).toFixed(1),
    orphanBullets: orphanBullets.map(b => ({
      bulletId: b.bulletId,
      location: `${b.company} - ${b.title}`,
      text: b.bulletText.substring(0, 60) + '...',
      lineCount: b.metrics.lineCount,
      lastLineWords: b.metrics.lastLineWordCount,
      lastLineFill: (b.metrics.lastLineFillRatio * 100).toFixed(0) + '%'
    }))
  }
}
```

---

### **Integration in `Stage2Tailor.jsx`**

Add after tailored resume is generated:

```javascript
import { analyzeResumeBullets, generateOrphanReport } from '../utils/bulletRenderer'

const handleTailorSelectedBullets = async (checklistData, selectionData) => {
  // ... existing tailoring code ...
  
  const tailored = applyRewrittenBullets(primaryResume, result.rewritten_bullets)
  
  // PHASE 2: Analyze for orphan lines
  const analysis = analyzeResumeBullets(tailored)
  const report = generateOrphanReport(analysis)
  
  console.log('📊 Orphan Line Report:', report)
  
  if (report.orphanCount > 0) {
    console.warn(`⚠️ ${report.orphanCount} bullets have orphan lines (${report.orphanRatePercent}%)`)
    // Optional: Show warning to user
    setOrphanReport(report)
  }
  
  setTailoredResume(tailored)
}
```

Add state for orphan report:

```javascript
const [orphanReport, setOrphanReport] = useState(null)
```

Display orphan warning (optional UI):

```jsx
{orphanReport && orphanReport.orphanCount > 0 && (
  <div className="card-premium" style={{ 
    borderLeft: '4px solid #f59e0b', 
    background: '#fffbeb',
    marginBottom: 'var(--space-lg)'
  }}>
    <div className="card-title" style={{ color: '#92400e' }}>
      ⚠️ {orphanReport.orphanCount} Bullet{orphanReport.orphanCount > 1 ? 's' : ''} May Need Refinement
    </div>
    <p style={{ fontSize: '14px', color: '#92400e', marginBottom: 'var(--space-sm)' }}>
      These bullets have short last lines that may look awkward:
    </p>
    <ul style={{ fontSize: '13px', color: '#78350f', marginLeft: 'var(--space-md)' }}>
      {orphanReport.orphanBullets.slice(0, 3).map((b, idx) => (
        <li key={idx} style={{ marginBottom: '4px' }}>
          {b.location}: "{b.text}" ({b.lineCount} lines, last line {b.lastLineWords} words)
        </li>
      ))}
    </ul>
    <button
      onClick={() => handleRefineOrphans()}
      className="btn btn-secondary"
      style={{ marginTop: 'var(--space-sm)', fontSize: '13px' }}
    >
      Auto-Refine Orphan Bullets
    </button>
  </div>
)}
```

---

## Phase 3: Auto-Refinement (4-6 hours)

### **File 2: `src/utils/bulletRefiner.js`**

```javascript
import { callClaude } from './claudeApi'
import { measureBullet, hasOrphanLine } from './bulletRenderer'

/**
 * System prompt for bullet refinement
 */
const BULLET_REFINEMENT_SYSTEM_PROMPT = `You are a resume bullet refinement expert. Your ONLY job is to rewrite a single bullet that has an awkward "orphan" last line (1-3 words alone on the final line).

You will receive detailed metrics about the bullet's current rendering. You must choose ONE strategy:
A) SHORTEN: Rewrite to fit on 1 line (~130-160 characters)
B) LENGTHEN: Rewrite to cleanly fill 2 lines (~200-240 characters, last line >70% full)

RULES:
1. Preserve factual accuracy - do NOT invent metrics, tools, or employers
2. Keep required_keywords if they are accurate
3. Do NOT add forbidden_additions
4. Prioritize impact over length
5. Use past tense for past positions
6. Make changes sound natural

TO LENGTHEN, add in priority order:
- Quantified metrics (%, $, time, scale)
- Tools/technologies (from required_keywords)
- Scope (team size, users, reach)
- Business impact/outcomes

TO SHORTEN, remove:
- Redundant action verbs
- Fluff phrases ("responsible for", "worked on")
- Less critical details

OUTPUT FORMAT (JSON only):
{
  "refined_text": "The rewritten bullet...",
  "strategy": "shorten|lengthen",
  "chars_before": 123,
  "chars_after": 145,
  "reasoning": "Brief explanation of changes"
}`

/**
 * Refine a single bullet with orphan line
 * @param {string} bulletText - Original bullet text
 * @param {Object} metrics - Output from measureBullet()
 * @param {Array} requiredKeywords - Keywords that must remain (if accurate)
 * @param {Array} forbiddenAdditions - Do not invent these
 * @returns {Promise<string>} - Refined bullet text
 */
export async function refineBullet(
  bulletText, 
  metrics, 
  requiredKeywords = [], 
  forbiddenAdditions = []
) {
  const userPrompt = `
ORIGINAL BULLET:
"${bulletText}"

CURRENT METRICS:
- Total characters: ${metrics.totalChars}
- Line count: ${metrics.lineCount}
- Last line word count: ${metrics.lastLineWordCount}
- Last line fill ratio: ${(metrics.lastLineFillRatio * 100).toFixed(0)}%
- Avg chars per line: ${metrics.estimatedCharPerLine}

ISSUE: This bullet wraps to ${metrics.lineCount} lines with an orphan last line (${metrics.lastLineWordCount} words, ${(metrics.lastLineFillRatio * 100).toFixed(0)}% full).

REQUIRED KEYWORDS (keep if accurate): ${requiredKeywords.length > 0 ? requiredKeywords.join(', ') : 'None'}
FORBIDDEN ADDITIONS (do not invent): ${forbiddenAdditions.length > 0 ? forbiddenAdditions.join(', ') : 'None'}

TARGET OPTIONS:
A) Shorten to 1 line: 130-160 characters
B) Lengthen to 2 full lines: 200-240 characters, last line >70% full

Refine this bullet now. Return JSON only.
`

  try {
    const response = await callClaude(
      null,
      [{ role: 'user', content: userPrompt }],
      BULLET_REFINEMENT_SYSTEM_PROMPT
    )
    
    // Parse response
    let cleanedResponse = response.trim()
    cleanedResponse = cleanedResponse.replace(/^```json?\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/\s*```$/, '')
    
    const result = JSON.parse(cleanedResponse)
    
    console.log(`✏️ Refined bullet (${result.strategy}):`, {
      before: bulletText.substring(0, 60) + '...',
      after: result.refined_text.substring(0, 60) + '...',
      charsBefore: result.chars_before,
      charsAfter: result.chars_after,
      reasoning: result.reasoning
    })
    
    return result.refined_text
    
  } catch (error) {
    console.error('Bullet refinement failed:', error)
    // Fallback: return original
    return bulletText
  }
}

/**
 * Refine all bullets with orphan lines in a resume
 * @param {Object} resumeData - Resume JSON structure
 * @param {Array} requiredKeywords - Keywords to preserve
 * @param {Array} forbiddenAdditions - Do not invent
 * @param {Object} options - { maxRefinements: 10 }
 * @returns {Promise<Object>} - Refined resume
 */
export async function refineOrphanBullets(
  resumeData, 
  requiredKeywords = [], 
  forbiddenAdditions = [],
  options = {}
) {
  const { maxRefinements = 10 } = options
  const refined = JSON.parse(JSON.stringify(resumeData))
  
  let refinementCount = 0
  
  for (let expIdx = 0; expIdx < refined.experience.length; expIdx++) {
    const exp = refined.experience[expIdx]
    if (!exp.bullets) continue
    
    for (let bulletIdx = 0; bulletIdx < exp.bullets.length; bulletIdx++) {
      if (refinementCount >= maxRefinements) {
        console.log(`⚠️ Reached max refinements (${maxRefinements})`)
        return refined
      }
      
      const bullet = exp.bullets[bulletIdx]
      const metrics = measureBullet(bullet)
      
      if (hasOrphanLine(metrics)) {
        console.log(`🔧 Refining exp${expIdx}_bullet${bulletIdx}...`)
        
        const refinedBullet = await refineBullet(
          bullet,
          metrics,
          requiredKeywords,
          forbiddenAdditions
        )
        
        // Verify refinement didn't create a new orphan
        const newMetrics = measureBullet(refinedBullet)
        if (!hasOrphanLine(newMetrics)) {
          refined.experience[expIdx].bullets[bulletIdx] = refinedBullet
          refinementCount++
          console.log(`✅ Refinement successful (${newMetrics.lineCount} lines, no orphan)`)
        } else {
          console.warn(`⚠️ Refinement still has orphan, keeping original`)
          // Keep original
        }
      }
    }
  }
  
  console.log(`🎉 Refined ${refinementCount} bullets`)
  return refined
}

/**
 * Iterative refinement with retry
 * @param {Object} resumeData - Resume JSON
 * @param {Array} keywords - Required keywords
 * @param {number} maxIterations - Max refinement passes
 * @returns {Promise<Object>} - Fully refined resume
 */
export async function refineUntilClean(resumeData, keywords = [], maxIterations = 2) {
  let currentResume = resumeData
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    console.log(`📐 Refinement pass ${iteration + 1}/${maxIterations}`)
    
    currentResume = await refineOrphanBullets(currentResume, keywords, [])
    
    // Check if any orphans remain
    const { analyzeResumeBullets, generateOrphanReport } = await import('./bulletRenderer')
    const analysis = analyzeResumeBullets(currentResume)
    const report = generateOrphanReport(analysis)
    
    console.log(`📊 After pass ${iteration + 1}: ${report.orphanCount} orphans remaining (${report.orphanRatePercent}%)`)
    
    if (report.orphanCount === 0) {
      console.log('✅ All orphans eliminated!')
      break
    }
  }
  
  return currentResume
}
```

---

### **Integration in `Stage2Tailor.jsx` (Phase 3)**

```javascript
import { refineUntilClean } from '../utils/bulletRefiner'
import { analyzeResumeBullets, generateOrphanReport } from '../utils/bulletRenderer'

const handleTailorSelectedBullets = async (checklistData, selectionData) => {
  try {
    // Step 1: Initial tailoring
    const prompt = `...` // existing prompt
    const response = await callClaude(...)
    const result = JSON.parse(cleanedResponse)
    
    // Step 2: Apply rewritten bullets
    const tailored = applyRewrittenBullets(primaryResume, result.rewritten_bullets)
    
    // Step 3: Auto-refine orphan bullets (PHASE 3)
    setLoadingStage('refining')
    const keywords = [
      ...checklistData.keyword_pack.primary,
      ...checklistData.must_haves.tools,
      ...checklistData.must_haves.hard_skills
    ]
    
    const refined = await refineUntilClean(tailored, keywords, 2)
    
    // Step 4: Final analysis
    const finalAnalysis = analyzeResumeBullets(refined)
    const finalReport = generateOrphanReport(finalAnalysis)
    
    console.log('📊 Final orphan report:', finalReport)
    
    setTailoredResume(refined)
    setOrphanReport(finalReport)
    
  } catch (error) {
    console.error('Tailoring error:', error)
    throw new Error(`Failed to tailor bullets: ${error.message}`)
  }
}
```

Update loading stage UI:

```jsx
{isLoading && (
  <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-xl)' }}>
    <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-primary)', color: 'white' }}>
      {loadingStage === 'checklist' && <TargetIcon />}
      {loadingStage === 'scoring' && <TargetIcon />}
      {loadingStage === 'tailoring' && <WritingIcon />}
      {loadingStage === 'refining' && <WritingIcon />}
    </div>
    <p style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '500' }}>
      {loadingStage === 'checklist' && 'Extracting job requirements...'}
      {loadingStage === 'scoring' && 'Scoring and selecting bullets...'}
      {loadingStage === 'tailoring' && 'Tailoring selected bullets...'}
      {loadingStage === 'refining' && 'Polishing bullets to eliminate orphan lines...'}
    </p>
    <div className="loading" style={{ marginTop: 'var(--space-lg)' }}></div>
  </div>
)}
```

---

## Testing Phase 2 & 3

### **Test Case 1: Detection Accuracy**

```javascript
import { measureBullet, hasOrphanLine } from './src/utils/bulletRenderer'

// Test orphan detection
const orphanBullet = "Led product launches that improved market share."
const metrics = measureBullet(orphanBullet)
console.log('Orphan?', hasOrphanLine(metrics)) // Should be true

// Test non-orphan
const goodBullet = "Led 3 product launches using Agile methodology, managing cross-functional teams of 8 engineers to deliver features impacting 50K+ users."
const metrics2 = measureBullet(goodBullet)
console.log('Orphan?', hasOrphanLine(metrics2)) // Should be false
```

### **Test Case 2: Refinement Quality**

Run refinement on a sample resume and check:
- [ ] Orphan rate drops from 30-40% → <5%
- [ ] No invented metrics or tools
- [ ] Past tense maintained
- [ ] Keywords from job preserved
- [ ] Natural-sounding bullets (not keyword-stuffed)

---

## Performance Considerations

**Phase 2 (Detection):**
- ~10-20ms per bullet (DOM rendering)
- 10 bullets = 100-200ms (negligible)

**Phase 3 (Refinement):**
- ~2-3s per Claude API call
- 3-5 orphan bullets = 6-15s additional latency
- Use loading indicator: "Polishing bullets..."

**Cost:**
- Phase 2: Zero (client-side only)
- Phase 3: ~$0.01-0.05 per resume (Claude API calls for 3-5 bullets)

---

## Rollback Plan

If Phase 2/3 causes issues:

**Disable auto-refinement:**
```javascript
// In Stage2Tailor.jsx, comment out:
// const refined = await refineUntilClean(tailored, keywords, 2)
// setTailoredResume(refined)

// Use tailored resume directly:
setTailoredResume(tailored)
```

**Disable detection UI:**
```javascript
// Comment out orphan report display
// {orphanReport && ...}
```

---

## Future Enhancements

1. **User-configurable thresholds:**
   - Let users set orphan tolerance (e.g., "strict", "balanced", "lenient")

2. **Selective refinement:**
   - Show list of orphan bullets, let user choose which to refine

3. **Preview before/after:**
   - Show side-by-side comparison of original vs. refined bullets

4. **Analytics:**
   - Track orphan rate over time
   - Identify which job types produce more orphans

---

**Status:** Phase 2 & 3 ready for implementation  
**Estimated Total Time:** 6-9 hours  
**Expected Final Orphan Rate:** <5%
