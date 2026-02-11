import { BriefcaseIcon, UserIcon } from '../utils/icons'

function LandingPage({ onSelectRole }) {
  return (
    <div className="container">
      <nav className="nav-bar">
        <div className="logo" style={{ fontSize: '32px', fontWeight: '700' }}>May</div>
      </nav>

      <div className="page-header" style={{ marginTop: 'var(--space-3xl)' }}>
        <h1 className="page-title" style={{ fontSize: '48px' }}>Welcome to May</h1>
        <p className="page-subtitle" style={{ fontSize: '20px' }}>
          AI-powered resume builder and job matching platform
        </p>
      </div>

      <div className="action-cards" style={{ maxWidth: '900px', margin: '0 auto', marginTop: 'var(--space-3xl)' }}>
        <div className="action-card stagger-1" onClick={() => onSelectRole('jobseeker')}>
          <span className="action-card-icon">
            <UserIcon />
          </span>
          <h2 className="action-card-title">I'm a Job-Seeker</h2>
          <p className="action-card-description">
            Build and tailor your resume with AI. May will help you create compelling, job-specific resumes that get noticed by employers.
          </p>
        </div>

        <div className="action-card stagger-2" onClick={() => onSelectRole('employer')}>
          <span className="action-card-icon">
            <BriefcaseIcon />
          </span>
          <h2 className="action-card-title">I'm an Employer</h2>
          <p className="action-card-description">
            Post your job openings and hiring criteria. Connect with qualified candidates from the CBS community and beyond.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
