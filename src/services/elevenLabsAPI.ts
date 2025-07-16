import axiosInstance from './axiosConfig';
import axios from 'axios';
import { config, logger } from '../config/development';
import { analyzeTextEnvironments } from './grokService';
import {
  analyzeText,
  addBreathingAndPauses,
  getVoiceSettings,
  generateSegmentSSML
} from './elevenlabs/index';

// Configuration des voix disponibles
interface VoiceConfig {
  voiceId: string;
  apiKey: string;
  name: string;
  description: string;
}

const VOICE_CONFIGS: Record<string, VoiceConfig> = {
  sasha: {
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID_SASHA || '',
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY_SASHA || '',
    name: 'Sasha',
    description: 'Voix grave'
  },
  mael: {
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID_MAEL || '',
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY_MAEL || '',
    name: 'Mael',
    description: 'Voix douce'
  }
};

// Variable par défaut (personnage par défaut)
const DEFAULT_VOICE = 'sasha';

/**
 * Récupère la configuration de voix pour un personnage donné
 * @param character Le personnage sélectionné ('sasha' ou 'mael')
 * @returns La configuration de voix correspondante
 */
const getVoiceConfig = (character: string = DEFAULT_VOICE): VoiceConfig => {
  if (VOICE_CONFIGS[character]) {
    return VOICE_CONFIGS[character];
  }
  
  logger.warn(`Personnage "${character}" non trouvé, utilisation de "${DEFAULT_VOICE}"`);
  return VOICE_CONFIGS[DEFAULT_VOICE];
};

/**
 * Construit l'URL de l'API pour un personnage donné
 * @param character Le personnage sélectionné
 * @returns L'URL de l'API
 */
const getApiUrl = (character: string = DEFAULT_VOICE): string => {
  const voiceConfig = getVoiceConfig(character);
  return `${config.api.baseUrl}/text-to-speech/${voiceConfig.voiceId}`;
};

// Vérification de la présence des variables d'environnement
if (!VOICE_CONFIGS.sasha.voiceId || !VOICE_CONFIGS.sasha.apiKey || 
    !VOICE_CONFIGS.mael.voiceId || !VOICE_CONFIGS.mael.apiKey) {
  logger.error('Variables d\'environnement manquantes pour les voix');
  console.error('Variables d\'environnement manquantes pour les voix');
}

/**
 * Fonction principale pour générer la voix
 * @param text Le texte à convertir en voix
 * @param character Le personnage sélectionné ('sasha' ou 'mael')
 * @returns URL de l'audio généré
 */
export const generateVoice = async (text: string, character: string = DEFAULT_VOICE): Promise<string> => {
  try {
    logger.group('Génération de la voix');
    logger.info('Début de la génération pour le texte:', text);
    
    // 1. Analyser le texte localement
    logger.info('Étape 1: Analyse locale du texte');
    const analysis = analyzeText(text);
    
    // 2. Obtenir les paramètres vocaux
    logger.info('Étape 2: Obtention des paramètres vocaux');
    const emotion = 'sensuel'; // Émotion par défaut
    const settings = getVoiceSettings(emotion, analysis);
    
    // 3. Créer le SSML
    logger.info('Étape 3: Création du SSML');
    const textWithBreathing = addBreathingAndPauses(text, emotion, analysis);
    
    // Ajuster les paramètres en fonction de l'analyse
    const baseRate = '35%'; // Très lent pour une ambiance sensuelle
    const basePitch = '-10%'; // Plus grave pour plus de profondeur
    
    // Diviser le texte en segments plus courts pour éviter les limitations de l'API
    const segments = text.split(/[.!?…]+/).filter(s => s.trim().length > 0);
    logger.debug('Nombre de segments:', segments.length);
    
    // Générer l'audio pour chaque segment
    const audioBlobs: Blob[] = [];
    for (const segment of segments) {
      const segmentSSML = generateSegmentSSML(segment, emotion, analysis, { pitch: basePitch, rate: baseRate });
      logger.debug('SSML pour le segment:', segmentSSML);
      
      const voiceConfig = getVoiceConfig(character);
      const apiUrl = getApiUrl(character);
      
      const response = await axiosInstance.post(
        apiUrl,
        {
          text: segmentSSML,
          model_id: "eleven_multilingual_v2",
          voice_settings: settings
        },
        {
          headers: {
            'xi-api-key': voiceConfig.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'blob',
          timeout: config.api.timeout
        }
      );
      
      audioBlobs.push(response.data);
    }
    
    // Concaténer tous les blobs audio
    const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(combinedBlob);
    logger.debug('URL audio générée:', audioUrl);
    
    logger.groupEnd();
    return audioUrl;
  } catch (error: unknown) {
    logger.error('Erreur lors de la génération de la voix:', error);
    if (axios.isAxiosError(error)) {
      logger.error('Réponse de l\'API:', error.response?.data);
      logger.error('Status:', error.response?.status);
      logger.error('Headers:', error.response?.headers);
    }
    throw new Error('Échec de la génération de la voix');
  }
};

/**
 * Fonction pour générer la voix avec analyse Grok optimisée
 * @param text Le texte à convertir en voix
 * @param useAI Indique si on doit utiliser l'IA pour l'analyse (toujours true maintenant)
 * @param character Le personnage sélectionné ('sasha' ou 'mael')
 * @returns URL de l'audio généré
 */
export const generateVoiceWithEnvironment = async (
  text: string, 
  useAI: boolean = true, 
  character: string = DEFAULT_VOICE
): Promise<string> => {
  try {
    logger.group('Génération de la voix avec analyse Grok');
    logger.info('Texte à traiter:', text);
    logger.info('Personnage sélectionné:', character);
    
    // 1. Analyser le texte avec Grok pour obtenir les segments optimisés
    logger.info('Étape 1: Analyse du texte avec Grok');
    const segments = await analyzeTextEnvironments(text);
    logger.debug('Segments détectés:', segments.length);
    
    // 2. Générer la voix pour chaque segment avec paramètres optimisés
    logger.info('Étape 2: Génération des segments audio');
    const audioBlobs: Blob[] = [];
    
    // Générer l'audio pour chaque segment avec concaténation simple
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const prevSegment = i > 0 ? segments[i - 1] : null;
      const nextSegment = i < segments.length - 1 ? segments[i + 1] : null;
      
      logger.debug(`Traitement du segment ${i+1}/${segments.length}:`, segment.segment);
      logger.debug('Émotion détectée:', segment.emotionalTone);
      
      // Analyser le segment localement pour les paramètres de base
      const analysis = analyzeText(segment.segment);
      
      // Construire le SSML optimisé pour ce segment
      let ssml = `<speak>\n`;
      
      // Ajouter une pause au début si nécessaire
      if (i === 0) {
        ssml += `<break time="100ms"/>\n`;
      } else if (prevSegment && prevSegment.segment.match(/[.!?…]$/)) {
        ssml += `<break time="150ms"/>\n`;
      }
      
      // Déterminer les paramètres vocaux selon l'analyse Grok
      let speed = '28%'; // Vitesse par défaut lente
      let pitch = '-8%'; // Pitch par défaut grave
      let volume = 'medium';
      
      // Ajuster selon l'émotion détectée par Grok
      if (segment.emotionalTone === 'jouissance') {
        speed = '35%'; // Maximum autorisé
        pitch = '+5%';
        volume = 'loud';
      } else if (segment.emotionalTone === 'excite') {
        speed = '32%';
        pitch = '+2%';
        volume = 'medium-loud';
      } else if (segment.emotionalTone === 'murmure') {
        speed = '20%'; // Très lent
        pitch = '-15%';
        volume = 'soft';
      } else if (segment.emotionalTone === 'sensuel') {
        speed = '25%';
        pitch = '-10%';
        volume = 'medium-soft';
      } else if (segment.emotionalTone === 'intense') {
        speed = '30%';
        pitch = '-2%';
        volume = 'medium-loud';
      }
      
      // Utiliser les paramètres Grok si disponibles (avec limites)
      if (segment.elevenlabsParams) {
        if (segment.elevenlabsParams.speed) {
          const speedValue = parseInt(segment.elevenlabsParams.speed.replace('%', ''), 10);
          speed = `${Math.min(speedValue, 35)}%`; // Limite stricte à 35%
        }
        if (segment.elevenlabsParams.pitch_shift) {
          pitch = segment.elevenlabsParams.pitch_shift > 0 ? 
                  `+${segment.elevenlabsParams.pitch_shift}%` : 
                  `${segment.elevenlabsParams.pitch_shift}%`;
        }
      }
      
      // Ajouter la prosodie avec paramètres optimisés
      ssml += `<prosody rate="${speed}" pitch="${pitch}" volume="${volume}">\n`;
      
      // Ajouter le texte avec respirations naturelles
      ssml += addBreathingAndPauses(segment.segment, segment.emotionalTone, analysis);
      
      // Fermer les balises
      ssml += `\n</prosody>\n`;
      
      // Ajouter une pause entre segments si nécessaire
      if (nextSegment) {
        ssml += `<break time="100ms"/>\n`;
      } else {
        ssml += `<break time="200ms"/>\n`; // Pause finale plus longue
      }
      
      ssml += `</speak>`;
      
      logger.debug('SSML généré:', ssml);

      // Utiliser les paramètres vocaux de Grok ou par défaut
      let voiceSettings = getVoiceSettings(segment.emotionalTone, analysis);
      
      if (segment.elevenlabsParams) {
        voiceSettings = {
          stability: segment.elevenlabsParams.stability,
          similarity_boost: segment.elevenlabsParams.similarity_boost
        };
        logger.debug('Utilisation des paramètres Grok:', voiceSettings);
      }

      try {
        logger.info(`Appel à l'API ElevenLabs pour le segment ${i+1}/${segments.length}`);
        
        // Récupérer la configuration de voix
        const voiceConfig = getVoiceConfig(character);
        const apiUrl = getApiUrl(character);
        
        // Générer l'audio pour ce segment
        const response = await axiosInstance.post(
          apiUrl,
          {
            text: ssml,
            model_id: "eleven_multilingual_v2",
            voice_settings: voiceSettings
          },
          {
            headers: {
              'xi-api-key': voiceConfig.apiKey,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg'
            },
            responseType: 'blob',
            timeout: config.api.timeout
          }
        );
        
        logger.debug('Réponse reçue de l\'API ElevenLabs');
        
        // Ajouter le blob à la liste pour concaténation
        audioBlobs.push(response.data);
        
        logger.debug(`Segment audio ${i+1}/${segments.length} généré avec succès`);
      } catch (segmentError) {
        logger.error(`Erreur lors de la génération du segment ${i+1}/${segments.length}:`, segmentError);
        if (axios.isAxiosError(segmentError)) {
          logger.error('Réponse de l\'API pour le segment:', segmentError.response?.data);
          logger.error('Status pour le segment:', segmentError.response?.status);
        }
        // Continuer avec les autres segments même si celui-ci a échoué
      }
    }
    
    logger.debug('Nombre de segments audio générés:', audioBlobs.length);
    
    if (audioBlobs.length === 0) {
      logger.error('Aucun segment audio n\'a été généré');
      throw new Error('Aucun segment audio n\'a été généré');
    }

    // 3. Concaténer tous les blobs audio (mixage simple)
    logger.info('Étape 3: Concaténation des segments audio');
    const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
    const finalAudioUrl = URL.createObjectURL(combinedBlob);
    
    logger.info('Génération terminée avec succès');
    logger.info('URL audio finale:', finalAudioUrl);
    logger.groupEnd();
    
    return finalAudioUrl;
  } catch (error) {
    logger.error('Erreur lors de la génération de la voix avec environnement:', error);
    if (axios.isAxiosError(error)) {
      logger.error('Réponse de l\'API:', error.response?.data);
      logger.error('Status:', error.response?.status);
      logger.error('Headers:', error.response?.headers);
    }
    
    // En cas d'erreur, essayer de générer une voix simple sans environnement
    logger.info('Tentative de génération de voix simple sans environnement');
    try {
      const simpleVoiceUrl = await generateVoice(text, character);
      logger.info('Génération de voix simple réussie');
      return simpleVoiceUrl;
    } catch (fallbackError) {
      logger.error('Échec de la génération de voix simple:', fallbackError);
      throw error; // Renvoyer l'erreur originale
    }
  }
};
