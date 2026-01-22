import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { callClaude } from '../utils/claudeApi'
import { ArrowLeftIcon, CheckIcon } from '../utils/icons'

const PATTERN_EXTRACTION_PROMPT = `You are an expert resume analyst. Analyze these high-quality resumes and extract actionable patterns.

Extract and categorize:

1. **Action Verbs** - Strong verbs that appear frequently
2. **Metric Formats** - How achievements are quantified (e.g., "Increased X by Y%", "$X revenue")
3. **Bullet Structures** - Common patterns (e.g., "Led X resulting in Y")
4. **Skill Descriptions** - How specific skills are described effectively

For each pattern, provide:
- The pattern itself
- A great example from the resumes
- Why it's effective
- How frequently it appears

Respond with JSON in this format:
{
  "action_verbs": [
    {
      "verb": "Led",
      "example": "Led cross-functional team of 12 engineers to launch product, increasing revenue by 45%",
      "effectiveness": "Shows leadership and quantifiable impact",
      "frequency": 15
    }
  ],
  "metric_formats": [
    {
      "format": "Increased X by Y%",
      "example": "Increased user engagement by 67% through personalization features",
      "effectiveness": "Clear before/after comparison with percentage",
      "frequency": 23
    }
  ],
  "bullet_structures": [
    {
      "structure": "Action verb + what + result with metric",
      "example": "Built automated testing framework, reducing bug count by 40%",
      "effectiveness": "Clear action, deliverable, and measurable outcome",
      "frequency": 31
    }
  ],
  "skill_descriptions": [
    {
      "skill": "Python",
      "example": "Architected scalable Python microservices handling 1M+ requests/day",
      "effectiveness": "Shows skill in context with scale/impact",
      "frequency": 8
    }
  ],
  "insights": [
    {
      "title": "Top resumes quantify impact",
      "description": "95% of 4-5 star resumes include specific metrics in every bullet",
      "confidence": 0.95
    }
  ]
}`

