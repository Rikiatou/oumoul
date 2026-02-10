# Roadmap APIs externes

Ce document recense les APIs externes à intégrer progressivement pour Oumoul's App (web + mobile).

## 1. Calendrier hijri / dates de Ramadan
- **Objectif**: obtenir les vraies dates de Ramadan pour une année donnée et, idéalement, pour la localisation de l’utilisatrice.
- **Fonctionnalités souhaitées**:
  - Conversion Gregorian ↔ Hijri.
  - Récupération des jours de Ramadan (1–29/30) pour une année donnée.
- **Candidats d’API**:
  - [AlAdhan API](https://aladhan.com/prayer-times-api)
  - [Ummah API](https://docs.ummah.io/) (si adaptée au besoin)
- **Notes**:
  - À connecter au module fasting pour la vue `Ramadan`.

## 2. Coran (texte + audio)
- **Objectif**: offrir un accès au Coran complet avec audio et traductions.
- **Fonctionnalités souhaitées**:
  - Texte du Coran (arabe + au moins une traduction FR/EN).
  - URLs audio par verset / par sourate.
  - Métadonnées des sourates (nom, nombre de versets, type makki/madani).
- **Notes**:
  - Utilisation pour module Imane: lecture, playlists Ramadan, etc.
  - **API recommandée**: Quran.com API (coran + traduction + audio).

## 3. Duaa / invocations
- **Objectif**: proposer des duas thématiques (matin/soir, Ramadan, jeûne, règles, anxiété, etc.).
- **Fonctionnalités souhaitées**:
  - Texte arabe + translit + traduction.
  - Classement par catégorie (Ramadan, sommeil, voyage, etc.).
  - **API recommandée**: Hisnul Muslim API (duas authentiques).

## 4. Dhikr
- **Objectif**: alimenter le module `Dhikr` en formules authentifiées.
- **Fonctionnalités souhaitées**:
  - Listes de dhikr (matin, soir, après prière, etc.).
  - Sources (hadith, références) pour affichage dans l’app.
  - **API recommandée**: Hisnul Muslim API (dhikr matin/soir, après salat, etc.).

## 5. Tafsir / rappels
- **Objectif**: proposer des tafsir courts ou rappels textuels/audio.
- **Fonctionnalités souhaitées**:
  - Résumés de tafsir par verset ou par thème.
  - Courtes explications utilisables dans les cards de l’app.
  - **API recommandée**: Quran.com API (tafsir Jalalayn, Ibn Kathir, etc.).

## 6. Hadith
- **Objectif**: appuyer les rappels et explications par des hadiths authentiques.
- **Fonctionnalités souhaitées**:
  - Recherche par référence / mots-clés.
  - Classement par livres / thèmes.
  - **API recommandée**: Sunnah.com API (collections authentiques et complètes).

## 7. Horaires de prière & Qibla
- **Objectif**: proposer des horaires de prière fiables et la direction de la Qibla.
- **Fonctionnalités souhaitées**:
  - Horaires par localisation.
  - Méthodes de calcul configurables.
  - Azan / notifications potentielles.
  - **API recommandée**: AlAdhan API (horaires + Qibla, déjà utilisée).

## 8. Audio Coran (récitateurs)
- **Objectif**: proposer des récitations audio par réciteur et qualité.
- **Fonctionnalités souhaitées**:
  - Listes de récitateurs.
  - URLs MP3 par sourate / hizb.
- **API recommandée**: MP3 Quran API.

---

Ce fichier sera mis à jour au fur et à mesure que nous décidons quelles APIs exactes utiliser et quels champs seront stockés côté backend.
