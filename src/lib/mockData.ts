// Mock data generator for LeadScout AI MVP
// This will be replaced with real API data (Outscraper/SerpAPI) later

const businessTypes = [
  'plumber', 'roofer', 'dentist', 'hvac', 'electrician', 'landscaper', 
  'auto repair', 'real estate agent', 'lawyer', 'accountant'
];

const firstNames = [
  'John', 'Sarah', 'Mike', 'Emily', 'David', 'Lisa', 'James', 'Jennifer',
  'Robert', 'Maria', 'William', 'Patricia', 'Richard', 'Linda', 'Thomas'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez'
];

const streetNames = [
  'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine St', 'Elm Rd',
  'Washington Blvd', 'Lincoln Ave', 'Park Place', 'Highland Dr'
];

// Reviews with communication issues (for AI to analyze)
const badReviews = [
  "Called three times and never got a callback. Terrible communication!",
  "Left multiple voicemails over two weeks. No response whatsoever.",
  "Scheduled an appointment but they never showed up. No call, no text, nothing.",
  "Tried reaching them for a week. Phone goes straight to voicemail.",
  "They said they'd call back with a quote. That was 3 weeks ago.",
  "Impossible to get in touch with. Emails go unanswered, calls aren't returned.",
  "Missed our scheduled appointment twice. Very unprofessional.",
  "Waited 2 hours past appointment time. No communication about the delay.",
  "Asked for an estimate a month ago. Still waiting for a response.",
  "Great work when they finally showed up, but getting them to respond is a nightmare.",
  "Communication is awful. Had to track them down just to get updates on my project.",
  "They don't answer phones or return calls. Very frustrating experience.",
  "Appointment was canceled last minute with no explanation. Never heard back.",
  "Sent 5 emails over 2 weeks. Zero response. Taking my business elsewhere.",
  "Nice people but absolutely terrible at returning phone calls.",
];

// Neutral/good reviews
const goodReviews = [
  "Excellent service! They arrived on time and did a great job.",
  "Very professional team. Would highly recommend to anyone.",
  "Fair pricing and quality work. Will use again.",
  "Quick response and efficient service. Very satisfied.",
  "Best in the area. Always reliable and communicative.",
  "They went above and beyond. Truly exceptional service.",
  "Prompt, professional, and reasonably priced. A+ experience.",
  "Called them in an emergency and they came right away. Lifesavers!",
  "Great experience from start to finish. Highly recommend.",
  "Quality work at a fair price. No complaints here.",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  const area = randomInt(200, 999);
  const prefix = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `(${area}) ${prefix}-${line}`;
}

function generateBusinessName(type: string): string {
  const patterns = [
    () => `${randomItem(lastNames)}'s ${capitalize(type)} Services`,
    () => `${randomItem(firstNames)} ${randomItem(lastNames)} ${capitalize(type)}`,
    () => `${capitalize(type)} Pro ${randomItem(['Solutions', 'Experts', 'Masters', 'Plus'])}`,
    () => `${randomItem(['Quality', 'Premier', 'Elite', 'Superior', 'First Choice'])} ${capitalize(type)}`,
    () => `${randomItem(['A+', 'AAA', '5 Star', 'Ace'])} ${capitalize(type)} Service`,
  ];
  return randomItem(patterns)();
}

function capitalize(str: string): string {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function generateAddress(location: string): string {
  const num = randomInt(100, 9999);
  const street = randomItem(streetNames);
  return `${num} ${street}, ${location}`;
}

function generateWebsite(businessName: string): string {
  const clean = businessName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  return `https://www.${clean}.com`;
}

export interface MockBusiness {
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  reviews: { text: string; rating: number; authorName: string }[];
}

export function generateMockBusinesses(
  businessType: string,
  location: string,
  count: number = 10
): MockBusiness[] {
  const businesses: MockBusiness[] = [];

  for (let i = 0; i < count; i++) {
    const reviewCount = randomInt(5, 50);
    const hasCommunicationIssues = Math.random() < 0.6; // 60% have issues
    
    // Generate reviews
    const reviews: { text: string; rating: number; authorName: string }[] = [];
    const numReviewsToShow = Math.min(reviewCount, randomInt(3, 8));
    
    for (let j = 0; j < numReviewsToShow; j++) {
      const isBadReview = hasCommunicationIssues && Math.random() < 0.5;
      reviews.push({
        text: isBadReview ? randomItem(badReviews) : randomItem(goodReviews),
        rating: isBadReview ? randomInt(1, 3) : randomInt(4, 5),
        authorName: `${randomItem(firstNames)} ${randomItem(lastNames).charAt(0)}.`,
      });
    }

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : randomInt(2, 5);

    businesses.push({
      name: generateBusinessName(businessType),
      address: generateAddress(location),
      phone: generatePhone(),
      website: generateWebsite(generateBusinessName(businessType)),
      rating: Math.round(avgRating * 10) / 10,
      reviewCount,
      reviews,
    });
  }

  // Sort by rating (ascending) so worse-rated businesses appear first
  return businesses.sort((a, b) => a.rating - b.rating);
}
