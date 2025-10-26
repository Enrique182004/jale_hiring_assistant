/**
 * Enhanced AI Assistant with Interview Scheduling
 * Features: Typo correction, context awareness, smart matching, multi-language support, appointment scheduling
 */

import { db, generateJitsiRoomName } from '../database/db';
import { addDays, addHours, format, parse, isValid } from 'date-fns';

export class AIAssistant {
  constructor() {
    this.qaData = this.loadQAData();
    this.typoMap = this.qaData.common_typos_mapping || {};
    this.tradeKeywords = this.qaData.keywords_by_trade || {};
    this.conversationHistory = [];
    this.userContext = {};
    this.schedulingState = null; // Track scheduling conversation state
    
    // Enhanced job templates with multi-language support
    this.jobTemplates = {
      en: {
        greeting: "Hi {name}! I'm Jale's AI assistant. I found a great opportunity that matches your skills!",
        jobDetails: "📍 Location: {location}\n💰 Pay: {pay}\n🕐 Hours: {availability}\n📋 Skills needed: {skills}",
        questions: "Would you like to know more about this position? I can also help you schedule an interview!",
        matchScore: "Based on your profile, you're a {score}% match for this role!"
      },
      es: {
        greeting: "¡Hola {name}! Soy el asistente de IA de Jale. ¡Encontré una gran oportunidad que coincide con tus habilidades!",
        jobDetails: "📍 Ubicación: {location}\n💰 Pago: {pay}\n🕐 Horario: {availability}\n📋 Habilidades necesarias: {skills}",
        questions: "¿Te gustaría saber más sobre este puesto? ¡También puedo ayudarte a programar una entrevista!",
        matchScore: "¡Según tu perfil, eres un {score}% compatible para este trabajo!"
      }
    };

    this.responses = {
      en: {
        pay: "The pay rate for this position is {pay}. This is competitive for your skill level in the {location} area.",
        location: "The job is located at {location}. The worksite is easily accessible by public transportation.",
        schedule: "The work schedule is {availability}. We can discuss flexible arrangements during the interview.",
        benefits: "Benefits include competitive pay, flexible scheduling, and opportunities for skill development.",
        interview: "Great! I can help you schedule an interview. When would work best for you? You can suggest:\n• A specific date (e.g., 'tomorrow at 2pm', 'Friday afternoon')\n• Or I can show you available time slots",
        interviewConfirmation: "Perfect! I'm scheduling your interview for {datetime}. The employer will be notified and you'll receive a confirmation with the video meeting link.",
        default: "I'd be happy to help! You can ask me about pay, location, schedule, or benefits. Would you like to schedule an interview?"
      },
      es: {
        pay: "La tarifa de pago para este puesto es {pay}. Esto es competitivo para tu nivel de habilidad en el área de {location}.",
        location: "El trabajo está ubicado en {location}. El sitio de trabajo es fácilmente accesible en transporte público.",
        schedule: "El horario de trabajo es {availability}. Podemos discutir arreglos flexibles durante la entrevista.",
        benefits: "Los beneficios incluyen pago competitivo, horarios flexibles y oportunidades de desarrollo de habilidades.",
        interview: "¡Genial! Puedo ayudarte a programar una entrevista. ¿Cuándo te vendría mejor? Puedes sugerir:\n• Una fecha específica (ej: 'mañana a las 2pm', 'viernes por la tarde')\n• O puedo mostrarte horarios disponibles",
        interviewConfirmation: "¡Perfecto! Estoy programando tu entrevista para {datetime}. El empleador será notificado y recibirás una confirmación con el enlace de videollamada.",
        default: "¡Con gusto te ayudo! Puedes preguntarme sobre pago, ubicación, horario o beneficios. ¿Te gustaría programar una entrevista?"
      }
    };

    // Time slot suggestions
    this.timeSlots = {
      morning: ['9:00 AM', '10:00 AM', '11:00 AM'],
      afternoon: ['1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'],
      evening: ['5:00 PM', '6:00 PM']
    };
  }

