// Drug-allergy cross-reference mappings for common clinical cross-reactivities
const ALLERGY_DRUG_FAMILIES = {
  penicillin: ['amoxicillin', 'ampicillin', 'penicillin', 'augmentin', 'piperacillin', 'oxacillin'],
  sulfa: ['sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine', 'sulfadiazine'],
  aspirin: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'ketorolac'],
  nsaid: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'celecoxib', 'meloxicam']
};

export const checkAllergies = (medicines = [], patientAllergies = []) => {
  if (!patientAllergies || patientAllergies.length === 0 || !medicines || medicines.length === 0) {
    return [];
  }

  const warnings = [];

  const normalizedAllergies = patientAllergies.map((a) => a.toLowerCase().trim());

  medicines.forEach((med) => {
    const medName = (med.name || med).toLowerCase().trim();

    normalizedAllergies.forEach((allergy) => {
      let isMatch = false;

      // Direct string / substring match
      if (medName.includes(allergy) || allergy.includes(medName)) {
        isMatch = true;
      }

      // Check cross-reactive drug families
      for (const [family, drugs] of Object.entries(ALLERGY_DRUG_FAMILIES)) {
        if (allergy.includes(family)) {
          if (drugs.some((d) => medName.includes(d))) {
            isMatch = true;
          }
        }
      }

      if (isMatch) {
        warnings.push({
          medicine: med.name || med,
          allergy,
          warning: `POTENTIAL ALLERGIC REACTION: Prescribed "${med.name || med}" conflicts with patient's recorded allergy: "${allergy}".`
        });
      }
    });
  });

  return warnings;
};
