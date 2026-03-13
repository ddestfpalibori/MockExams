# Deployment Reports — MockExams

Ce dossier contient les rapports de certification pour chaque déploiement en production.

## Convention de nommage

```
YYYYMMDD-<scope>-<type>.md
```

Exemples :
- `20260313-audit-corrections-certification.md`
- `20260320-sprint-4-deployment.md`
- `20260401-hotfix-rls-certification.md`

## Index

| Date | Rapport | Commit | Statut |
|------|---------|--------|--------|
| 2026-03-13 | [Corrections audit externe — 8 bugs](./20260313-audit-corrections-certification.md) | `9cda4ff` | ✅ Certifié |

## Structure d'un rapport

Chaque rapport doit contenir :
1. **Résumé exécutif** — tableau récapitulatif
2. **Corrections appliquées** — fichiers + validation
3. **Migrations & secrets** — checklist déploiement
4. **Validation technique** — build + SQL + tests
5. **Risques résiduels** — impact + mitigation
6. **Prochaines étapes** — court / moyen / long terme
