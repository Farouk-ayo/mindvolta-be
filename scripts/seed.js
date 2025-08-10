const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed therapists
  await prisma.therapist.createMany({
    data: [
      {
        name: 'Dr. Saheed Akinola',
        email: 'saheed.akinola@psychhospital.ng',
        phone: '+234-809-123-4567',
        address: 'Psychiatric Hospital, Aro, Abeokuta, Ogun State, Nigeria',
        specialties: ['Anxiety Disorders', 'Depression', 'Addiction Therapy', 'Youth Mental Health'],
        isActive: true
      },
      {
        name: 'Dr. Fatima Mohammed',
        email: 'fatima.mohammed@mindcare.ng',
        phone: '+234-805-987-6543',
        address: 'MindCare Clinic, Victoria Island, Lagos, Nigeria',
        specialties: ['PTSD', 'Bipolar Disorder', 'Family Therapy'],
        isActive: true
      }
    ]
  });

  // Seed music tracks
  await prisma.musicTrack.createMany({
    data: [
      {
        title: 'My Umbrella',
        artist: 'David Shaw',
        duration: 267,
        genre: 'Ambient',
        moodTags: ['calm', 'peaceful', 'relaxing'],
        audioUrl: 'https://example.com/my-umbrella.mp3',
        imageUrl: 'https://example.com/umbrella-cover.jpg'
      },
      {
        title: 'Ocean Waves',
        artist: 'Nature Sounds',
        duration: 300,
        genre: 'Nature',
        moodTags: ['calm', 'peaceful', 'sleep'],
        audioUrl: 'https://example.com/ocean-waves.mp3',
        imageUrl: 'https://example.com/ocean-cover.jpg'
      },
      {
        title: 'Morning Motivation',
        artist: 'Upbeat Collective',
        duration: 180,
        genre: 'Motivational',
        moodTags: ['energetic', 'uplifting', 'happy'],
        audioUrl: 'https://example.com/morning-motivation.mp3',
        imageUrl: 'https://example.com/motivation-cover.jpg'
      }
    ]
  });

  // Seed thoughts of the day
  await prisma.thoughtOfTheDay.createMany({
    data: [
      {
        title: 'Who said you can\'t do it?',
        content: 'It is better to conquer yourself than to win a thousand battles. Then the victory is yours. It cannot be taken from you, not by angels or by demons, heaven or hell.',
        author: 'Buddha',
        category: 'motivation'
      },
      {
        title: 'Progress over perfection',
        content: 'You don\'t have to be perfect. You just have to be better than you were yesterday. Small steps lead to big changes.',
        category: 'motivation'
      },
      {
        title: 'Breathe and let go',
        content: 'Sometimes the most productive thing you can do is relax. Take a deep breath, let go of the stress, and trust the process.',
        category: 'mindfulness'
      },
      {
        title: 'You are stronger than you think',
        content: 'You have survived 100% of your difficult days so far. You are stronger and more resilient than you give yourself credit for.',
        category: 'encouragement'
      }
    ]
  });

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });