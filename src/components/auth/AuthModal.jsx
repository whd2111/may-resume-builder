import { useState } from 'react'
import SignIn from './SignIn'
import SignUp from './SignUp'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        {mode === 'signin' ? (
          <SignIn 
            onSuccess={onClose} 
            onSwitchToSignUp={() => setMode('signup')}
          />
        ) : (
          <SignUp 
            onSuccess={onClose} 
            onSwitchToSignIn={() => setMode('signin')}
          />
        )}
      </div>
    </div>
  )
}
