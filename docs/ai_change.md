# Éditions IA - Comment l'IA Modifie le Modèle

## Vue d'Ensemble

L'IA peut modifier le modèle de plusieurs manières, allant d'éditions atomiques (un seul champ) à des modifications structurelles complètes (ajout/suppression d'entités).

```
┌────────────────────────────────────────────────────────────────┐
│                    Niveaux d'Édition                            │
│                                                                 │
│  ┌─────────────┐                                               │
│  │   Champ     │  Ex: initial, coef, min, max                  │
│  │  (Atomique) │  ➜ Modifie une seule valeur                   │
│  └──────┬──────┘                                               │
│         │                                                       │
│  ┌──────▼──────┐                                               │
│  │ Composant   │  Ex: ajout/suppression component              │
│  │ (Structurel)│  ➜ Touche une entité                          │
│  └──────┬──────┘                                               │
│         │                                                       │
│  ┌──────▼──────┐                                               │
│  │  Entité     │  Ex: ajout/suppression entité                 │
│  │  (Global)   │  ➜ Touche plusieurs composants                │
│  └──────┬──────┘                                               │
│         │                                                       │
│  ┌──────▼──────┐                                               │
│  │  Modèle     │  Ex: régénération complète                    │
│  │  (Complet)  │  ➜ Remplace tout le JSON                      │
│  └─────────────┘                                               │
└────────────────────────────────────────────────────────────────┘
```

---

## 1. Types d'Actions IA

| Action | Scope | Impact |
|--------|-------|--------|
| `modify` | Atomique | Un seul champ |
| `add_influence` | Composant | Un composant + sa relation |
| `remove_influence` | Composant | Un composant |
| `add_component` | Entité | Une entité |
| `remove_component` | Entité | Une entité + influences liées |
| `add_entity` | Global | Plusieurs composants |
| `remove_entity` | Global | Tout le sous-arbre + références |

---

## 2. Modification Atomique (Champ)

### Ce qui est touché

```
SystemModel
├── entities
│   └── [EntityName]
│       └── components
│           └── [ComponentName]
│               └── ✏️ initial / min / max / type
```

### Exemple: Modifier `initial`

**Requête utilisateur**: "Augmente le budget de 50%"

**Action générée**:
```json
{
  "type": "modify",
  "target": "Entreprise.budget",
  "details": {
    "field": "initial",
    "oldValue": 100000,
    "newValue": 150000
  }
}
```

**Code d'exécution** (AIChatPanel.tsx):
```typescript
case 'modify': {
    const targetPath = details?.target || target;
    const [entityName, compName] = targetPath.split('.');
    
    // Clone le modèle
    const newModel = JSON.parse(JSON.stringify(model));
    
    // Modifie uniquement le champ ciblé
    if (details?.initial !== undefined) {
        newModel.entities[entityName].components[compName].initial = details.initial;
    }
    
    setModel(newModel);
    break;
}
```

### Impact
- ✅ UN seul champ modifié
- ✅ Pas d'effet sur les autres entités
- ✅ Les influences restent intactes

---

## 3. Modification d'Influence

### Ce qui est touché

```
SystemModel
├── entities
│   └── [EntityName]
│       └── components
│           └── [ComponentName]
│               └── influences[]
│                   └── ✏️ {from, coef, kind, function, enabled}
```

### Ajout d'Influence

**Requête**: "Ajoute une influence de Marketing.budget vers Ventes.revenus"

**Action**:
```json
{
  "type": "add_influence",
  "target": "Ventes.revenus",
  "details": {
    "influence": {
      "from": "Marketing.budget",
      "coef": 0.15,
      "kind": "positive",
      "function": "linear",
      "enabled": true
    }
  }
}
```

**Code d'exécution**:
```typescript
case 'add_influence': {
    const targetComponent = details?.target || target;
    addInfluence(targetComponent, {
        from: details.source,
        coef: details.coef ?? 0.1,
        kind: details.kind || 'positive',
        function: details.function || 'linear',
        enabled: true
    });
    break;
}
```

### Impact
- ✅ Modifie UN composant (sa liste influences)
- ✅ Le composant source n'est PAS modifié
- ⚠️ Doit vérifier que source existe

### Suppression d'Influence

**Code**:
```typescript
case 'remove_influence': {
    const targetComponent = details?.target || target;
    const sourceComponent = details?.source;
    
    const [entityName, compName] = targetComponent.split('.');
    const comp = model.entities[entityName]?.components[compName];
    
    // Trouve l'index de l'influence
    const influenceIndex = comp.influences.findIndex(
        inf => inf.from === sourceComponent
    );
    
    if (influenceIndex >= 0) {
        removeInfluence(targetComponent, influenceIndex);
    }
    break;
}
```

---

## 4. Modification de Composant

### Ce qui est touché

```
SystemModel
├── entities
│   └── [EntityName]
│       └── components
│           ├── ✏️ [NewComponentName]: {...}  ← AJOUT
│           └── ❌ [OldComponentName]          ← SUPPRESSION
```

### Ajout de Composant

**Requête**: "Ajoute un composant 'moral' à Employes"

**Action**:
```json
{
  "type": "add_component",
  "target": "Employes.moral",
  "details": {
    "entity": "Employes",
    "name": "moral",
    "type": "state",
    "initial": 0.7,
    "min": 0,
    "max": 1,
    "influences": []
  }
}
```

**Code d'exécution**:
```typescript
case 'add_component': {
    let entityName = details?.entity;
    let componentName = details?.name;
    
    // Créer l'entité si elle n'existe pas
    if (!model?.entities[entityName]) {
        addEntity(entityName, `Entity for ${componentName}`);
    }
    
    const componentData = {
        type: details?.type || 'state',
        initial: details?.initial ?? 100,
        min: details?.min ?? null,
        max: details?.max ?? null,
        influences: details?.influences || []
    };
    
    addComponent(entityName, componentName, componentData);
    break;
}
```

### Impact
- ✅ Modifie UNE entité
- ✅ Autres entités inchangées
- ⚠️ Peut créer l'entité parente si inexistante

### Suppression de Composant

**⚠️ Effets en cascade**:

```
Avant:
Ventes.revenus ──influence──► Entreprise.budget
                              ▲
                              │ influence
Marketing.depenses ───────────┘

Suppression de Entreprise.budget:
- Le composant est supprimé
- Les influences VERS ce composant sont supprimées
- Les influences DEPUIS ce composant dans d'AUTRES composants
  deviennent invalides (références cassées)
```

**Code**:
```typescript
removeComponent: (entityName, componentName) => {
    const { model } = get();
    if (!model?.entities[entityName]?.components[componentName]) return;
    
    const newModel = JSON.parse(JSON.stringify(model));
    
    // Supprime le composant
    delete newModel.entities[entityName].components[componentName];
    
    // IMPORTANT: Nettoyer les références dans d'autres composants
    const removedPath = `${entityName}.${componentName}`;
    Object.values(newModel.entities).forEach(entity => {
        Object.values(entity.components).forEach(comp => {
            comp.influences = comp.influences.filter(
                inf => inf.from !== removedPath
            );
        });
    });
    
    set({ model: newModel });
}
```

---

## 5. Modification d'Entité

### Ce qui est touché

```
SystemModel
├── entities
│   ├── ✏️ [NewEntityName]: {components: {...}}  ← AJOUT
│   └── ❌ [OldEntityName]                        ← SUPPRESSION
```

### Ajout d'Entité

**Requête**: "Ajoute une entité Fournisseur avec composants stock et qualite"

**Action**:
```json
{
  "type": "add_entity",
  "target": "Fournisseur",
  "details": {
    "name": "Fournisseur",
    "components": {
      "stock": {
        "type": "state",
        "initial": 5000,
        "min": 0,
        "max": 50000,
        "influences": []
      },
      "qualite": {
        "type": "state",
        "initial": 0.8,
        "min": 0,
        "max": 1,
        "influences": []
      }
    }
  }
}
```

**Code**:
```typescript
case 'add_entity': {
    const entityName = details?.name || target;
    addEntity(entityName, details?.description);
    
    // Si des composants sont fournis, les ajouter
    if (details?.components) {
        Object.entries(details.components).forEach(([compName, comp]) => {
            addComponent(entityName, compName, comp);
        });
    }
    break;
}
```

### Impact
- ✅ Crée une nouvelle branche dans le modèle
- ✅ N'affecte PAS les entités existantes
- ✅ Pas d'influences créées (aucune connexion)

### Suppression d'Entité

**⚠️ Effets en cascade MAJEURS**:

```
Suppression de "Marketing":

1. Tous les composants de Marketing sont supprimés
2. Toutes les influences VERS Marketing.* sont supprimées
3. Toutes les influences DEPUIS Marketing.* sont supprimées
   des autres entités
```

**Code**:
```typescript
removeEntity: (name) => {
    const { model } = get();
    if (!model?.entities[name]) return;
    
    const newModel = JSON.parse(JSON.stringify(model));
    
    // Supprimer l'entité
    delete newModel.entities[name];
    
    // Nettoyer TOUTES les références dans le reste du modèle
    Object.values(newModel.entities).forEach(entity => {
        Object.values(entity.components).forEach(comp => {
            comp.influences = comp.influences.filter(
                inf => !inf.from.startsWith(`${name}.`)
            );
        });
    });
    
    set({ model: newModel });
}
```

---

## 6. Remplacement Complet du Modèle

### Quand utilisé

- Régénération via `/generate`
- Import d'un fichier JSON
- Réponse IA avec `modelUpdates` complet

### Impact

- ❌ TOUT le modèle est remplacé
- ❌ Historique de simulation perdu
- ❌ Sélection courante réinitialisée

**Code**:
```typescript
setModel: (model) => {
    // Initialise toutes les variables
    const allPaths = getAllVariablePaths(model);
    set({ model, simulationIncludedVars: allPaths });
    saveModelToStorage(model);
}
```

---

## 7. Analyse d'Impact Avant Modification

### Endpoint `/ai-edit/analyze`

Permet d'analyser l'impact AVANT d'appliquer une modification.

**Requête**:
```json
{
  "model": {...},
  "target": "Entreprise.budget",
  "instruction": "Doubler le budget"
}
```

**Réponse**:
```json
{
  "success": true,
  "proposal": {
    "changes": [
      {
        "target": "Entreprise.budget",
        "field": "initial",
        "oldValue": 100000,
        "newValue": 200000,
        "reason": "Doublement demandé"
      }
    ],
    "requiresOtherChanges": true,
    "otherChanges": [
      {
        "target": "Entreprise.effectif",
        "description": "Augmenter proportionnellement",
        "reason": "Budget doublé implique capacité d'embauche"
      },
      {
        "target": "Entreprise.depenses",
        "description": "Ajuster les plafonds",
        "reason": "Cohérence avec nouveau budget"
      }
    ]
  }
}
```

### Workflow avec Validation

```
User: "Double le budget"
         │
         ▼
┌────────────────────┐
│ POST /ai-edit/     │
│     analyze        │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Afficher proposal  │
│ avec impacts       │
└─────────┬──────────┘
          │
    ┌─────┴─────┐
    │ Confirm?  │
    └─────┬─────┘
     Yes  │  No
     │    │   └──▶ Annuler
     ▼
┌────────────────────┐
│ Appliquer changes  │
└────────────────────┘
```

---

## 8. Tableau Récapitulatif des Impacts

| Action | Entité cible | Autres entités | Influences | Simulation |
|--------|--------------|----------------|------------|------------|
| `modify` (champ) | ✅ Modifiée | ❌ Intactes | ❌ Intactes | ⚠️ Recalcul |
| `add_influence` | ✅ Modifiée | ❌ Intactes | ✅ +1 | ⚠️ Nouvelles connexions |
| `remove_influence` | ✅ Modifiée | ❌ Intactes | ✅ -1 | ⚠️ Connexion perdue |
| `add_component` | ✅ Modifiée | ❌ Intactes | ❌ Aucune | ⚠️ +1 variable |
| `remove_component` | ✅ Modifiée | ⚠️ Nettoyage refs | ✅ Cascade | ⚠️ -1 variable + refs |
| `add_entity` | ✅ Nouvelle | ❌ Intactes | ❌ Aucune | ⚠️ +N variables |
| `remove_entity` | ❌ Supprimée | ⚠️ Nettoyage refs | ✅ Cascade | ⚠️ -N variables |
| Régénération | ❌ TOUT | ❌ TOUT | ❌ TOUT | ❌ Reset |

### Légende

- ✅ Modification directe
- ⚠️ Effet secondaire à considérer
- ❌ Non affecté / Reset

---

## 9. Bonnes Pratiques

### Pour les Modifications Atomiques

```typescript
// ✅ BON: Clone profond avant modification
const newModel = JSON.parse(JSON.stringify(model));
newModel.entities.X.components.Y.initial = 100;
setModel(newModel);

// ❌ MAUVAIS: Modification directe (mutabilité)
model.entities.X.components.Y.initial = 100;
```

### Pour les Suppressions

```typescript
// ✅ BON: Nettoyer les références
removeComponent(entityName, compName) {
    // 1. Supprimer le composant
    delete newModel.entities[entityName].components[compName];
    
    // 2. Nettoyer toutes les références
    cleanupInfluenceReferences(newModel, `${entityName}.${compName}`);
}
```

### Pour les Ajouts avec Influences

```typescript
// ✅ BON: Vérifier que les sources existent
addComponent(entity, name, {
    influences: [
        { from: "Autre.comp", ... }  // Vérifier que Autre.comp existe
    ]
});
```

---

## 10. Exemple Complet de Session

```
User: "Ajoute une entité RH avec effectif et satisfaction"

IA Actions:
1. add_entity("RH")
2. add_component("RH", "effectif", {type: "state", initial: 50})
3. add_component("RH", "satisfaction", {type: "state", initial: 0.7})

État après: 
- Nouvelle entité RH avec 2 composants
- Pas d'influences (isolée)

User: "Connecte RH.satisfaction à Entreprise.productivite"

IA Actions:
1. add_influence("Entreprise.productivite", {
     from: "RH.satisfaction",
     coef: 0.3,
     kind: "positive"
   })

État après:
- Entreprise.productivite a une nouvelle influence
- RH.satisfaction N'EST PAS modifié (source seulement)

User: "Supprime RH"

IA Actions:
1. remove_entity("RH")

État après:
- RH complètement supprimée
- L'influence de RH.satisfaction vers Entreprise.productivite
  est automatiquement nettoyée
```
