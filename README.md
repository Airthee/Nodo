# Nodo (Expo + Bun)

Application de listes de tâches type Google Keep : listes nommées, items coché/décoché, suggestions à partir des items déjà cochés, tri (alphabétique / dernier ajout). Stockage local. Architecture hexagonale pour réutilisation du cœur métier côté web plus tard.

## Stack

- **Bun** – gestion des dépendances et scripts
- **Expo** – React Native (Android, iOS, web)
- **TypeScript**

## Commandes

```bash
bun install
bun run start    # Expo dev server
bun run android  # Lance sur Android
bun run ios      # Lance sur iOS (macOS)
bun run web      # Lance en web
```

## Structure (hexagonale)

- `src/domain` – Entités (Checklist, ChecklistItem), sans dépendance
- `src/application` – Ports (storage) et use cases (list, get, save, create, toggle, add/remove item)
- `src/infrastructure` – Adaptateur stockage (AsyncStorage)
- `src/presentation` – Thème (surchargeable), contexte, écrans et composants React Native

Le domaine et l’application sont en TypeScript pur, réutilisables par une future app web.

## Thème

Style par défaut type Material/Android. Pour surcharger : envelopper l’app avec `<ThemeProvider initialTheme={customTheme}>` ou utiliser `useTheme().setTheme(...)`.