  loadQAData() {
    return {
      worker_questions: {
        "how_do_i_find_work": {
          "questions": [
            "how do i find work",
            "how can i get a job",
            "where can i find jobs",
            "how to find work",
            "looking for jobs"
          ],
          "answer": "Finding work on Jale is easy! Just:\n1. Complete your profile with your skills and experience\n2. Browse available jobs in the 'Discover' tab\n3. Swipe right on jobs you're interested in\n4. Submit quotes when requested\n5. Chat with employers who match with you\n\nOur AI will automatically match you with jobs that fit your skills!",
          "category": "general"
        },
        "schedule_interview": {
          "questions": [
            "schedule interview",
            "book interview",
            "set up interview",
            "arrange interview",
            "schedule meeting",
            "can we meet",
            "when can we talk",
            "available for interview"
          ],
          "answer": "I can help you schedule an interview! I just need to know when you're available. You can say:\n• 'Tomorrow at 2pm'\n• 'Friday morning'\n• 'Next Monday at 10am'\n• Or ask me to suggest available times\n\nWhat works best for you?",
          "category": "scheduling"
        },
        "how_payment_works": {
          "questions": [
            "how do i get paid",
            "when do i receive payment",
            "payment method",
            "how does payment work",
            "when will i be paid"
          ],
          "answer": "Payment details are arranged directly between you and the employer. Typically:\n• Payment terms are discussed during the interview\n• Many employers pay weekly or upon job completion\n• Payment methods vary (check, direct deposit, cash)\n• Make sure to clarify payment terms before starting work\n\nAlways get payment terms in writing before beginning a job.",
          "category": "payment"
        },
        "interview_preparation": {
          "questions": [
            "how to prepare for interview",
            "interview tips",
            "what to bring to interview",
            "interview questions",
            "how to ace interview"
          ],
          "answer": "Interview preparation tips:\n• Review the job description carefully\n• Prepare examples of your past work\n• Bring copies of certifications/licenses\n• Dress professionally\n• Have questions ready about the job\n• Be on time (or early for video calls)\n• Test your video/audio before online interviews\n\nBe yourself and show enthusiasm for the opportunity!",
          "category": "interview"
        }
      },
      employer_questions: {
        "how_to_post_job": {
          "questions": [
            "how do i post a job",
            "create job listing",
            "how to hire workers",
            "post a job",
            "find workers"
          ],
          "answer": "Posting a job is simple:\n1. Click 'Post New Job' in your dashboard\n2. Fill in job details (title, description, location)\n3. Specify required skills and pay rate\n4. Set your availability/schedule\n5. Submit and wait for matches\n\nOur AI will automatically match you with qualified workers based on your requirements!",
          "category": "general"
        }
      },
      common_typos_mapping: {
        "constrution": "construction",
        "constuction": "construction",
        "electrcian": "electrician",
        "electrian": "electrician",
        "pluming": "plumbing",
        "plumer": "plumber",
        "carpintry": "carpentry",
        "weldr": "welder",
        "hw": "how",
        "wat": "what",
        "wen": "when",
        "ned": "need",
        "tomorow": "tomorrow",
        "tommorrow": "tomorrow",
        "intrview": "interview",
        "intervew": "interview",
        "shedule": "schedule",
        "scedule": "schedule"
      }
    };
  }

  /**
   * Main response method with scheduling capability
   */
  async getResponse(userMessage, jobDetails = null, language = 'en', matchId = null, currentUser = null) {
    if (!userMessage || typeof userMessage !== 'string') {
      return "I'm here to help! How can I assist you today?";
    }

    const cleanMessage = this.correctTypos(userMessage.trim());
    
    // Check if we're in scheduling mode
    if (this.schedulingState && this.schedulingState.matchId === matchId) {
      return await this.handleSchedulingFlow(cleanMessage, language, matchId, currentUser);
    }

    this.conversationHistory.push({ role: 'user', message: userMessage });
    
    // Check if user wants to schedule an interview
    if (this.detectSchedulingIntent(cleanMessage)) {
      this.schedulingState = {
        matchId: matchId,
        jobDetails: jobDetails,
        step: 'awaiting_time',
        language: language
      };
      
      const response = this.responses[language].interview;
      this.conversationHistory.push({ role: 'assistant', message: response });
      return response;
    }
    
    if (jobDetails) {
      const response = this.getJobResponse(cleanMessage, jobDetails, language);
      this.conversationHistory.push({ role: 'assistant', message: response });
      return response;
    }
    
    const userType = this.detectUserType(cleanMessage);
    this.userContext.type = userType;
    
    const match = this.findBestMatch(cleanMessage, userType);
    
    if (match && match.confidence > 0.35) {
      const response = match.response;
      this.conversationHistory.push({ role: 'assistant', message: response });
      return response;
    }
    
    const fallbackResponse = this.responses[language].default;
    this.conversationHistory.push({ role: 'assistant', message: fallbackResponse });
    return fallbackResponse;
  }