function PatternExtractor({ onBack }) {
  const [status, setStatus] = useState('idle') // 'idle', 'analyzing', 'extracting', 'storing', 'done'
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalResumes: 0,
    highQuality: 0,
    patternsFound: 0,
    examplesStored: 0
  })

  const extractPatterns = async () => {
    try {
      setStatus('analyzing')
      setError(null)
      setProgress(10)

      // Step 1: Fetch all high-quality resumes (4-5 stars)
      const { data: resumes, error: fetchError } = await supabase
        .from('resume_bank')
        .select('*')
        .gte('quality_score', 4)
        .eq('is_approved', true)
        .order('quality_score', { ascending: false })

      if (fetchError) throw fetchError

      setStats(prev => ({ 
        ...prev, 
        totalResumes: resumes.length,
        highQuality: resumes.length 
      }))
      setProgress(20)

      // Step 2: Group resumes by industry/role for context-specific patterns
      const grouped = {}
      resumes.forEach(resume => {
        const key = `${resume.industry || 'general'}_${resume.job_function || 'general'}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(resume)
      })

      setProgress(30)

      // Step 3: Extract patterns from each group
      setStatus('extracting')
      const allPatterns = []
      const allExamples = []
      const allInsights = []
      
      let processedGroups = 0
      const totalGroups = Object.keys(grouped).length

      for (const [key, groupResumes] of Object.entries(grouped)) {
        const [industry, jobFunction] = key.split('_')
        
        // Prepare resume text for analysis
        const resumeTexts = groupResumes.slice(0, 20).map(r => {
          const bullets = r.resume_data?.experience?.flatMap(exp => exp.bullets || []) || []
          return {
            quality: r.quality_score,
            bullets: bullets.slice(0, 10), // Top 10 bullets from each resume
            industry: r.industry,
            role_level: r.role_level,
            id: r.id
          }
        })

        // Call Claude to analyze this group
        const prompt = `Analyze these resumes from ${industry} / ${jobFunction}:\n\n${JSON.stringify(resumeTexts, null, 2)}`
        const response = await callClaude(null, [{ role: 'user', content: prompt }], PATTERN_EXTRACTION_PROMPT)

        // Parse patterns
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const patterns = JSON.parse(jsonMatch[0])
          
          // Store patterns with industry/function context
          patterns.action_verbs?.forEach(p => {
            allPatterns.push({
              pattern_type: 'action_verb',
              category: 'universal',
              industry: industry === 'general' ? null : industry,
              job_function: jobFunction === 'general' ? null : jobFunction,
              pattern_value: p.verb,
              example_text: p.example,
              frequency: p.frequency,
              description: p.effectiveness,
              source_resume_ids: groupResumes.map(r => r.id)
            })
          })

          patterns.metric_formats?.forEach(p => {
            allPatterns.push({
              pattern_type: 'metric_format',
              category: 'universal',
              industry: industry === 'general' ? null : industry,
              job_function: jobFunction === 'general' ? null : jobFunction,
              pattern_value: p.format,
              example_text: p.example,
              frequency: p.frequency,
              description: p.effectiveness,
              source_resume_ids: groupResumes.map(r => r.id)
            })
          })

          patterns.bullet_structures?.forEach(p => {
            allPatterns.push({
              pattern_type: 'bullet_structure',
              category: 'universal',
              industry: industry === 'general' ? null : industry,
              job_function: jobFunction === 'general' ? null : jobFunction,
              pattern_value: p.structure,
              example_text: p.example,
              frequency: p.frequency,
              description: p.effectiveness,
              source_resume_ids: groupResumes.map(r => r.id)
            })
          })

          patterns.skill_descriptions?.forEach(p => {
            allExamples.push({
              example_type: 'skill_description',
              industry: industry === 'general' ? null : industry,
              job_function: jobFunction === 'general' ? null : jobFunction,
              skill_focus: [p.skill.toLowerCase()],
              example_text: p.example,
              quality_score: 5,
              strengths: ['context', 'impact', 'specificity'],
              analysis: p.effectiveness
            })
          })

          patterns.insights?.forEach(insight => {
            allInsights.push({
              insight_type: 'quality_indicator',
              industry: industry === 'general' ? null : industry,
              job_function: jobFunction === 'general' ? null : jobFunction,
              insight_title: insight.title,
              insight_description: insight.description,
              confidence_score: insight.confidence,
              example_count: groupResumes.length
            })
          })
        }

        processedGroups++
        setProgress(30 + (processedGroups / totalGroups) * 40)
      }

      setProgress(70)

      // Step 4: Store in database
      setStatus('storing')
      
      // Store patterns
      if (allPatterns.length > 0) {
        const { error: patternsError } = await supabase
          .from('resume_patterns')
          .insert(allPatterns)
        
        if (patternsError) throw patternsError
      }

      setProgress(80)

      // Store examples
      if (allExamples.length > 0) {
        const { error: examplesError } = await supabase
          .from('resume_examples')
          .insert(allExamples)
        
        if (examplesError) throw examplesError
      }

      setProgress(90)

      // Store insights
      if (allInsights.length > 0) {
        const { error: insightsError } = await supabase
          .from('pattern_insights')
          .insert(allInsights)
        
        if (insightsError) throw insightsError
      }

      setProgress(100)

      setStats(prev => ({
        ...prev,
        patternsFound: allPatterns.length,
        examplesStored: allExamples.length + allInsights.length
      }))

      setResults({
        patterns: allPatterns.length,
        examples: allExamples.length,
        insights: allInsights.length
      })

      setStatus('done')

    } catch (err) {
      console.error('Pattern extraction error:', err)
      setError(err.message)
      setStatus('idle')
    }
  }

  return (
    <div className="container">
      <nav className="nav-bar">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            <ArrowLeftIcon />
            Back
          </button>
        )}
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Pattern Extractor</h1>
        <p className="page-subtitle">
          Analyze resume bank and extract best practices, patterns, and insights
        </p>
      </div>

      <div className="card-premium stagger-1">
        <div className="card-title">Extract Patterns from Resume Bank</div>
        
        {status === 'idle' && (
          <>
            <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
              This will analyze all high-quality resumes (4-5 stars) in your resume bank and extract:
            </p>
            <ul style={{ paddingLeft: '20px', marginBottom: 'var(--space-xl)', lineHeight: '1.8' }}>
              <li>Common action verbs and strong language patterns</li>
              <li>Effective metric formats and quantification methods</li>
              <li>Successful bullet point structures</li>
              <li>Best practices for describing skills</li>
              <li>Industry and role-specific insights</li>
            </ul>
            <button 
              className="btn btn-primary"
              onClick={extractPatterns}
            >
              Start Pattern Extraction
            </button>
          </>
        )}

        {(status === 'analyzing' || status === 'extracting' || status === 'storing') && (
          <div>
            <p style={{ marginBottom: 'var(--space-md)', color: 'var(--text-primary)', fontWeight: '600' }}>
              {status === 'analyzing' && '📊 Analyzing resumes...'}
              {status === 'extracting' && '🔍 Extracting patterns...'}
              {status === 'storing' && '💾 Storing to database...'}
            </p>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--surface-secondary)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: 'var(--space-md)'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'var(--gradient-primary)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {progress}% complete
            </p>
          </div>
        )}

        {status === 'done' && results && (
          <div style={{
            padding: 'var(--space-lg)',
            background: '#f0fdf4',
            borderRadius: '12px',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <CheckIcon />
              <h3 style={{ fontSize: '18px', color: '#065f46', margin: 0 }}>
                Pattern Extraction Complete!
              </h3>
            </div>
            <div style={{ color: '#065f46', fontSize: '15px', lineHeight: '1.8' }}>
              <strong>Results:</strong>
              <ul style={{ paddingLeft: '20px', marginTop: 'var(--space-sm)' }}>
                <li>{stats.totalResumes} high-quality resumes analyzed</li>
                <li>{results.patterns} patterns extracted and stored</li>
                <li>{results.examples} examples cataloged</li>
                <li>{results.insights} insights generated</li>
              </ul>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
              style={{ marginTop: 'var(--space-lg)' }}
            >
              Done
            </button>
          </div>
        )}

        {error && (
          <div style={{
            padding: 'var(--space-lg)',
            background: '#fef2f2',
            borderRadius: '12px',
            borderLeft: '4px solid #ef4444',
            color: '#b91c1c'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <div className="card-premium stagger-2">
        <div className="card-title">Current Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
          <div style={{ padding: 'var(--space-md)', background: 'var(--surface-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)' }}>
              {stats.totalResumes}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Resumes in Bank
            </div>
          </div>
          <div style={{ padding: 'var(--space-md)', background: 'var(--surface-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)' }}>
              {stats.highQuality}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              High Quality (4-5⭐)
            </div>
          </div>
          <div style={{ padding: 'var(--space-md)', background: 'var(--surface-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)' }}>
              {stats.patternsFound}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Patterns Found
            </div>
          </div>
          <div style={{ padding: 'var(--space-md)', background: 'var(--surface-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-primary)' }}>
              {stats.examplesStored}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Examples Stored
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatternExtractor
