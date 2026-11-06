import { LandingEffects } from "@/components/LandingEffects";
import { Hero, Marquee, Nav } from "@/components/sections/Top";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Modes } from "@/components/sections/Modes";
import { Claim, Proof } from "@/components/sections/Proof";
import { Cta, Faq, Footer, Trust } from "@/components/sections/Bottom";

export default function Home() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <Nav />
      <Hero />
      <Marquee />
      <main>
        <HowItWorks />
        <Modes />
        <Proof />
        <Claim />
        <Trust />
        <Faq />
        <Cta />
      </main>
      <Footer />
      <LandingEffects />
    </>
  );
}