  /**
   * Detect if user wants to schedule an interview
   */
  detectSchedulingIntent(message) {
    const schedulingKeywords = [
      'schedule', 'book', 'arrange', 'set up', 'meeting', 'interview',
      'when can', 'available', 'talk', 'meet', 'call', 'video',
      'programar', 'agendar', 'reunión', 'entrevista', 'disponible',
      'yes', 'sure', 'okay', 'sounds good', 'sí', 'claro', 'ok'
    ];
    
    const lowerMessage = message.toLowerCase();
    return schedulingKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Handle the scheduling conversation flow
   */
  async handleSchedulingFlow(message, language, matchId, currentUser) {
    const lowerMessage = message.toLowerCase();
    
    // Check if user wants to cancel
    if (lowerMessage.includes('cancel') || lowerMessage.includes('nevermind') || 
        lowerMessage.includes('cancelar') || lowerMessage.includes('no importa')) {
      this.schedulingState = null;
      return language === 'es' 
        ? "Está bien, cancelé la programación de la entrevista. ¿Hay algo más en lo que pueda ayudarte?"
        : "Okay, I've cancelled the interview scheduling. Is there anything else I can help you with?";
    }

    // Check if user wants time suggestions
    if (lowerMessage.includes('suggest') || lowerMessage.includes('show') || 
        lowerMessage.includes('available') || lowerMessage.includes('options') ||
        lowerMessage.includes('sugerir') || lowerMessage.includes('mostrar') ||
        lowerMessage.includes('opciones')) {
      return this.suggestTimeSlots(language);
    }

    // Try to parse the time from user's message
    const parsedDateTime = this.parseDateTime(message);
    
    if (parsedDateTime) {
      // Schedule the interview
      const success = await this.scheduleInterview(matchId, parsedDateTime, currentUser);
      
      if (success) {
        this.schedulingState = null;
        const formattedDate = format(parsedDateTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
        const confirmation = this.responses[language].interviewConfirmation
          .replace('{datetime}', formattedDate);
        return confirmation;
      } else {
        return language === 'es'
          ? "Lo siento, hubo un error al programar la entrevista. Por favor, inténtalo de nuevo o contacta al empleador directamente."
          : "Sorry, there was an error scheduling the interview. Please try again or contact the employer directly.";
      }
    } else {
      // Couldn't understand the time
      return language === 'es'
        ? "No pude entender la fecha/hora. Por favor, intenta de nuevo con un formato como:\n• 'Mañana a las 2pm'\n• 'Viernes a las 10am'\n• 'Lunes 2 de diciembre a las 3pm'\n\nO di 'mostrar opciones' para ver horarios sugeridos."
        : "I couldn't understand the date/time. Please try again with a format like:\n• 'Tomorrow at 2pm'\n• 'Friday at 10am'\n• 'Monday December 2 at 3pm'\n\nOr say 'show options' to see suggested times.";
    }
  }

  /**
   * Parse date and time from natural language
   */
  parseDateTime(message) {
    const now = new Date();
    const lowerMessage = message.toLowerCase();

    // Helper function to extract time
    const extractTime = (msg) => {
      // Match patterns like "2pm", "10:30am", "14:00"
      const timeMatch = msg.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3]?.toLowerCase();

        if (meridiem === 'pm' && hours !== 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;
        
        return { hours, minutes };
      }
      return null;
    };

    // Handle relative dates
    if (lowerMessage.includes('tomorrow') || lowerMessage.includes('mañana')) {
      const tomorrow = addDays(now, 1);
      const time = extractTime(message);
      if (time) {
        tomorrow.setHours(time.hours, time.minutes, 0, 0);
        return tomorrow;
      }
    }

    if (lowerMessage.includes('today') || lowerMessage.includes('hoy')) {
      const today = new Date();
      const time = extractTime(message);
      if (time) {
        today.setHours(time.hours, time.minutes, 0, 0);
        return today;
      }
    }

    // Handle day of week (e.g., "Monday", "Friday")
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysEs = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    
    for (let i = 0; i < days.length; i++) {
      if (lowerMessage.includes(days[i]) || lowerMessage.includes(daysEs[i])) {
        const currentDay = now.getDay();
        let daysToAdd = i - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next week if day already passed
        
        const targetDate = addDays(now, daysToAdd);
        const time = extractTime(message);
        if (time) {
          targetDate.setHours(time.hours, time.minutes, 0, 0);
          return targetDate;
        }
      }
    }

    // Handle "next week", "next Monday", etc.
    if (lowerMessage.includes('next week') || lowerMessage.includes('próxima semana')) {
      const nextWeek = addDays(now, 7);
      const time = extractTime(message) || { hours: 10, minutes: 0 };
      nextWeek.setHours(time.hours, time.minutes, 0, 0);
      return nextWeek;
    }

    // Handle time of day (morning, afternoon, evening)
    if (lowerMessage.includes('morning') || lowerMessage.includes('mañana') && !lowerMessage.includes('tomorrow')) {
      const time = extractTime(message) || { hours: 10, minutes: 0 };
      const date = addDays(now, 1);
      date.setHours(time.hours, time.minutes, 0, 0);
      return date;
    }

    if (lowerMessage.includes('afternoon') || lowerMessage.includes('tarde')) {
      const time = extractTime(message) || { hours: 14, minutes: 0 };
      const date = addDays(now, 1);
      date.setHours(time.hours, time.minutes, 0, 0);
      return date;
    }

    if (lowerMessage.includes('evening') || lowerMessage.includes('noche')) {
      const time = extractTime(message) || { hours: 17, minutes: 0 };
      const date = addDays(now, 1);
      date.setHours(time.hours, time.minutes, 0, 0);
      return date;
    }

    // Try to extract just a time for today/tomorrow
    const time = extractTime(message);
    if (time) {
      const date = new Date();
      date.setHours(time.hours, time.minutes, 0, 0);
      
      // If time is in the past, assume tomorrow
      if (date < now) {
        date.setDate(date.getDate() + 1);
      }
      return date;
    }

    return null;
  }

  /**
   * Suggest available time slots
   */
  suggestTimeSlots(language) {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const dayAfter = addDays(today, 2);

    const formatDate = (date) => format(date, 'EEEE, MMM d');

    if (language === 'es') {
      return `Aquí hay algunos horarios sugeridos:\n\n` +
        `📅 ${formatDate(tomorrow)}:\n` +
        `• 9:00 AM\n• 2:00 PM\n• 4:00 PM\n\n` +
        `📅 ${formatDate(dayAfter)}:\n` +
        `• 10:00 AM\n• 1:00 PM\n• 3:00 PM\n\n` +
        `Solo dime cuál prefieres, o sugiere tu propio horario!`;
    }

    return `Here are some suggested time slots:\n\n` +
      `📅 ${formatDate(tomorrow)}:\n` +
      `• 9:00 AM\n• 2:00 PM\n• 4:00 PM\n\n` +
      `📅 ${formatDate(dayAfter)}:\n` +
      `• 10:00 AM\n• 1:00 PM\n• 3:00 PM\n\n` +
      `Just let me know which one works for you, or suggest your own time!`;
  }

  /**
   * Schedule the interview in the database
   */
  async scheduleInterview(matchId, dateTime, currentUser) {
    try {
      // Get the match details
      const match = await db.matches.get(matchId);
      if (!match) return false;

      // Get job and employer details
      const job = await db.jobs.get(match.jobId);
      const employer = await db.users.get(job.employerId);

      // Generate Jitsi room name
      const jitsiRoomName = generateJitsiRoomName(matchId);

      // Create interview record
      const interviewId = await db.interviews.add({
        matchId: matchId,
        scheduledAt: dateTime,
        duration: 30, // Default 30 minutes
        interviewType: 'video',
        jitsiRoomName: jitsiRoomName,
        status: 'scheduled',
        notes: 'Interview scheduled by AI assistant',
        createdAt: new Date()
      });

      // Update match status
      await db.matches.update(matchId, {
        status: 'interview_scheduled',
        lastActivity: new Date()
      });

      // Send system message
      await db.messages.add({
        matchId: matchId,
        senderId: 'system',
        message: `🎉 Interview scheduled!\n\n📅 Date: ${format(dateTime, 'EEEE, MMMM d, yyyy')}\n⏰ Time: ${format(dateTime, 'h:mm a')}\n⏱️ Duration: 30 minutes\n\nYou'll receive a video meeting link before the interview. Make sure to test your camera and microphone!`,
        messageType: 'interview_scheduled',
        timestamp: new Date()
      });

      // Create notifications for both parties
      await db.notifications.add({
        userId: currentUser.id,
        type: 'interview_scheduled',
        title: 'Interview Scheduled!',
        message: `Your interview for ${job.title} is scheduled for ${format(dateTime, 'PPP p')}`,
        read: false,
        timestamp: new Date()
      });

      await db.notifications.add({
        userId: employer.id,
        type: 'interview_scheduled',
        title: 'Interview Scheduled',
        message: `${currentUser.name} scheduled an interview for ${job.title} on ${format(dateTime, 'PPP p')}`,
        read: false,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error scheduling interview:', error);
      return false;
    }
  }

  /**
   * Correct common typos in user message
   */
  correctTypos(message) {
    let corrected = message;
    for (const [typo, correct] of Object.entries(this.typoMap)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      corrected = corrected.replace(regex, correct);
    }
    return corrected;
  }

  /**
   * Detect user type (worker or employer) from message
   */
  detectUserType(message) {
    const workerKeywords = ['looking for', 'need work', 'find job', 'busco trabajo', 'necesito trabajo'];
    const employerKeywords = ['need worker', 'hire', 'looking to hire', 'necesito trabajador', 'contratar'];
    
    const lowerMessage = message.toLowerCase();
    
    if (workerKeywords.some(kw => lowerMessage.includes(kw))) return 'worker';
    if (employerKeywords.some(kw => lowerMessage.includes(kw))) return 'employer';
    
    return this.userContext.type || 'worker';
  }

  /**
   * Find best matching Q&A response
   */
  findBestMatch(userMessage, userType) {
    const questions = userType === 'employer' 
      ? this.qaData.employer_questions 
      : this.qaData.worker_questions;
    
    let bestMatch = null;
    let highestScore = 0;
    
    for (const [key, data] of Object.entries(questions)) {
      for (const question of data.questions) {
        const score = this.similarityScore(userMessage.toLowerCase(), question.toLowerCase());
        if (score > highestScore) {
          highestScore = score;
          bestMatch = { response: data.answer, confidence: score };
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate similarity score between two strings
   */
  similarityScore(str1, str2) {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matchCount = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || (word1.length > 3 && word2.includes(word1))) {
          matchCount++;
          break;
        }
      }
    }
    
    return matchCount / Math.max(words1.length, words2.length);
  }

  /**
   * Calculate match score between worker profile and job requirements
   */
  calculateMatchScore(workerProfile, jobRequirements) {
    let score = 0;
    let totalFactors = 0;

    if (workerProfile.skillsOffered && jobRequirements.skillsNeeded) {
      const workerSkills = workerProfile.skillsOffered.map(s => s.toLowerCase());
      const jobSkills = jobRequirements.skillsNeeded.map(s => s.toLowerCase());
      
      let matchingSkills = 0;
      for (const jobSkill of jobSkills) {
        for (const workerSkill of workerSkills) {
          if (this.similarityScore(jobSkill, workerSkill) > 0.7) {
            matchingSkills++;
            break;
          }
        }
      }
      
      const skillScore = jobSkills.length > 0 ? (matchingSkills / jobSkills.length) * 50 : 0;
      score += skillScore;
      totalFactors += 50;
    }

    if (workerProfile.location && jobRequirements.location) {
      const locationMatch = this.similarityScore(
        workerProfile.location,
        jobRequirements.location
      );
      score += locationMatch * 25;
      totalFactors += 25;
    }

    if (workerProfile.pay && jobRequirements.pay) {
      const workerPay = this.extractPayNumber(workerProfile.pay);
      const jobPay = this.extractPayNumber(jobRequirements.pay);
      
      if (workerPay && jobPay) {
        const payRatio = Math.min(jobPay / workerPay, 1);
        score += payRatio * 15;
      } else {
        score += 10;
      }
      totalFactors += 15;
    }

    if (workerProfile.availability && jobRequirements.availability) {
      const availMatch = this.similarityScore(
        workerProfile.availability,
        jobRequirements.availability
      );
      score += availMatch * 10;
      totalFactors += 10;
    }

    return totalFactors > 0 ? Math.round((score / totalFactors) * 100) : 0;
  }

  /**
   * Extract numeric pay value from pay string
   */
  extractPayNumber(payString) {
    if (!payString) return 0;
    const numbers = payString.match(/\d+/g);
    return numbers ? parseInt(numbers[0]) : 0;
  }

  /**
   * Generate outreach message for job match
   */
  generateOutreachMessage(workerProfile, jobDetails, language = 'en') {
    const template = this.jobTemplates[language];
    const matchScore = this.calculateMatchScore(workerProfile, jobDetails);

    let message = template.greeting.replace('{name}', workerProfile.name || 'there');
    
    message += '\n\n' + template.jobDetails
      .replace('{location}', jobDetails.location || 'TBD')
      .replace('{pay}', jobDetails.pay || 'Competitive')
      .replace('{availability}', jobDetails.availability || 'Flexible')
      .replace('{skills}', (jobDetails.skillsNeeded || []).join(', '));
    
    message += '\n\n' + template.matchScore.replace('{score}', matchScore);
    message += '\n\n' + template.questions;

    return { message, matchScore };
  }

  /**
   * Get context-aware response for job-related questions
   */
  getJobResponse(question, jobDetails, language = 'en') {
    const responses = this.responses[language];
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('pay') || lowerQuestion.includes('salary') || lowerQuestion.includes('pago')) {
      return responses.pay
        .replace('{pay}', jobDetails.pay || 'Competitive')
        .replace('{location}', jobDetails.location || 'your area');
    }

    if (lowerQuestion.includes('location') || lowerQuestion.includes('where') || lowerQuestion.includes('ubicación')) {
      return responses.location.replace('{location}', jobDetails.location || 'TBD');
    }

    if (lowerQuestion.includes('schedule') || lowerQuestion.includes('hours') || lowerQuestion.includes('horario')) {
      return responses.schedule.replace('{availability}', jobDetails.availability || 'Flexible');
    }

    if (lowerQuestion.includes('benefit') || lowerQuestion.includes('beneficio')) {
      return responses.benefits;
    }

    if (this.detectSchedulingIntent(lowerQuestion)) {
      return responses.interview;
    }

    return responses.default;
  }

  /**
   * Generate interview reminder
   */
  generateInterviewReminder(interviewDetails, language = 'en') {
    const dateStr = interviewDetails.date || 'your scheduled date';
    const timeStr = interviewDetails.time || 'your scheduled time';
    
    if (language === 'es') {
      return `📅 Recordatorio: Tienes una entrevista programada para ${dateStr} a las ${timeStr}. ¡No olvides unirte a tiempo!`;
    }
    
    return `📅 Reminder: You have an interview scheduled for ${dateStr} at ${timeStr}. Don't forget to join on time!`;
  }

  clearHistory() {
    this.conversationHistory = [];
    this.userContext = {};
    this.schedulingState = null;
  }

  getHistory() {
    return this.conversationHistory;
  }
}

export const aiAssistant = new AIAssistant();
export default aiAssistant;