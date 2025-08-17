// Fonction utilitaire pour formater l'heure sans les secondes
export const formatTime = (timeString: string | undefined | null): string => {
  if (!timeString) return '';
  return timeString.substring(0, 5); // Garde seulement HH:MM
};