import axios from 'axios';

async function analyzeWithAI(trace: string) {
  try {
    // Send the error to your Next.js Backend
    const response = await axios.post('https://your-vigilance-site.com/api/analyze', {
      errorLog: trace,
      apiKey: 'user-personal-token' // Optional: if you have accounts
    });
    
    console.log("\n[Vigilance Fix]:", response.data.suggestion);
  } catch (err) {
    console.error("Could not reach Vigilance servers.");
  }
}