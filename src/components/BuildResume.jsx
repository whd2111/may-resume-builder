import ResumeUpload from './ResumeUpload'

function BuildResume({ onResumeComplete, onBack, existingResume }) {
  return (
    <ResumeUpload
      onResumeComplete={onResumeComplete}
      onBack={onBack}
    />
  )
}

export default BuildResume
