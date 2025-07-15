import { logger } from '../../config/development';
import { ContextualMoodPattern, ContextualMoodType, TextAnalysis, VoiceSettings } from './types';

// Mots-clés émotionnels pour l'analyse du texte
export const emotionKeywords = {
  sensuel: ['désir', 'doux', 'caresse', 'peau', 'frisson', 'sensuel', 'chaleur', 'corps'],
  excite: ['gémis', 'soupir', 'excité', 'passionné', 'brûlant', 'urgent', 'envie', 'trembler'],
  jouissance: ['extase', 'jouir', 'orgasme', 'plaisir', 'délice', 'intense', 'explosion'],
  murmure: ['murmure', 'souffle', 'chuchote', 'doux', 'tendre', 'délicat'],
  intense: ['fort', 'intense', 'profond', 'puissant', 'violent', 'ardent', 'sauvage'],
  doux: ['tendre', 'doux', 'délicat', 'léger', 'suave', 'douceur']
};

// Patterns de prosodie pour les différentes ambiances émotionnelles avec vitesses optimisées
export const contextualMoodPatterns: Record<Exclude<ContextualMoodType, 'neutral'>, ContextualMoodPattern> = {
  anticipation: { pitch: '+3%', rate: '32%' },   // Réduit pour plus de sensualité
  tension: { pitch: '+6%', rate: '35%' },        // Réduit pour plus de contrôle
  relaxation: { pitch: '-8%', rate: '28%' },     // Plus lent et plus grave
  intimacy: { pitch: '-15%', rate: '25%' },      // Très lent et très grave pour l'intimité
  passion: { pitch: '+5%', rate: '33%' }         // Contrôlé même dans la passion
};

/**
 * Calcule les paramètres vocaux en fonction de l'émotion et de l'analyse du texte
 * @param emotion L'émotion dominante du texte
 * @param analysis L'analyse du texte
 * @returns Les paramètres vocaux ajustés
 */
export const getVoiceSettings = (emotion: string, analysis: TextAnalysis): VoiceSettings => {
  logger.group('Calcul des paramètres de voix');
  logger.debug('Émotion:', emotion);
  logger.debug('Analyse:', analysis);
  
  // Paramètres optimisés pour une meilleure expressivité et cohérence émotionnelle
  const baseSettings: Record<string, VoiceSettings> = {
    sensuel: {
      stability: 0.55,  // Réduit pour plus de variations naturelles sensuelles
      similarity_boost: 0.88  // Légèrement réduit pour plus de naturel
    },
    excite: {
      stability: 0.30,  // Plus bas pour plus d'expressivité dans l'excitation
      similarity_boost: 0.92  // Équilibré pour l'expressivité contrôlée
    },
    jouissance: {
      stability: 0.20,  // Très bas pour maximum d'expressivité
      similarity_boost: 0.95  // Élevé mais pas maximal pour éviter l'artificiel
    },
    murmure: {
      stability: 0.70,  // Plus élevé pour contrôler les murmures
      similarity_boost: 0.82  // Modéré pour préserver l'intimité
    },
    intense: {
      stability: 0.32,  // Bas pour l'intensité émotionnelle
      similarity_boost: 0.90  // Élevé pour l'expressivité
    },
    doux: {
      stability: 0.65,  // Modéré pour la douceur contrôlée
      similarity_boost: 0.83  // Équilibré pour la tendresse
    }
  };

  const settings = baseSettings[emotion] || baseSettings.sensuel;
  const adjustedSettings = {
    ...settings,
    // Ajustements plus fins pour une meilleure cohérence émotionnelle
    stability: Math.max(0.15, Math.min(0.75, settings.stability * (1 - analysis.intensity * 0.3))),
    similarity_boost: Math.max(0.75, Math.min(0.98, settings.similarity_boost + analysis.emotionalProgression * 0.15))
  };

  logger.debug('Paramètres ajustés:', adjustedSettings);
  logger.groupEnd();
  return adjustedSettings;
};

/**
 * Calcule la durée de transition entre deux émotions
 * @param currentEmotion L'émotion actuelle
 * @param nextEmotion L'émotion suivante
 * @returns La durée de transition en millisecondes
 */
export const calculateEmotionTransitionDuration = (currentEmotion: string, nextEmotion: string): number => {
  // Définir les durées de transition entre les émotions
  const transitionMap: Record<string, Record<string, number>> = {
    sensuel: {
      excite: 600,
      jouissance: 800,
      murmure: 400,
      intense: 700,
      doux: 300
    },
    excite: {
      sensuel: 600,
      jouissance: 400,
      murmure: 700,
      intense: 500,
      doux: 800
    },
    jouissance: {
      sensuel: 800,
      excite: 400,
      murmure: 900,
      intense: 300,
      doux: 1000
    },
    murmure: {
      sensuel: 400,
      excite: 700,
      jouissance: 900,
      intense: 800,
      doux: 300
    },
    intense: {
      sensuel: 700,
      excite: 500,
      jouissance: 300,
      murmure: 800,
      doux: 900
    },
    doux: {
      sensuel: 300,
      excite: 800,
      jouissance: 1000,
      murmure: 300,
      intense: 900
    }
  };

  return transitionMap[currentEmotion]?.[nextEmotion] || 500;
};
