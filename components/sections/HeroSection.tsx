import { sanityFetch } from "@/sanity/lib/live";
import { defineQuery } from "next-sanity";

const HERO_QUERY = defineQuery(`*[_id == "singleton-profile"][0]{
    firstName,
    lastName,
    headline,
    headlineStaticText,
    headlineAnimatedWords,
    headlineAnimationDuration,
    shortBio,
    email,
    phone,
    location,
    availability,
    socialLinks,
    yearsOfExperience,
    profileImage
  }`);

async function  HeroSection() {
    const {data: profile} = await sanityFetch({query: HERO_QUERY})
    console.log(profile);
  return (
    <div>HeroSection</div>
  )
}

export default HeroSection