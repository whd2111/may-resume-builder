# May - AI Resume Builder

An intelligent resume builder that uses Claude AI to create and tailor professional resumes.

## Features

### Stage 1: Master Resume Creation
- Interactive chatbot conversation to gather your experience
- Strategic follow-up questions to extract metrics and individual contributions
- Automatically generates a professional DOCX resume using best practices:
  - Action verbs
  - "Did X by Y as shown by Z" framework
  - Maximum 2 lines per bullet point
  - Quantifiable metrics

### Stage 2: Job-Specific Tailoring
- Paste any job description
- Claude analyzes requirements and tailors your resume
- Maintains truthfulness while emphasizing relevant experience
- Uses job-specific keywords and language
- Exports tailored resume as DOCX

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Claude API key from [console.anthropic.com](https://console.anthropic.com/)

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd may-resume-builder
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - Enter your Claude API key when prompted

## How to Use

### Creating Your Master Resume

1. **Enter your API key** on the setup screen
2. **Have a conversation with May:**
   - Start with basic info (name, contact details)
   - Discuss your education
   - Share your work experience
   - May will ask follow-up questions to extract specific metrics and YOUR individual contributions
3. **Review and generate** your master resume when ready
4. **Download** the DOCX file

### Tailoring for Specific Jobs

1. **Paste the job description** into the text area
2. **Click "Tailor Resume"**
3. **Review** the tailored version with job-specific language
4. **Download** the tailored DOCX for your application

### Managing Your Resume

- **Download Master Resume**: Export your original master resume anytime
- **Edit Master Resume**: Return to Stage 1 to refine your content
- **Start Over**: Clear all data and create a new resume from scratch

## Data Storage

- Your master resume is saved in **browser localStorage**
- Your API key is stored locally (never sent anywhere except Anthropic)
- All data persists between sessions
- No server-side storage - everything stays on your machine

## Important Notes

### API Key Security
- The app uses `dangerouslyAllowBrowser: true` for the Anthropic SDK
- This is fine for personal use but **NOT recommended for production**
- For production, create a backend proxy to handle API calls
- Never commit your API key to version control

### Resume Format
The DOCX output matches the professional format from your sample resume:
- Right-aligned name and contact info
- Clean section separators
- Proper spacing and typography
- US Letter page size (8.5" x 11")

### Best Practices Enforced
- **Action verbs**: Led, built, drove, managed, designed, etc.
- **Metrics**: Quantifiable results whenever possible
- **Conciseness**: Max 2 lines per bullet
- **Individual contributions**: Focus on YOUR role, not team accomplishments
- **Impact framework**: "Did X by Y as shown by Z"

## Troubleshooting

### "API key invalid" error
- Verify your API key is correct from console.anthropic.com
- Make sure you have API credits available

### Resume not generating
- Check browser console for errors
- Ensure you answered all of May's questions completely
- Try refreshing and re-entering your API key

### DOCX not downloading
- Check browser's download settings/permissions
- Try a different browser if issues persist

## Technology Stack

- **Frontend**: React 18 + Vite
- **AI**: Anthropic Claude API (Sonnet 4)
- **Document Generation**: docx.js
- **Styling**: Custom CSS
- **Storage**: Browser localStorage

## Development

### Build for production:
```bash
npm run build
```

### Preview production build:
```bash
npm run preview
```

## Future Enhancements

Potential features to add:
- Multiple resume versions (different roles)
- ATS (Applicant Tracking System) optimization score
- Cover letter generation
- Backend API proxy for secure key management
- Multiple export formats (PDF, HTML)
- Resume templates and styling options
- Interview prep based on tailored resume

## License

Private project - All rights reserved

## Support

For issues or questions, contact: whdubbs@gmail.com
