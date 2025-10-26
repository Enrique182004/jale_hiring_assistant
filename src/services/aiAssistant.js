// AI Chatbot Service - Simulates AI responses for job matching and Q&A
export class AIAssistant {
  constructor() {
    this.jobTemplates = {
      en: {
        greeting: "Hi {name}! I'm Jale's AI assistant. I found a great opportunity that matches your skills!",
        jobDetails: "📍 Location: {location}\n💰 Pay: {pay}\n🕐 Hours: {availability}\n📋 Skills needed: {skills}",
        questions: "Would you like to know more about this position?",
        matchScore: "Based on your profile, you're a {score}% match for this role!"
      },
      es: {
        greeting: "¡Hola {name}! Soy el asistente de IA de Jale. ¡Encontré una gran oportunidad que coincide con tus habilidades!",
        jobDetails: "📍 Ubicación: {location}\n💰 Pago: {pay}\n🕐 Horario: {availability}\n📋 Habilidades necesarias: {skills}",
        questions: "¿Te gustaría saber más sobre este puesto?",
        matchScore: "¡Según tu perfil, eres un {score}% compatible para este trabajo!"
      }
    };

    this.responses = {
      en: {
        pay: "The pay rate for this position is {pay}. This is competitive for your skill level in the {location} area.",
        location: "The job is located at {location}. The worksite is easily accessible by public transportation.",
        schedule: "The work schedule is {availability}. We can discuss flexible arrangements during the interview.",
        benefits: "Benefits include competitive pay, flexible scheduling, and opportunities for skill development.",
        interview: "Great! I can schedule an interview for you. When would you be available?",
        default: "I'd be happy to help! You can ask me about pay, location, schedule, or benefits. Would you like to schedule an interview?"
      },
      es: {
        pay: "La tarifa de pago para este puesto es {pay}. Esto es competitivo para tu nivel de habilidad en el área de {location}.",
        location: "El trabajo está ubicado en {location}. El sitio de trabajo es fácilmente accesible en transporte público.",
        schedule: "El horario de trabajo es {availability}. Podemos discutir arreglos flexibles durante la entrevista.",
        benefits: "Los beneficios incluyen pago competitivo, horarios flexibles y oportunidades de desarrollo de habilidades.",
        interview: "¡Genial! Puedo programar una entrevista para ti. ¿Cuándo estarías disponible?",
        default: "¡Con gusto te ayudo! Puedes preguntarme sobre pago, ubicación, horario o beneficios. ¿Te gustaría programar una entrevista?"
      }
    };
  }

  calculateMatchScore(workerProfile, jobRequirements) {
    let score = 0;
    let totalFactors = 0;

    // Skills matching (50% weight)
    if (workerProfile.skillsOffered && jobRequirements.skillsNeeded) {
      const workerSkills = workerProfile.skillsOffered.map(s => s.toLowerCase());
      const jobSkills = jobRequirements.skillsNeeded.map(s => s.toLowerCase());
      const matchingSkills = workerSkills.filter(skill => 
        jobSkills.some(jobSkill => jobSkill.includes(skill) || skill.includes(jobSkill))
      );
      const skillScore = (matchingSkills.length / jobSkills.length) * 50;
      score += skillScore;
      totalFactors += 50;
    }

    // Location proximity (25% weight)
    if (workerProfile.location && jobRequirements.location) {
      const locationMatch = workerProfile.location.toLowerCase().includes(
        jobRequirements.location.toLowerCase().split(',')[0]
      );
      score += locationMatch ? 25 : 10;
      totalFactors += 25;
    }

    // Pay expectations (15% weight)
    if (workerProfile.pay && jobRequirements.pay) {
      const workerPay = this.extractPayRate(workerProfile.pay);
      const jobPay = this.extractPayRate(jobRequirements.pay);
      if (jobPay >= workerPay * 0.9) {
        score += 15;
      } else if (jobPay >= workerPay * 0.8) {
        score += 10;
      } else {
        score += 5;
      }
      totalFactors += 15;
    }

    // Availability overlap (10% weight)
    score += 10; // Simplified - assume some overlap
    totalFactors += 10;

    return Math.round((score / totalFactors) * 100);
  }

  extractPayRate(payString) {
    const numbers = payString.match(/\d+/g);
    if (numbers) {
      return parseInt(numbers[0]);
    }
    return 0;
  }

  generateOutreachMessage(workerProfile, jobDetails, language = 'en') {
    const template = this.jobTemplates[language];
    const matchScore = this.calculateMatchScore(workerProfile, jobDetails);

    let message = template.greeting.replace('{name}', workerProfile.name);
    message += '\n\n' + template.jobDetails
      .replace('{location}', jobDetails.location)
      .replace('{pay}', jobDetails.pay)
      .replace('{availability}', jobDetails.availability)
      .replace('{skills}', jobDetails.skillsNeeded.join(', '));
    
    message += '\n\n' + template.matchScore.replace('{score}', matchScore);
    message += '\n\n' + template.questions;

    return { message, matchScore };
  }

  getResponse(question, jobDetails, language = 'en') {
    const responses = this.responses[language];
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('pay') || lowerQuestion.includes('pago') || lowerQuestion.includes('salary')) {
      return responses.pay
        .replace('{pay}', jobDetails.pay)
        .replace('{location}', jobDetails.location);
    }

    if (lowerQuestion.includes('location') || lowerQuestion.includes('ubicación') || lowerQuestion.includes('where')) {
      return responses.location.replace('{location}', jobDetails.location);
    }

    if (lowerQuestion.includes('schedule') || lowerQuestion.includes('horario') || lowerQuestion.includes('hours') || lowerQuestion.includes('when')) {
      return responses.schedule.replace('{availability}', jobDetails.availability);
    }

    if (lowerQuestion.includes('benefit') || lowerQuestion.includes('beneficio')) {
      return responses.benefits;
    }

    if (lowerQuestion.includes('interview') || lowerQuestion.includes('entrevista')) {
      return responses.interview;
    }

    return responses.default;
  }

  generateInterviewReminder(interviewDetails, language = 'en') {
    if (language === 'es') {
      return `🔔 Recordatorio: Tienes una entrevista programada para ${interviewDetails.date} a las ${interviewDetails.time}. ¡No olvides unirte a tiempo!`;
    }
    return `🔔 Reminder: You have an interview scheduled for ${interviewDetails.date} at ${interviewDetails.time}. Don't forget to join on time!`;
  }
}

export const aiAssistant = new AIAssistant();