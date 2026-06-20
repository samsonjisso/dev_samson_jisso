import { sanityFetch } from "@/sanity/lib/live";


export async function fetchPortfolioForAI() {
  // Pulls everything relevant to your resume and identity from Sanity
  const query = `{
    "education": *[_type == "education"] | order(order asc) {
      institution,
      degree,
      fieldOfStudy,
      startDate,
      endDate,
      current,
      gpa,
      description,
      achievements
    },
    "experience": *[_type == "experience"] | order(order asc) {
      company,
      position,
      employmentType,
      location,
      startDate,
      endDate,
      current,
      // 1. Converts Sanity block rich text into clean plain text strings for Gemini
      "description": description[].children[].text, 
      responsibilities,
      achievements,
      // 2. Traverses references to pull the actual text names of your skills
      "technologiesUsed": technologies[]->title 
    }
  }`;

  const data = await sanityFetch({ query });
  return JSON.stringify(data, null, 2); 
}
