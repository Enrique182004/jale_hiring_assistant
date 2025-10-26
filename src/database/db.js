import Dexie from 'dexie';

// Initialize Dexie database
export const db = new Dexie('JaleDatabase');

// Define database schema
db.version(1).stores({
  users: '++id, email, userType, location, createdAt',
  jobs: '++id, employerId, status, createdAt',
  matches: '++id, jobId, workerId, status, createdAt',
  messages: '++id, matchId, senderId, timestamp',
  interviews: '++id, matchId, scheduledAt, status',
  quotes: '++id, jobId, workerId, status, createdAt',
  reviews: '++id, jobId, reviewerId, revieweeId, createdAt',
  jobImages: '++id, jobId, userId, imageType, createdAt',
  jobProgress: '++id, jobId, milestoneId, status, createdAt',
  notifications: '++id, userId, type, read, timestamp'
});

// Utility function to upload images (converts file to base64)
export const uploadImage = async (file, jobId, userId, imageType) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const imageId = await db.jobImages.add({
          jobId,
          userId,
          imageType,
          imageUrl: e.target.result,
          fileName: file.name,
          fileSize: file.size,
          caption: file.name,
          createdAt: new Date()
        });
        resolve(imageId);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Generate unique Jitsi room name
export const generateJitsiRoomName = (matchId) => {
  return `jale-interview-${matchId}-${Date.now()}`;
};

