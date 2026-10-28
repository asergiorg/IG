import { planets } from "../data/planets";

// Estado interno
let planetIndex = 0; 
const factCounters = planets.map(() => 0);

export function getNextData() {
  const planet = planets[planetIndex];
  const factIndex = factCounters[planetIndex];

  const data = {
    planet: planet.name,
    fact: planet.facts[factIndex],
    factNumber: factIndex + 1,
    totalFacts: planet.facts.length,
  };

  factCounters[planetIndex] = (factIndex + 1) % planet.facts.length;
  planetIndex = (planetIndex + 1) % planets.length;

  return data;
}