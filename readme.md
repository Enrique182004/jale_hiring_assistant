# Jale - AI-Powered Hiring Assistant

An intelligent hiring platform that connects job seekers with employers using AI-driven matching, automated messaging, and streamlined interview scheduling. Built with React and featuring a Tinder-style job discovery interface.

## 🌟 Features

### For Workers (Job Seekers)
- **Tinder-Style Job Discovery**: Swipe right to apply, left to pass
- **AI-Powered Matching**: Get matched with jobs based on skills, location, and preferences
- **Multilingual Support**: Interface available in English and Spanish
- **Smart Chat Assistant**: AI chatbot answers questions about pay, location, schedule, and benefits
- **Interview Management**: Track scheduled interviews and join video calls
- **Profile Management**: Create detailed profile with skills, availability, and pay expectations

### For Employers
- **Job Posting**: Create detailed job listings with required skills and compensation
- **Candidate Matching**: AI automatically matches and ranks candidates by compatibility
- **Automated Outreach**: AI generates personalized messages to qualified candidates
- **Chat System**: Communicate with candidates through built-in messaging
- **Interview Scheduling**: Schedule and manage video interviews
- **Hiring Pipeline**: Track candidates through interview process (scheduled/completed/hired/rejected)

### AI Features
- **Intelligent Matching Algorithm**: Scores candidates based on:
  - Skills compatibility (50% weight)
  - Location proximity (25% weight)
  - Pay expectations (15% weight)
  - Availability overlap (10% weight)
- **Multilingual Outreach**: Automated messages in English and Spanish
- **Conversational AI**: Answers common questions about jobs
- **Interview Reminders**: Automated reminders to reduce no-shows

## 🛠️ Technology Stack

- **Frontend**: React 18
- **Routing**: React Router DOM
- **Database**: Dexie.js (IndexedDB wrapper) - Local browser database
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Video Conferencing**: Jitsi Meet API integration (ready for implementation)

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Modern web browser with IndexedDB support

## 🚀 Installation

1. **Clone or extract the project**
```bash
cd jale-hiring-assistant
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm start
```

4. **Open your browser**
Navigate to `http://localhost:3000`

## 👤 Demo Accounts

The application comes with pre-seeded demo accounts:

### Employer Account
- Email: `employer@demo.com`
- Password: `demo123`
- Company: ABC Construction Co.

### Worker Account
- Email: `worker@demo.com`
- Password: `demo123`
- Name: John Martinez

## 📱 Usage Guide

### For Job Seekers

1. **Sign Up / Login**
   - Create account as "Job Seeker"
   - Fill in your profile: name, location, skills, availability, expected pay

2. **Discover Jobs**
   - Browse jobs in Tinder-style interface
   - See match percentage for each job
   - Swipe right (heart) to apply
   - Swipe left (X) to pass

3. **Chat with Employers**
   - Navigate to "My Matches" tab
   - Click "Chat with Employer" on any match
   - Ask AI assistant about job details
   - Communicate with employer

4. **Manage Interviews**
   - View scheduled interviews in "Interviews" tab
   - Join video calls when scheduled
   - Track interview status

### For Employers

1. **Sign Up / Login**
   - Create account as "Employer"
   - Fill in company details and needs

2. **Post Jobs**
   - Click "Post New Job"
   - Enter job details, skills needed, pay, availability
   - AI automatically finds and matches qualified candidates

3. **Review Candidates**
   - Navigate to "Candidates" tab
   - See match scores for each candidate
   - Review candidate profiles and skills

4. **Message Candidates**
   - Click "Message" on candidate cards
   - AI assistant initiates conversation
   - Continue conversation with candidates

5. **Manage Interviews**
   - Schedule interviews with matched candidates
   - Track interview status
   - Make hiring decisions (Hire/Reject/Follow-up)

## 🗄️ Database Structure

The application uses IndexedDB through Dexie.js with the following tables:

- **users**: User profiles (workers and employers)
- **jobs**: Job postings
- **matches**: Worker-job matches with scores
- **interviews**: Scheduled interviews
- **messages**: Chat messages
- **chatHistory**: Chat history tracking

All data is stored locally in the browser.

## 🤖 AI Assistant Capabilities

### Matching Algorithm
- Analyzes skills overlap
- Considers geographic proximity
- Evaluates pay compatibility
- Checks availability alignment

### Conversational Features
- Answers questions about:
  - Pay rates and compensation
  - Job location and accessibility
  - Work schedule and hours
  - Benefits and perks
- Generates personalized outreach messages
- Provides interview reminders

### Multilingual Support
- English and Spanish interfaces
- Localized messages and responses
- Cultural context awareness

## 🎯 Key Components

### Authentication System
- Secure login/signup
- Session management
- Role-based access control
- Password protection

### Matching System
- Real-time compatibility scoring
- Automatic match creation
- Match status tracking

### Communication System
- Real-time messaging
- AI-powered responses
- Message history

### Interview Management
- Scheduling system
- Status tracking
- Video call integration (Jitsi-ready)

## 🔐 Security Features

- Password hashing (implementation ready)
- Session management
- Protected routes
- User type validation

## 📈 Future Enhancements

- [ ] Video interview integration with Jitsi Meet
- [ ] Push notifications for messages and interviews
- [ ] Advanced analytics dashboard
- [ ] Document upload (resumes, certifications)
- [ ] Rating and review system
- [ ] Email notifications
- [ ] Calendar integration
- [ ] Multi-language expansion
- [ ] Mobile app version

## 🐛 Troubleshooting

### Database Issues
If you encounter database issues, clear browser storage:
1. Open browser DevTools (F12)
2. Go to Application > Storage
3. Clear site data
4. Refresh the page

### Port Already in Use
If port 3000 is busy:
```bash
PORT=3001 npm start
```

### Dependencies Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📄 Project Structure

```
jale-hiring-assistant/
├── public/
│   └── index.html
├── src/
│   ├── context/
│   │   └── AuthContext.js
│   ├── database/
│   │   └── db.js
│   ├── pages/
│   │   ├── Login.js
│   │   ├── Signup.js
│   │   ├── EmployerDashboard.js
│   │   └── WorkerDashboard.js
│   ├── services/
│   │   └── aiAssistant.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## 🤝 Contributing

This is a prototype application. To contribute:
1. Test the application thoroughly
2. Report bugs and issues
3. Suggest feature improvements
4. Optimize AI matching algorithm

## 📞 Support

For issues or questions:
- Check browser console for errors
- Verify all dependencies are installed
- Ensure modern browser with IndexedDB support
- Clear browser cache and storage

## 📝 License

This project is a prototype for Jale hiring platform.

## 🙏 Acknowledgments

- React team for the framework
- Tailwind CSS for styling
- Dexie.js for database management
- Lucide for beautiful icons

---

Built with ❤️ for Jale - Making hiring simple and intelligent