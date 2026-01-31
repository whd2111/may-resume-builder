import { useState, useEffect, useRef } from 'react'
import './App.css'
import { useAuth } from './contexts/AuthContext'
import { useResumes } from './hooks/useResumes'
import { usePrimeResume } from './hooks/usePrimeResume'
import { usePrimeBullets } from './hooks/usePrimeBullets'
import Home from './components/Home'
import BuildResume from './components/BuildResume'
import TailorJobs from './components/TailorJobs'
import ResumeReviewer from './components/ResumeReviewer'
import ResumeLibrary from './components/ResumeLibrary'
import Dashboard from './components/Dashboard'
import ResumeBankUpload from './components/ResumeBankUpload'
import PatternExtractor from './components/PatternExtractor'

function App() {
  const { user, loading: authLoading } = useAuth()
  const { masterResume: primaryResume, createResume, updateResume, setAsMaster: setAsPrimary, loading: resumesLoading } = useResumes()
  const { primeResume, ensurePrimeResume, loading: primeLoading } = usePrimeResume()
  const { createBulletsBatch } = usePrimeBullets(primeResume?.id)
  const [page, setPage] = useState('home') // 'home', 'build', 'tailor', 'review', 'library', 'dashboard', 'resumebank', 'patterns'
  
  // Track if we've already bootstrapped to prevent double-runs
  const bootstrapRef = useRef(false)

  // Bootstrap Prime Resume when user is authenticated
  useEffect(() => {
    const bootstrapPrimeResume = async () => {
      // Only run once per session
      if (bootstrapRef.current) return
      if (!user) return
      if (authLoading || resumesLoading || primeLoading) return

      try {
        // Ensure Prime Resume exists (creates one if it doesn't)
        const prime = await ensurePrimeResume()
        if (!prime) return

        // Check if we need to import bullets from master resume
        // We do this only once: when prime_resume has no bullets yet
        const { data: existingBullets } = await import('./lib/supabase').then(m => 
          m.supabase
            .from('prime_bullets')
            .select('id')
            .eq('prime_resume_id', prime.id)
            .limit(1)
        )

        // If bullets already exist, don't re-import
        if (existingBullets && existingBullets.length > 0) {
          bootstrapRef.current = true
          return
        }

        // Import from master resume if available
        if (primaryResume?.resume_data?.experience) {
          console.log('Bootstrapping Prime Resume from master resume...')
          const bulletsToImport = []

          primaryResume.resume_data.experience.forEach(exp => {
            if (!exp.bullets || !Array.isArray(exp.bullets)) return

            exp.bullets.forEach(bulletText => {
              if (!bulletText || typeof bulletText !== 'string') return

              bulletsToImport.push({
                prime_resume_id: prime.id,
                company: exp.company || null,
                role: exp.title || null,
                bullet_text: bulletText,
                source: 'import',
                tags: [],
                skills: [],
                metrics: [],
              })
            })
          })

          if (bulletsToImport.length > 0) {
            await createBulletsBatch(bulletsToImport)
            console.log(`Imported ${bulletsToImport.length} bullets to Prime Resume`)
          }
        }

        bootstrapRef.current = true
      } catch (error) {
        console.error('Error bootstrapping Prime Resume:', error)
        // Don't block the app on bootstrap errors
        bootstrapRef.current = true
      }
    }

    bootstrapPrimeResume()
  }, [user, authLoading, resumesLoading, primeLoading, primaryResume, ensurePrimeResume, createBulletsBatch])

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="app">
        <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="loading" />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading May...</p>
        </div>
      </div>
    )
  }

  const handleNavigate = (destination) => {
    setPage(destination)
  }

  const handleResumeComplete = async (resumeData, title = 'Master Resume', isMaster = true) => {
    if (!user) return

    try {
      // If there's already a primary resume, update it; otherwise create new
      if (isMaster && primaryResume) {
        await updateResume(primaryResume.id, {
          resume_data: resumeData,
          title: title,
        })
      } else {
        await createResume(title, resumeData, isMaster)
      }
      setPage('home')
    } catch (error) {
      console.error('Error saving resume:', error)
      alert('Failed to save resume. Please try again.')
    }
  }

  const handleBack = () => {
    setPage('home')
  }

  return (
    <div className="app">
      {page === 'home' && (
        <Home 
          onNavigate={handleNavigate}
          user={user}
          hasPrimaryResume={!!primaryResume}
        />
      )}

      {page === 'build' && (
        <BuildResume
          onResumeComplete={handleResumeComplete}
          onBack={handleBack}
          existingResume={primaryResume?.resume_data}
          user={user}
        />
      )}

      {page === 'tailor' && (
        <TailorJobs
          primaryResume={primaryResume?.resume_data}
          onBack={handleBack}
          onNavigate={handleNavigate}
          user={user}
        />
      )}

      {page === 'review' && (
        <ResumeReviewer
          primaryResume={primaryResume?.resume_data}
          onBack={handleBack}
          onNavigate={handleNavigate}
          user={user}
        />
      )}

      {page === 'library' && (
        <ResumeLibrary
          onBack={handleBack}
        />
      )}

      {page === 'dashboard' && (
        <Dashboard
          onBack={handleBack}
        />
      )}

      {page === 'resumebank' && (
        <ResumeBankUpload
          onBack={handleBack}
        />
      )}

      {page === 'patterns' && (
        <PatternExtractor
          onBack={handleBack}
        />
      )}
    </div>
  )
}

export default App
