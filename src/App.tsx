import React, { useState, useEffect } from 'react';
import TextInput from './components/TextInput';
import VoicePlayer from './components/VoicePlayer';
import LoadingAnimation from './components/LoadingAnimation';
import ProgressBar from './components/ProgressBar';
import { generateVoiceWithEnvironment } from './services/elevenLabsAPI';
import { analyzeTextEnvironments } from './services/grokService';
import { logger } from './config/development';
import './App.css';

// Configuration des personnages disponibles
interface Character {
  id: string;
  name: string;
  description: string;
}

const CHARACTERS: Character[] = [
  { id: 'sasha', name: 'Thomas', description: 'Voix grave' },
  { id: 'mael', name: 'Julian', description: 'Voix douce' }
];

// Étapes du processus de génération
enum ProcessStep {
  IDLE = 'idle',
  CLIPBOARD_READING = 'reading_clipboard',
  TEXT_ANALYZING = 'analyzing_text',
  GENERATING_VOICE = 'generating_voice',
  COMPLETED = 'completed',
  ERROR = 'error'
}

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedEnvironment, setDetectedEnvironment] = useState<string>('default');
  const [detectedEmotion, setDetectedEmotion] = useState<string>('sensuel');
  const [processStep, setProcessStep] = useState<ProcessStep>(ProcessStep.IDLE);
  const [clipboardText, setClipboardText] = useState<string>('');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('sasha'); // Thomas par défaut
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');

  // Fonction pour lire l'aperçu vocal
  const playVoicePreview = (character: string) => {
    try {
      const audio = new Audio(`/voices/${character}.mp3`);
      audio.volume = 0.7; // Volume modéré
      audio.play().catch(err => {
        console.error('Erreur lors de la lecture de l\'aperçu vocal:', err);
      });
    } catch (err) {
      console.error('Erreur lors du chargement de l\'aperçu vocal:', err);
    }
  };

  // Récupérer le texte depuis sessionStorage lors du chargement initial
  useEffect(() => {
    try {
      // Essayer de récupérer le texte depuis sessionStorage
      const storyText = sessionStorage.getItem('storyText');
      
      if (storyText) {
        logger.info('Texte récupéré depuis sessionStorage');
        setInputText(storyText);
      } else {
        logger.info('Aucun texte trouvé dans sessionStorage');
      }
    } catch (err) {
      logger.error('Erreur lors de la récupération du texte:', err);
    }
  }, []);

  useEffect(() => {
    logger.group('État de l\'application');
    logger.debug('État actuel:', {
      inputText,
      audioUrl,
      isLoading,
      error
    });
    logger.groupEnd();
  }, [inputText, audioUrl, isLoading, error]);

  const handleTextChange = (text: string) => {
    logger.debug('Changement de texte:', text);
    setInputText(text);
    setError(null);

    // Analyser le texte pour détecter l'environnement, l'émotion et les paramètres vocaux
    if (text.trim()) {
      analyzeTextEnvironments(text)
        .then(detections => {
          if (detections.length > 0) {
            setDetectedEnvironment(detections[0].environment);
            setDetectedEmotion(detections[0].emotionalTone);
            logger.debug('Environnement détecté:', detections[0].environment);
            logger.debug('Émotion détectée:', detections[0].emotionalTone);
          }
        })
        .catch(err => {
          logger.error('Erreur lors de la détection de l\'environnement et de l\'émotion:', err);
          setDetectedEnvironment('default');
          setDetectedEmotion('sensuel');
        });
    } else {
      setDetectedEnvironment('default');
      setDetectedEmotion('sensuel');
    }
  };

  const handleGenerateVoice = async () => {
    logger.group('Génération de la voix');
    logger.info('Début de la génération');
    
    // Empêcher les clics multiples rapides
    if (isLoading) {
      logger.info('Génération déjà en cours, ignorée');
      logger.groupEnd();
      return;
    }
    
    // Variable pour stocker le texte à utiliser (presse-papiers ou existant)
    let textToUse = inputText;
    
    // Récupération rapide du texte du presse-papiers
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText.trim()) {
        logger.info('Texte récupéré depuis le presse-papiers');
        textToUse = clipboardText;
        
        // Mettre à jour l'état sans attendre
        setInputText(clipboardText);
      }
    } catch (err) {
      // Si l'accès au presse-papiers échoue, continuer silencieusement avec le texte existant
      logger.info('Utilisation du texte existant (accès au presse-papiers impossible)');
    }
    
    // Utiliser textToUse au lieu de inputText pour les logs et vérifications
    logger.debug('Texte à utiliser:', textToUse);
    logger.debug('Environnement détecté:', detectedEnvironment);
    logger.debug('Émotion détectée:', detectedEmotion);
    
    // Afficher les logs dans la console du navigateur
    console.log('Début de la génération de la voix');
    console.log('Texte:', textToUse);
    console.log('Environnement:', detectedEnvironment);
    console.log('Émotion:', detectedEmotion);
    
    // Vérifier si le texte à utiliser est vide
    if (!textToUse.trim()) {
      const errorMsg = "Veuillez entrer du texte avant de générer la voix";
      logger.warn(errorMsg);
      setError(errorMsg);
      logger.groupEnd();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setGenerationProgress(0);
      
      // Fonction de callback pour mettre à jour le progrès
      const updateProgress = (progress: number, message: string) => {
        setGenerationProgress(progress);
        setProgressMessage(message);
      };

      // Étape 1: Analyse du texte avec Grok (0-20%)
      updateProgress(5, "Analyse du texte avec Grok...");
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulation du délai
      
      updateProgress(15, "Détection des émotions et environnements...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Étape 2: Préparation de la génération (20-30%)
      updateProgress(25, "Préparation des segments audio...");
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Utiliser directement le texte sans ajouter de balises d'émotion
      // L'analyse sera faite par l'API Grok
      logger.debug('Texte à analyser:', textToUse);

      // Étape 3: Génération avec environnement intégré (30-90%)
      updateProgress(35, "Génération de la voix en cours...");
      console.log('Génération de voix avec environnement intégré');
      console.log('Personnage sélectionné:', selectedCharacter);
      
      // Simuler le progrès pendant la génération
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev < 85) {
            const increment = Math.random() * 5 + 2; // Progression aléatoire entre 2 et 7%
            return Math.min(85, prev + increment);
          }
          return prev;
        });
      }, 800);
      
      try {
        const url = await generateVoiceWithEnvironment(textToUse, true, selectedCharacter);
        clearInterval(progressInterval);
        
        // Étape 4: Finalisation (90-100%)
        updateProgress(90, "Finalisation de l'audio...");
        await new Promise(resolve => setTimeout(resolve, 300));
        
        updateProgress(95, "Optimisation finale...");
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('Génération avec environnement réussie');
        
        logger.info('URL audio reçue:', url);
        console.log('URL audio reçue:', url);
        
        // Vérifier que l'URL est valide
        if (!url) {
          throw new Error('URL audio invalide reçue');
        }

        updateProgress(100, "Audio généré avec succès !");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setAudioUrl(url);
        logger.info('Audio URL mise à jour avec succès');
      } catch (genError) {
        clearInterval(progressInterval);
        throw genError;
      }
      
    } catch (err) {
      logger.error('Erreur lors de la génération de la voix:', err);
      let errorMessage = "Erreur lors de la génération de la voix. ";
      
      if (err instanceof Error) {
        errorMessage += err.message;
        logger.error('Message d\'erreur:', err.message);
        logger.error('Stack trace:', err.stack);
      }
      
      setError(errorMessage);
      setProgressMessage("Erreur lors de la génération");
    } finally {
      logger.info('Fin de la génération');
      setIsLoading(false);
      // Réinitialiser le progrès après un délai
      setTimeout(() => {
        setGenerationProgress(0);
        setProgressMessage('');
      }, 2000);
      logger.groupEnd();
    }
  };

  // Texte d'exemple pour démonstration
  const exampleText = `Je sens mon corps frémir sous tes caresses délicates. 
Chaque toucher envoie des vagues de plaisir à travers ma peau sensible.
Viens plus près de moi, murmure-t-il doucement à mon oreille.
Je ne peux plus résister, l'intensité me submerge complètement !`;

  const handleStartWithClipboard = async () => {
    try {
      // Réinitialiser les états
      setError(null);
      setIsLoading(true);
      setProcessStep(ProcessStep.CLIPBOARD_READING);
      
      // Étape 1: Essayer de lire le presse-papiers
      try {
        const text = await navigator.clipboard.readText();
        setClipboardText(text);
        
        if (text.trim()) {
          // Étape 2: Analyser le texte
          setProcessStep(ProcessStep.TEXT_ANALYZING);
          setInputText(text);
          
          try {
            const detections = await analyzeTextEnvironments(text);
            if (detections.length > 0) {
              setDetectedEnvironment(detections[0].environment);
              setDetectedEmotion(detections[0].emotionalTone);
              logger.debug('Environnement détecté:', detections[0].environment);
              logger.debug('Émotion détectée:', detections[0].emotionalTone);
            }
          } catch (err) {
            logger.error('Erreur lors de la détection de l\'environnement et de l\'émotion:', err);
            setDetectedEnvironment('default');
            setDetectedEmotion('sensuel');
          }
          
          // Étape 3: Générer la voix
          setProcessStep(ProcessStep.GENERATING_VOICE);
          await handleGenerateVoice();
          
          // Étape 4: Terminé
          setProcessStep(ProcessStep.COMPLETED);
        } else {
          // Utiliser le texte d'exemple si le presse-papiers est vide
          setInputText(exampleText);
          setProcessStep(ProcessStep.TEXT_ANALYZING);
          
          try {
            const detections = await analyzeTextEnvironments(exampleText);
            if (detections.length > 0) {
              setDetectedEnvironment(detections[0].environment);
              setDetectedEmotion(detections[0].emotionalTone);
            }
          } catch (err) {
            setDetectedEnvironment('default');
            setDetectedEmotion('sensuel');
          }
          
          setProcessStep(ProcessStep.GENERATING_VOICE);
          await handleGenerateVoice();
          setProcessStep(ProcessStep.COMPLETED);
        }
      } catch (clipboardErr) {
        // En cas d'erreur d'accès au presse-papiers, utiliser le texte d'exemple
        logger.error('Erreur lors de l\'accès au presse-papiers:', clipboardErr);
        
        // Vérifier d'abord sessionStorage
        const storyText = sessionStorage.getItem('storyText');
        
        if (storyText && storyText.trim()) {
          setInputText(storyText);
        } else {
          // Utiliser le texte d'exemple si sessionStorage est vide
          setInputText(exampleText);
        }
        
        setProcessStep(ProcessStep.TEXT_ANALYZING);
        
        try {
          const textToAnalyze = storyText && storyText.trim() ? storyText : exampleText;
          const detections = await analyzeTextEnvironments(textToAnalyze);
          if (detections.length > 0) {
            setDetectedEnvironment(detections[0].environment);
            setDetectedEmotion(detections[0].emotionalTone);
          }
        } catch (err) {
          setDetectedEnvironment('default');
          setDetectedEmotion('sensuel');
        }
        
        setProcessStep(ProcessStep.GENERATING_VOICE);
        await handleGenerateVoice();
        setProcessStep(ProcessStep.COMPLETED);
      }
    } catch (err) {
      logger.error('Erreur générale:', err);
      setError("Une erreur est survenue lors de la génération. Veuillez réessayer.");
      setProcessStep(ProcessStep.ERROR);
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="app-container">
        <div className="controls-section">
          {/* TextInput caché mais toujours fonctionnel */}
          <div style={{ display: 'none' }}>
            <TextInput onTextChange={handleTextChange} initialText={inputText} />
          </div>
          
          {/* Sélecteur de personnages */}
          <div className="character-selector">
            {CHARACTERS.map(character => (
              <div key={character.id} className="character-item">
                <button
                  className={`character-button ${selectedCharacter === character.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCharacter(character.id)}
                  disabled={isLoading}
                >
                  {character.name} - {character.description}
                </button>
                <button
                  className="voice-preview-button"
                  onClick={() => playVoicePreview(character.id)}
                  disabled={isLoading}
                  title={`Écouter un aperçu de la voix de ${character.name}`}
                >
                  🔊
                </button>
              </div>
            ))}
          </div>
          
          {/* Bouton Générer la Voix avec fonctionnalité de collage */}
          <button 
            onClick={handleGenerateVoice}
            disabled={isLoading}
            className="generate-button"
          >
            {isLoading ? 'Génération en cours...' : 'Générer la Voix'}
          </button>
          
          {/* Animation de chargement avec cœurs + Barre de progression */}
          {isLoading && (
            <div>
              <LoadingAnimation />
              <ProgressBar 
                progress={generationProgress} 
                message={progressMessage || "Génération de l'audio en cours..."}
                showPercentage={true}
              />
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
        <div className="player-section">
          <VoicePlayer 
            audioUrl={audioUrl} 
            environment={detectedEnvironment}
            emotion={detectedEmotion}
            originalText={inputText}
          />
          {audioUrl && (
            <div className="audio-info">
              Audio généré avec succès
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default App;