// Seed database with demo data
export const seedDatabase = async () => {
  try {
    // Check if database is already seeded
    const userCount = await db.users.count();
    if (userCount > 0) {
      console.log('Database already seeded');
      return;
    }

    console.log('Seeding database with demo data...');

    // Demo Users - Employers
    const employers = await db.users.bulkAdd([
      {
        email: 'employer@demo.com',
        password: 'demo123',
        name: 'Home Improvement Solutions',
        userType: 'employer',
        company: 'Home Improvement Solutions',
        location: 'El Paso, TX',
        pay: '$25-40/hr',
        availability: '7:00 AM - 6:00 PM',
        skillsNeeded: ['Plumbing', 'Electrical', 'Carpentry'],
        createdAt: new Date('2024-01-15')
      },
      {
        email: 'construction@demo.com',
        password: 'demo123',
        name: 'ABC Construction Co.',
        userType: 'employer',
        company: 'ABC Construction Co.',
        location: 'Las Cruces, NM',
        pay: '$30-45/hr',
        availability: '6:00 AM - 4:00 PM',
        skillsNeeded: ['Construction', 'Welding', 'Heavy Equipment'],
        createdAt: new Date('2024-01-20')
      },
      {
        email: 'property@demo.com',
        password: 'demo123',
        name: 'Sunset Property Management',
        userType: 'employer',
        company: 'Sunset Property Management',
        location: 'El Paso, TX',
        pay: '$20-35/hr',
        availability: 'Flexible',
        skillsNeeded: ['Maintenance', 'HVAC', 'Painting'],
        createdAt: new Date('2024-02-01')
      },
      {
        email: 'remodel@demo.com',
        password: 'demo123',
        name: 'Elite Remodeling',
        userType: 'employer',
        company: 'Elite Remodeling',
        location: 'Albuquerque, NM',
        pay: '$35-50/hr',
        availability: 'Monday-Friday',
        skillsNeeded: ['Carpentry', 'Drywall', 'Tile Work'],
        createdAt: new Date('2024-02-10')
      }
    ], { allKeys: true });

    // Demo Users - Workers
    const workers = await db.users.bulkAdd([
      {
        email: 'worker@demo.com',
        password: 'demo123',
        name: 'Carlos Martinez',
        userType: 'worker',
        location: 'El Paso, TX',
        pay: '$25-35/hr',
        availability: '7:00 AM - 5:00 PM',
        skillsOffered: ['Plumbing', 'General Maintenance', 'Repair Work'],
        experience: '8 years',
        certifications: ['Licensed Plumber', 'OSHA 10'],
        averageRating: 4.8,
        totalReviews: 24,
        createdAt: new Date('2024-01-10')
      },
      {
        email: 'juan@demo.com',
        password: 'demo123',
        name: 'Juan Rodriguez',
        userType: 'worker',
        location: 'El Paso, TX',
        pay: '$30-40/hr',
        availability: '6:00 AM - 6:00 PM',
        skillsOffered: ['Electrical', 'Solar Installation', 'Wiring'],
        experience: '12 years',
        certifications: ['Master Electrician', 'Solar PV Installer'],
        averageRating: 4.9,
        totalReviews: 31,
        createdAt: new Date('2024-01-12')
      },
      {
        email: 'maria@demo.com',
        password: 'demo123',
        name: 'Maria Gonzalez',
        userType: 'worker',
        location: 'Las Cruces, NM',
        pay: '$28-38/hr',
        availability: 'Flexible',
        skillsOffered: ['Carpentry', 'Cabinet Making', 'Finish Work'],
        experience: '10 years',
        certifications: ['Journeyman Carpenter'],
        averageRating: 4.7,
        totalReviews: 19,
        createdAt: new Date('2024-01-18')
      },
      {
        email: 'roberto@demo.com',
        password: 'demo123',
        name: 'Roberto Sanchez',
        userType: 'worker',
        location: 'El Paso, TX',
        pay: '$35-45/hr',
        availability: '7:00 AM - 4:00 PM',
        skillsOffered: ['Welding', 'Metal Fabrication', 'Construction'],
        experience: '15 years',
        certifications: ['Certified Welder (AWS)', 'Structural Welding'],
        averageRating: 5.0,
        totalReviews: 28,
        createdAt: new Date('2024-01-22')
      },
      {
        email: 'luis@demo.com',
        password: 'demo123',
        name: 'Luis Hernandez',
        userType: 'worker',
        location: 'El Paso, TX',
        pay: '$22-32/hr',
        availability: '8:00 AM - 5:00 PM',
        skillsOffered: ['HVAC', 'Air Conditioning', 'Heating Systems'],
        experience: '6 years',
        certifications: ['EPA 608 Universal', 'HVAC Excellence'],
        averageRating: 4.6,
        totalReviews: 15,
        createdAt: new Date('2024-01-25')
      },
      {
        email: 'miguel@demo.com',
        password: 'demo123',
        name: 'Miguel Torres',
        userType: 'worker',
        location: 'Las Cruces, NM',
        pay: '$20-30/hr',
        availability: 'Weekdays',
        skillsOffered: ['Painting', 'Drywall', 'Interior Finishing'],
        experience: '5 years',
        certifications: [],
        averageRating: 4.5,
        totalReviews: 12,
        createdAt: new Date('2024-02-01')
      },
      {
        email: 'jose@demo.com',
        password: 'demo123',
        name: 'Jose Ramirez',
        userType: 'worker',
        location: 'Albuquerque, NM',
        pay: '$25-35/hr',
        availability: 'Monday-Saturday',
        skillsOffered: ['Roofing', 'Construction', 'General Labor'],
        experience: '7 years',
        certifications: ['OSHA 30', 'Fall Protection'],
        averageRating: 4.7,
        totalReviews: 20,
        createdAt: new Date('2024-02-05')
      },
      {
        email: 'ana@demo.com',
        password: 'demo123',
        name: 'Ana Lopez',
        userType: 'worker',
        location: 'El Paso, TX',
        pay: '$30-40/hr',
        availability: 'Flexible',
        skillsOffered: ['Tile Work', 'Flooring', 'Bathroom Remodeling'],
        experience: '9 years',
        certifications: ['Tile Setter Certification'],
        averageRating: 4.9,
        totalReviews: 22,
        createdAt: new Date('2024-02-08')
      }
    ], { allKeys: true });

    // Demo Jobs
    const jobs = await db.jobs.bulkAdd([
      {
        employerId: employers[0],
        title: 'Kitchen Plumbing Renovation',
        description: 'Need experienced plumber for complete kitchen renovation. Includes installing new sink, dishwasher lines, and garbage disposal. Professional and reliable worker required.',
        location: 'El Paso, TX',
        pay: '$30-35/hr',
        availability: 'Monday-Friday, 8:00 AM - 4:00 PM',
        skillsNeeded: ['Plumbing', 'Pipe Fitting'],
        status: 'active',
        jobType: 'Short-term',
        estimatedDuration: '3-4 days',
        createdAt: new Date('2024-10-15')
      },
      {
        employerId: employers[0],
        title: 'Electrical Panel Upgrade',
        description: 'Looking for licensed electrician to upgrade main electrical panel from 100A to 200A. Must have experience with residential electrical work and proper licensing.',
        location: 'El Paso, TX',
        pay: '$40-45/hr',
        availability: 'Flexible scheduling',
        skillsNeeded: ['Electrical', 'Licensed Electrician'],
        status: 'active',
        jobType: 'Short-term',
        estimatedDuration: '2 days',
        createdAt: new Date('2024-10-18')
      },
      {
        employerId: employers[1],
        title: 'Commercial Building Construction',
        description: 'Large commercial construction project needs skilled welders and general laborers. Long-term project with potential for permanent position. Must pass drug test.',
        location: 'Las Cruces, NM',
        pay: '$32-42/hr',
        availability: '6:00 AM - 4:00 PM, Monday-Saturday',
        skillsNeeded: ['Welding', 'Construction', 'Heavy Equipment'],
        status: 'active',
        jobType: 'Long-term',
        estimatedDuration: '6 months',
        createdAt: new Date('2024-10-12')
      },
      {
        employerId: employers[2],
        title: 'Multi-Unit HVAC Maintenance',
        description: 'Property management company needs HVAC technician for ongoing maintenance of 50+ rental units. Regular work available, competitive pay.',
        location: 'El Paso, TX',
        pay: '$28-35/hr',
        availability: 'Flexible, on-call basis',
        skillsNeeded: ['HVAC', 'Air Conditioning', 'Maintenance'],
        status: 'active',
        jobType: 'Ongoing',
        estimatedDuration: 'Ongoing',
        createdAt: new Date('2024-10-20')
      },
      {
        employerId: employers[2],
        title: 'Apartment Complex Painting',
        description: 'Need professional painter for interior painting of multiple apartments. Must provide own equipment. Experience with rental properties preferred.',
        location: 'El Paso, TX',
        pay: '$22-28/hr',
        availability: 'Weekdays',
        skillsNeeded: ['Painting', 'Interior Work'],
        status: 'active',
        jobType: 'Short-term',
        estimatedDuration: '2-3 weeks',
        createdAt: new Date('2024-10-22')
      },
      {
        employerId: employers[3],
        title: 'Custom Cabinet Installation',
        description: 'High-end residential remodel requires skilled carpenter for custom cabinet installation. Attention to detail critical. Premium pay for quality work.',
        location: 'Albuquerque, NM',
        pay: '$38-48/hr',
        availability: 'Monday-Friday',
        skillsNeeded: ['Carpentry', 'Cabinet Making', 'Finish Work'],
        status: 'active',
        jobType: 'Short-term',
        estimatedDuration: '1-2 weeks',
        createdAt: new Date('2024-10-19')
      },
      {
        employerId: employers[3],
        title: 'Bathroom Tile Work',
        description: 'Looking for experienced tile setter for luxury bathroom remodel. Includes floor and wall tile, shower installation. Portfolio required.',
        location: 'Albuquerque, NM',
        pay: '$35-42/hr',
        availability: 'Flexible',
        skillsNeeded: ['Tile Work', 'Bathroom Remodeling'],
        status: 'active',
        jobType: 'Short-term',
        estimatedDuration: '5-7 days',
        createdAt: new Date('2024-10-21')
      },
      {
        employerId: employers[0],
        title: 'Deck Construction',
        description: 'Build outdoor deck (20x30) with composite materials. Must have carpentry experience and ability to work with plans.',
        location: 'El Paso, TX',
        pay: '$30-38/hr',
        availability: 'Weekends or evenings',
        skillsNeeded: ['Carpentry', 'Construction'],
        status: 'active',
        jobType: 'Short-term',
        estimatedDuration: '1 week',
        createdAt: new Date('2024-10-23')
      }
    ], { allKeys: true });

    // Demo Matches
    const matches = await db.matches.bulkAdd([
      {
        jobId: jobs[0],
        workerId: workers[0],
        status: 'pending',
        matchScore: 92,
        createdAt: new Date('2024-10-16')
      },
      {
        jobId: jobs[0],
        workerId: workers[2],
        status: 'rejected',
        matchScore: 65,
        createdAt: new Date('2024-10-16')
      },
      {
        jobId: jobs[1],
        workerId: workers[1],
        status: 'accepted',
        matchScore: 95,
        createdAt: new Date('2024-10-19')
      },
      {
        jobId: jobs[2],
        workerId: workers[3],
        status: 'hired',
        matchScore: 88,
        createdAt: new Date('2024-10-13')
      },
      {
        jobId: jobs[3],
        workerId: workers[4],
        status: 'pending',
        matchScore: 90,
        createdAt: new Date('2024-10-21')
      },
      {
        jobId: jobs[4],
        workerId: workers[5],
        status: 'quote_submitted',
        matchScore: 85,
        createdAt: new Date('2024-10-23')
      },
      {
        jobId: jobs[5],
        workerId: workers[2],
        status: 'pending',
        matchScore: 94,
        createdAt: new Date('2024-10-20')
      },
      {
        jobId: jobs[6],
        workerId: workers[7],
        status: 'interview_scheduled',
        matchScore: 91,
        createdAt: new Date('2024-10-22')
      }
    ], { allKeys: true });

    // Demo Quotes
    await db.quotes.bulkAdd([
      {
        jobId: jobs[0],
        workerId: workers[0],
        amount: 1250.00,
        materialsCost: 450.00,
        laborCost: 800.00,
        estimatedDuration: '3 days',
        description: 'Complete kitchen plumbing renovation including new fixtures, disposal installation, and all necessary connections. Materials include high-quality PVC and copper pipes, shutoff valves, and mounting hardware.',
        status: 'pending',
        createdAt: new Date('2024-10-16')
      },
      {
        jobId: jobs[1],
        workerId: workers[1],
        amount: 2800.00,
        materialsCost: 1200.00,
        laborCost: 1600.00,
        estimatedDuration: '2 days',
        description: 'Electrical panel upgrade to 200A service. Includes new panel, breakers, grounding, and all labor. Will obtain necessary permits and schedule inspection.',
        status: 'accepted',
        createdAt: new Date('2024-10-19')
      },
      {
        jobId: jobs[4],
        workerId: workers[5],
        amount: 3200.00,
        materialsCost: 1500.00,
        laborCost: 1700.00,
        estimatedDuration: '2 weeks',
        description: 'Interior painting of 8 apartments. Includes all prep work, two coats of premium paint, and cleanup. Paint colors per spec sheet.',
        status: 'pending',
        createdAt: new Date('2024-10-23')
      },
      {
        jobId: jobs[6],
        workerId: workers[7],
        amount: 4500.00,
        materialsCost: 2200.00,
        laborCost: 2300.00,
        estimatedDuration: '6 days',
        description: 'Luxury bathroom tile installation. Premium porcelain tile for floors and walls, custom shower pan, and professional waterproofing. Includes all materials and expert installation.',
        status: 'pending',
        createdAt: new Date('2024-10-22')
      }
    ]);

    // Demo Reviews
    await db.reviews.bulkAdd([
      {
        jobId: jobs[2],
        reviewerId: employers[1],
        revieweeId: workers[3],
        rating: 5,
        comment: 'Roberto is an excellent welder! His work quality is outstanding and he completed the job ahead of schedule. Very professional and would definitely hire again.',
        categories: {
          quality: 5,
          communication: 5,
          timeliness: 5,
          professionalism: 5
        },
        createdAt: new Date('2024-10-14')
      },
      {
        jobId: jobs[0],
        reviewerId: workers[0],
        revieweeId: employers[0],
        rating: 5,
        comment: 'Great employer to work with! Clear communication, reasonable expectations, and paid on time. The job site was well organized and all materials were ready.',
        categories: {
          quality: 5,
          communication: 5,
          timeliness: 5,
          professionalism: 5
        },
        createdAt: new Date('2024-10-17')
      },
      {
        jobId: jobs[1],
        reviewerId: workers[1],
        revieweeId: employers[0],
        rating: 5,
        comment: 'Excellent project! Homeowner was very accommodating and understanding. Payment was prompt and the work environment was safe.',
        categories: {
          quality: 5,
          communication: 5,
          timeliness: 5,
          professionalism: 5
        },
        createdAt: new Date('2024-10-20')
      }
    ]);

    // Demo Interviews
    await db.interviews.bulkAdd([
      {
        matchId: matches[2],
        scheduledAt: new Date('2024-10-28T14:00:00'),
        duration: 30,
        notes: 'Discuss electrical panel upgrade project details and timeline',
        status: 'scheduled',
        jitsiRoomName: generateJitsiRoomName(matches[2]),
        createdAt: new Date('2024-10-19')
      },
      {
        matchId: matches[7],
        scheduledAt: new Date('2024-10-27T10:00:00'),
        duration: 45,
        notes: 'Review tile work portfolio and discuss bathroom remodel project',
        status: 'scheduled',
        jitsiRoomName: generateJitsiRoomName(matches[7]),
        createdAt: new Date('2024-10-22')
      }
    ]);

    // Demo Messages
    await db.messages.bulkAdd([
      {
        matchId: matches[2],
        senderId: employers[0],
        message: 'Hi Juan! I reviewed your profile and I\'m impressed with your electrical experience. Would you be available for a video interview this week?',
        messageType: 'text',
        timestamp: new Date('2024-10-19T09:00:00')
      },
      {
        matchId: matches[2],
        senderId: workers[1],
        message: 'Hello! Thank you for reaching out. Yes, I would be happy to discuss the electrical panel upgrade. I have availability this week.',
        messageType: 'text',
        timestamp: new Date('2024-10-19T09:30:00')
      },
      {
        matchId: matches[2],
        senderId: 'system',
        message: 'Interview scheduled for October 28, 2024 at 2:00 PM',
        messageType: 'interview_scheduled',
        timestamp: new Date('2024-10-19T10:00:00')
      },
      {
        matchId: matches[7],
        senderId: employers[3],
        message: 'Hi Ana! Your tile work portfolio looks excellent. We have a luxury bathroom remodel project. Would you like to schedule an interview to discuss details?',
        messageType: 'text',
        timestamp: new Date('2024-10-22T11:00:00')
      },
      {
        matchId: matches[7],
        senderId: workers[7],
        message: 'Thank you! I would love to learn more about the project. I\'m available most days this week.',
        messageType: 'text',
        timestamp: new Date('2024-10-22T11:20:00')
      }
    ]);

    // Demo Notifications
    await db.notifications.bulkAdd([
      {
        userId: employers[0],
        type: 'new_quote',
        title: 'New Quote Received',
        message: 'Carlos Martinez submitted a quote of $1,250.00 for Kitchen Plumbing Renovation',
        amount: 1250.00,
        read: false,
        timestamp: new Date('2024-10-16T10:30:00')
      },
      {
        userId: employers[0],
        type: 'message_received',
        title: 'New Message',
        message: 'Juan Rodriguez replied to your message',
        read: false,
        timestamp: new Date('2024-10-19T09:30:00')
      },
      {
        userId: workers[1],
        type: 'interview_scheduled',
        title: 'Interview Scheduled',
        message: 'Your interview for Electrical Panel Upgrade has been scheduled for Oct 28 at 2:00 PM',
        read: false,
        timestamp: new Date('2024-10-19T10:00:00')
      },
      {
        userId: workers[0],
        type: 'new_match',
        title: 'New Job Match',
        message: 'You have a new job match: Kitchen Plumbing Renovation (92% match)',
        read: false,
        timestamp: new Date('2024-10-16T08:00:00')
      },
      {
        userId: workers[3],
        type: 'worker_accepted',
        title: 'Congratulations!',
        message: 'You have been hired for Commercial Building Construction',
        read: true,
        timestamp: new Date('2024-10-13T15:00:00')
      }
    ]);

    console.log('Database seeded successfully with demo data!');
    console.log(`- ${employers.length} employers created`);
    console.log(`- ${workers.length} workers created`);
    console.log(`- ${jobs.length} jobs created`);
    console.log(`- ${matches.length} matches created`);

  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

export default db;