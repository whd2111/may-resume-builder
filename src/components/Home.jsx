import '../App.css'

function Home({ onNavigate }) {
  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="logo">May</h1>
        <p className="tagline">Your AI-powered resume builder</p>
      </div>

      <div className="action-cards">
        <div className="action-card" onClick={() => onNavigate('build')}>
          <span className="action-card-icon">✨</span>
          <h2 className="action-card-title">Build Your Resume</h2>
          <p className="action-card-description">
            Create your primary 1-page resume from scratch or upload an existing one to improve. May will use best practices to craft a compelling professional resume.
          </p>
        </div>

        <div className="action-card" onClick={() => onNavigate('tailor')}>
          <span className="action-card-icon">🎯</span>
          <h2 className="action-card-title">Tailor for Jobs</h2>
          <p className="action-card-description">
            Customize your resume for specific roles. Paste one job description or multiple at once—May will create tailored versions for each.
          </p>
        </div>

        <div className="action-card" onClick={() => onNavigate('review')}>
          <span className="action-card-icon">🔍</span>
          <h2 className="action-card-title">Get Feedback</h2>
          <p className="action-card-description">
            Get expert AI analysis of your resume quality. May will score each section and provide specific, actionable suggestions for improvement.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home
