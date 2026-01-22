import { supabase } from '../lib/supabase'

/**
 * Query system for retrieving patterns and examples from the resume bank
 * Used by May to provide contextual, data-driven resume advice
 */

/**
 * Get top action verbs for a specific context
 */
export async function getTopActionVerbs(filters = {}) {
  let query = supabase
    .from('resume_patterns')
    .select('*')
    .eq('pattern_type', 'action_verb')
    .gte('frequency', 3)
    .order('frequency', { ascending: false })
    .order('avg_quality_score', { ascending: false })
    .limit(20)

  if (filters.industry) {
    query = query.or(`industry.eq.${filters.industry},industry.is.null`)
  }
  if (filters.job_function) {
    query = query.or(`job_function.eq.${filters.job_function},job_function.is.null`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching action verbs:', error)
    return []
  }

  return data
}

/**
 * Get metric formats (how to quantify achievements)
 */
export async function getMetricFormats(filters = {}) {
  let query = supabase
    .from('resume_patterns')
    .select('*')
    .eq('pattern_type', 'metric_format')
    .gte('frequency', 2)
    .order('frequency', { ascending: false })
    .limit(15)

  if (filters.industry) {
    query = query.or(`industry.eq.${filters.industry},industry.is.null`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching metric formats:', error)
    return []
  }

  return data
}

/**
 * Get bullet structure patterns
 */
export async function getBulletStructures(filters = {}) {
  let query = supabase
    .from('resume_patterns')
    .select('*')
    .eq('pattern_type', 'bullet_structure')
    .gte('frequency', 3)
    .order('avg_quality_score', { ascending: false })
    .limit(10)

  if (filters.industry) {
    query = query.or(`industry.eq.${filters.industry},industry.is.null`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching bullet structures:', error)
    return []
  }

  return data
}

/**
 * Get examples for a specific skill
 */
export async function getSkillExamples(skill, filters = {}) {
  let query = supabase
    .from('resume_examples')
    .select('*')
    .eq('example_type', 'skill_description')
    .contains('skill_focus', [skill.toLowerCase()])
    .gte('quality_score', 4)
    .order('quality_score', { ascending: false })
    .limit(5)

  if (filters.industry) {
    query = query.eq('industry', filters.industry)
  }
  if (filters.job_function) {
    query = query.eq('job_function', filters.job_function)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching skill examples:', error)
    return []
  }

  return data
}

/**
 * Get all high-quality examples by type
 */
export async function getExamplesByType(type, filters = {}) {
  let query = supabase
    .from('resume_examples')
    .select('*')
    .eq('example_type', type)
    .gte('quality_score', 4)
    .order('quality_score', { ascending: false })
    .limit(10)

  if (filters.industry) {
    query = query.eq('industry', filters.industry)
  }
  if (filters.role_level) {
    query = query.eq('role_level', filters.role_level)
  }
  if (filters.job_function) {
    query = query.eq('job_function', filters.job_function)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching examples:', error)
    return []
  }

  return data
}

/**
 * Get insights for a specific context
 */
export async function getInsights(filters = {}) {
  let query = supabase
    .from('pattern_insights')
    .select('*')
    .gte('confidence_score', 0.7)
    .order('confidence_score', { ascending: false })
    .limit(10)

  if (filters.industry) {
    query = query.or(`industry.eq.${filters.industry},industry.is.null`)
  }
  if (filters.job_function) {
    query = query.or(`job_function.eq.${filters.job_function},job_function.is.null`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching insights:', error)
    return []
  }

  return data
}

/**
 * Get a comprehensive "May's Knowledge" package for a user
 * This includes top patterns, examples, and insights relevant to their context
 */
export async function getMayKnowledge(userContext = {}) {
  const [actionVerbs, metricFormats, bulletStructures, insights] = await Promise.all([
    getTopActionVerbs(userContext),
    getMetricFormats(userContext),
    getBulletStructures(userContext),
    getInsights(userContext)
  ])

  return {
    actionVerbs: actionVerbs.slice(0, 10),
    metricFormats: metricFormats.slice(0, 5),
    bulletStructures: bulletStructures.slice(0, 5),
    insights: insights.slice(0, 5)
  }
}

/**
 * Build an enhanced system prompt with patterns
 * This is used to make May smarter by including data-driven patterns
 */
export function buildEnhancedPrompt(basePrompt, knowledge) {
  if (!knowledge || Object.keys(knowledge).length === 0) {
    return basePrompt
  }

  let enhancement = '\n\n=== LEARNED PATTERNS FROM RESUME BANK ===\n'

  if (knowledge.actionVerbs?.length > 0) {
    enhancement += '\nTOP ACTION VERBS (from high-quality resumes):\n'
    knowledge.actionVerbs.slice(0, 8).forEach(v => {
      enhancement += `- ${v.pattern_value}: "${v.example_text}"\n`
    })
  }

  if (knowledge.metricFormats?.length > 0) {
    enhancement += '\nEFFECTIVE METRIC FORMATS:\n'
    knowledge.metricFormats.slice(0, 5).forEach(m => {
      enhancement += `- ${m.pattern_value}\n  Example: "${m.example_text}"\n`
    })
  }

  if (knowledge.bulletStructures?.length > 0) {
    enhancement += '\nPROVEN BULLET STRUCTURES:\n'
    knowledge.bulletStructures.slice(0, 3).forEach(b => {
      enhancement += `- ${b.pattern_value}\n  Example: "${b.example_text}"\n`
    })
  }

  if (knowledge.insights?.length > 0) {
    enhancement += '\nKEY INSIGHTS:\n'
    knowledge.insights.forEach(i => {
      enhancement += `- ${i.insight_title}: ${i.insight_description}\n`
    })
  }

  enhancement += '\n=== END LEARNED PATTERNS ===\n\n'
  enhancement += 'Use these patterns as inspiration when helping the user write their resume. '
  enhancement += 'Prioritize patterns from their specific industry/role when available.\n\n'

  return basePrompt + enhancement
}

/**
 * Get example bullets similar to user's input
 * Useful for showing "here's how top resumes describe this"
 */
export async function getSimilarExamples(userText, filters = {}) {
  // Simple keyword matching for now
  // Could be enhanced with semantic search later
  const keywords = userText.toLowerCase().split(' ').filter(w => w.length > 4)
  
  let query = supabase
    .from('resume_examples')
    .select('*')
    .gte('quality_score', 4)
    .limit(5)

  if (filters.industry) {
    query = query.eq('industry', filters.industry)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching similar examples:', error)
    return []
  }

  // Filter by keyword relevance
  return data.filter(example => {
    const exampleText = example.example_text.toLowerCase()
    return keywords.some(keyword => exampleText.includes(keyword))
  })
}
