# 🏥 Urlaubsplaner

Ein clientseitiges Tool für Stationsleitungen, um Urlaubswünsche des Personals unter
Berücksichtigung betrieblicher Einschränkungen zu planen. Die gesamte Berechnung läuft
im Browser – es wird kein Backend benötigt, alle Daten bleiben lokal (`localStorage`).

## Funktionen

- **Mitarbeiterverwaltung** inkl. individuellem Urlaubswochen-Kontingent pro Jahr.
- **Urlaubswünsche** wochenweise (Kalenderwochen, ISO), als zusammenhängender Block mit
  drei Prioritätsstufen: *Normal*, *Hoch*, *Fixiert* (bereits verbindlich zugesagt).
- **Einstellbare Constraints**:
  - Max. Anzahl Mitarbeiter gleichzeitig im Urlaub (Standard: 2)
  - Max. durchgängige Urlaubsdauer in Wochen (Standard: 2)
  - Individuelles Jahres-Wochenkontingent je Mitarbeiter
- **Automatische Planung**: Der Solver versucht, alle Wünsche in Prioritätsreihenfolge
  exakt zu platzieren. Fixierte Wünsche werden immer übernommen (Konflikte werden als
  Warnung angezeigt). Kann ein Hoch/Normal-Wunsch nicht wie gewünscht platziert werden,
  sucht der Algorithmus automatisch die zeitlich nächstgelegene Alternative im selben
  Jahr; ist keine Alternative möglich, wird der Wunsch als „nicht erfüllbar“ markiert
  und begründet.
- **Visualisierung**: Kalenderwochen-Raster je Mitarbeiter sowie eine Detailtabelle mit
  Status je Wunsch (wie gewünscht / Alternative inkl. Verschiebung / nicht erfüllbar).
- **Import/Export** der kompletten Planungsdaten als JSON-Datei (Backup, Weitergabe,
  Wechsel des Geräts/Browsers).
- **Excel- und PDF-Export** des berechneten Urlaubsplans (Wochenraster, Detailtabelle je
  Wunsch und Hinweise), z. B. zum Aushängen oder Weiterleiten an die Personalabteilung.
  Beide Exporte laufen vollständig im Browser, ohne Server-Aufruf.

## Entwicklung im Devcontainer

Dieses Repository enthält eine [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json)
mit Node.js 20. In VS Code: „Dev Containers: Reopen in Container“ auswählen – Abhängigkeiten
werden automatisch installiert (`npm install`).

Danach stehen die üblichen Skripte zur Verfügung:

```bash
npm run dev      # Entwicklungsserver (http://localhost:5173)
npm run build    # Produktions-Build (tsc + vite build) nach dist/
npm run preview  # Produktions-Build lokal ansehen
npm test         # Unit-Tests für den Planungsalgorithmus (vitest)
npm run lint     # Linting (oxlint)
```

## Architektur

- [src/types.ts](src/types.ts) – zentrale Datenmodelle (Employee, VacationRequest, Constraints, …)
- [src/solver/solver.ts](src/solver/solver.ts) – der eigentliche Planungsalgorithmus
  (mehrere Verarbeitungsreihenfolgen werden durchprobiert, das beste Ergebnis wird gewählt)
- [src/store/PlanningContext.tsx](src/store/PlanningContext.tsx) – React-Context/Reducer
  für den Anwendungszustand inkl. automatischem Speichern in `localStorage`
- [src/store/persistence.ts](src/store/persistence.ts) – localStorage- sowie JSON-Import/Export-Logik
- [src/export/excelExport.ts](src/export/excelExport.ts) – Excel-Export des Plans (`exceljs`)
- [src/export/pdfExport.ts](src/export/pdfExport.ts) – PDF-Export des Plans (`jspdf` + `jspdf-autotable`)
- [src/components/](src/components) – UI-Komponenten (Mitarbeiter, Urlaubswünsche,
  Einstellungen, Planungsansicht)

## Deployment

Da die App vollständig clientseitig läuft, genügt für das Hosting ein einfacher
statischer Webserver: `npm run build` erzeugt einen `dist/`-Ordner, der z. B. via
GitHub Pages, Netlify, ein internes Intranet-Verzeichnis o. Ä. bereitgestellt werden kann.
