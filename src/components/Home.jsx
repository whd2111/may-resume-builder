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
          <h2 className="action-card-title">Build a Resume</h2>
          <p className="action-card-description">
            Start from scratch with our AI chatbot. May will ask strategic questions to extract your best accomplishments and create a professional resume.
          </p>
        </div>

        <div className="action-card" onClick={() => onNavigate('update')}>
          <span className="action-card-icon">📝</span>
          <h2 className="action-card-title">Update Your Main Resume</h2>
          <p className="action-card-description">
            Upload your existing resume and let May rewrite it using best practices: action verbs, metrics, and the "did X by Y as shown by Z" framework.
          </p>
        </div>

        <div className="action-card" onClick={() => onNavigate('tailor')}>
          <span className="action-card-icon">🎯</span>
          <h2 className="action-card-title">Tailor for a Specific Job</h2>
          <p className="action-card-description">
            Already have a master resume? Paste any job description and May will customize your resume to match that specific role.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home
