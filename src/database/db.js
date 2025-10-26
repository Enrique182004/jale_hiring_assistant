import Dexie from 'dexie';

export class JaleDatabase extends Dexie {
  constructor() {
    super('JaleHiringDB');
    
    // Version 3 with new tables for enhanced features
    this.version(3).stores({
      // Existing tables
      users: '++id, email, userType, name, location, createdAt',
      jobs: '++id, employerId, title, location, status, createdAt',
      matches: '++id, jobId, workerId, status, matchScore, createdAt, notificationRead',
      interviews: '++id, matchId, scheduledAt, status, jitsiRoomName, createdAt',
      messages: '++id, matchId, senderId, timestamp, read',
      chatHistory: '++id, matchId, userId, timestamp',
      jobImages: '++id, jobId, userId, imageType, imageUrl, caption, createdAt',
      quotes: '++id, jobId, workerId, amount, description, status, createdAt',
      reviews: '++id, jobId, reviewerId, revieweeId, rating, comment, createdAt',
      
      // New tables for enhanced features
      jobProgress: '++id, jobId, milestoneId, status, photos, notes, completedDate, approvedBy, createdAt',
      payments: '++id, jobId, workerId, employerId, amount, status, type, method, createdAt',
      escrow: '++id, paymentId, amount, status, releaseCondition, releaseDate, createdAt',
      transactions: '++id, userId, amount, type, status, reference, createdAt',
      portfolioProjects: '++id, workerId, title, description, beforePhotos, afterPhotos, completedDate, category, tags',
      documents: '++id, userId, jobId, type, fileName, fileUrl, uploadDate, tags',
      notifications: '++id, userId, type, title, message, read, link, createdAt',
      workerFavorites: '++id, employerId, workerId, createdAt',
      searchHistory: '++id, userId, query, filters, timestamp'
    });

    this.users = this.table('users');
    this.jobs = this.table('jobs');
    this.matches = this.table('matches');
    this.interviews = this.table('interviews');
    this.messages = this.table('messages');
    this.chatHistory = this.table('chatHistory');
    this.jobImages = this.table('jobImages');
    this.quotes = this.table('quotes');
    this.reviews = this.table('reviews');
    this.jobProgress = this.table('jobProgress');
    this.payments = this.table('payments');
    this.escrow = this.table('escrow');
    this.transactions = this.table('transactions');
    this.portfolioProjects = this.table('portfolioProjects');
    this.documents = this.table('documents');
    this.notifications = this.table('notifications');
    this.workerFavorites = this.table('workerFavorites');
    this.searchHistory = this.table('searchHistory');
  }
}

export const db = new JaleDatabase();

// Seed some demo data
export const seedDatabase = async () => {
  const userCount = await db.users.count();
  
  if (userCount === 0) {
    console.log('Seeding database with demo data...');
    
    // Add demo employer
    const employerId = await db.users.add({
      email: 'employer@demo.com',
      password: 'demo123',
      userType: 'employer',
      name: 'ABC Construction Co.',
      location: 'Los Angeles, CA',
      company: 'ABC Construction',
      skillsNeeded: ['Plumbing', 'Electrical', 'Carpentry'],
      availability: '8:00 AM - 5:00 PM',
      pay: '$25-35/hr',
      createdAt: new Date()
    });

    // Add demo workers
    const workerId1 = await db.users.add({
      email: 'worker@demo.com',
      password: 'demo123',
      userType: 'worker',
      name: 'John Martinez',
      location: 'Los Angeles, CA',
      skillsOffered: ['Plumbing', 'Electrical'],
      availability: '7:00 AM - 6:00 PM',
      pay: '$30/hr',
      createdAt: new Date()
    });

    const workerId2 = await db.users.add({
      email: 'worker2@demo.com',
      password: 'demo123',
      userType: 'worker',
      name: 'Maria Rodriguez',
      location: 'Los Angeles, CA',
      skillsOffered: ['Carpentry', 'Painting'],
      availability: '8:00 AM - 5:00 PM',
      pay: '$28/hr',
      createdAt: new Date()
    });

    const workerId3 = await db.users.add({
      email: 'worker3@demo.com',
      password: 'demo123',
      userType: 'worker',
      name: 'David Chen',
      location: 'Los Angeles, CA',
      skillsOffered: ['Electrical', 'HVAC'],
      availability: '9:00 AM - 6:00 PM',
      pay: '$35/hr',
      createdAt: new Date()
    });

    // Add demo jobs
    const jobId1 = await db.jobs.add({
      employerId: employerId,
      title: 'Residential Plumbing Repair',
      description: 'Fix leaking pipes in kitchen and bathroom. Need experienced plumber.',
      location: 'Los Angeles, CA',
      skillsNeeded: ['Plumbing'],
      availability: '9:00 AM - 5:00 PM',
      pay: '$30-35/hr',
      status: 'active',
      createdAt: new Date()
    });

    const jobId2 = await db.jobs.add({
      employerId: employerId,
      title: 'Kitchen Remodel - Electrical Work',
      description: 'Rewire kitchen for new appliances and lighting',
      location: 'Los Angeles, CA',
      skillsNeeded: ['Electrical'],
      availability: 'Flexible',
      pay: '$35-40/hr',
      status: 'active',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    });

    // Add demo job images
    await db.jobImages.add({
      jobId: jobId1,
      userId: employerId,
      imageType: 'damage',
      imageUrl: 'https://via.placeholder.com/400x300?text=Leaking+Pipe',
      caption: 'Leaking pipe under kitchen sink',
      createdAt: new Date()
    });

    await db.jobImages.add({
      jobId: jobId1,
      userId: employerId,
      imageType: 'damage',
      imageUrl: 'https://via.placeholder.com/400x300?text=Water+Damage',
      caption: 'Water damage on cabinet floor',
      createdAt: new Date()
    });

    // Add demo matches
    const matchId1 = await db.matches.add({
      jobId: jobId1,
      workerId: workerId1,
      status: 'accepted',
      matchScore: 95,
      notificationRead: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    });

    await db.matches.add({
      jobId: jobId2,
      workerId: workerId3,
      status: 'pending',
      matchScore: 88,
      notificationRead: false,
      createdAt: new Date()
    });

    // Add demo quotes
    await db.quotes.add({
      jobId: jobId1,
      workerId: workerId1,
      amount: 450.00,
      materialsCost: 150.00,
      laborCost: 300.00,
      estimatedDuration: '4-5 hours',
      description: 'Will replace damaged pipes and fix the leak. Includes all materials and labor.',
      status: 'accepted',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    });

    await db.quotes.add({
      jobId: jobId2,
      workerId: workerId3,
      amount: 850.00,
      materialsCost: 300.00,
      laborCost: 550.00,
      estimatedDuration: '2 days',
      description: 'Complete kitchen electrical rewiring including new circuit breaker panel',
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    });

    // Add demo review
    await db.reviews.add({
      jobId: jobId1,
      reviewerId: employerId,
      revieweeId: workerId1,
      rating: 5,
      comment: 'Excellent work! Very professional and completed the job on time. Would definitely hire again.',
      categories: {
        quality: 5,
        communication: 5,
        timeliness: 5,
        professionalism: 5
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
    });

    // Add demo messages
    await db.messages.add({
      matchId: matchId1,
      senderId: 'ai',
      message: "Hi John! I'm Jale's AI assistant. I found a great opportunity that matches your skills!\n\n📍 Location: Los Angeles, CA\n💰 Pay: $30-35/hr\n🕐 Hours: 9:00 AM - 5:00 PM\n📋 Skills needed: Plumbing\n\nBased on your profile, you're a 95% match for this role!\n\nWould you like to know more about this position?",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true
    });

    await db.messages.add({
      matchId: matchId1,
      senderId: workerId1,
      message: "Yes, I'm interested! Can you tell me more about the scope of work?",
      timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000),
      read: true
    });

    await db.messages.add({
      matchId: matchId1,
      senderId: employerId,
      message: "Great! We have a leaking pipe under the kitchen sink that needs repair. There's also some water damage to the cabinet that might need attention. When would you be available?",
      timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000),
      read: true
    });

    // Add demo job progress
    await db.jobProgress.add({
      jobId: jobId1,
      milestoneId: 1,
      status: 'completed',
      photos: ['https://via.placeholder.com/400x300?text=Work+Started'],
      notes: 'Started work at 9 AM. Assessed the damage and created a repair plan.',
      completedDate: new Date(Date.now() - 5 * 60 * 60 * 1000),
      approvedBy: employerId,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
    });

    await db.jobProgress.add({
      jobId: jobId1,
      milestoneId: 2,
      status: 'completed',
      photos: ['https://via.placeholder.com/400x300?text=Materials'],
      notes: 'Purchased all necessary materials from local supplier',
      completedDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
      approvedBy: employerId,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    });

    // Add demo portfolio project
    await db.portfolioProjects.add({
      workerId: workerId1,
      title: 'Commercial Building Plumbing Overhaul',
      description: 'Complete plumbing system replacement for a 3-story office building',
      beforePhotos: ['https://via.placeholder.com/400x300?text=Before+1', 'https://via.placeholder.com/400x300?text=Before+2'],
      afterPhotos: ['https://via.placeholder.com/400x300?text=After+1', 'https://via.placeholder.com/400x300?text=After+2'],
      completedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      category: 'Plumbing',
      tags: ['commercial', 'plumbing', 'renovation']
    });

    console.log('Database seeded successfully!');
  }
};

// Helper function to generate unique Jitsi room name
export const generateJitsiRoomName = (matchId) => {
  const timestamp = Date.now();
  return `JaleInterview${matchId}${timestamp}`;
};

// Helper function to upload image (would connect to actual storage in production)
export const uploadImage = async (file, jobId, userId, imageType) => {
  // In production, this would upload to cloud storage (S3, Firebase, etc.)
  // For now, we'll use a data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imageId = await db.jobImages.add({
          jobId,
          userId,
          imageType, // 'setup', 'during', 'completed', 'damage', 'issue', 'progress', 'initial'
          imageUrl: e.target.result,
          caption: file.name,
          createdAt: new Date()
        });
        resolve(imageId);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper function to create notification
export const createNotification = async (userId, type, title, message, link = null) => {
  await db.notifications.add({
    userId,
    type, // 'new_quote', 'interview_scheduled', 'message_received', 'worker_accepted', 'payment_required', etc.
    title,
    message,
    read: false,
    link,
    createdAt: new Date()
  });
};

// Helper function to mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  await db.notifications.update(notificationId, { read: true });
};

// Helper function to get unread notifications count
export const getUnreadNotificationsCount = async (userId) => {
  const count = await db.notifications
    .where({ userId, read: false })
    .count();
  return count;
};

// Helper function to add worker to favorites
export const addWorkerToFavorites = async (employerId, workerId) => {
  const existing = await db.workerFavorites
    .where({ employerId, workerId })
    .first();
  
  if (!existing) {
    await db.workerFavorites.add({
      employerId,
      workerId,
      createdAt: new Date()
    });
  }
};

// Helper function to remove worker from favorites
export const removeWorkerFromFavorites = async (employerId, workerId) => {
  const favorite = await db.workerFavorites
    .where({ employerId, workerId })
    .first();
  
  if (favorite) {
    await db.workerFavorites.delete(favorite.id);
  }
};

// Helper function to check if worker is favorited
export const isWorkerFavorited = async (employerId, workerId) => {
  const favorite = await db.workerFavorites
    .where({ employerId, workerId })
    .first();
  return !!favorite;
};

// Export all helper functions
export default {
  db,
  generateJitsiRoomName,
  uploadImage,
  createNotification,
  markNotificationAsRead,
  getUnreadNotificationsCount,
  addWorkerToFavorites,
  removeWorkerFromFavorites,
  isWorkerFavorited,
  seedDatabase
};