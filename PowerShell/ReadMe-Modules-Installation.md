# 🛠️ Installation du Module Générique

Pour assurer le bon fonctionnement de vos scripts PowerShell, il est crucial d’installer le module générique à un emplacement approprié. Le module doit être disponible dans l’un des répertoires suivants avant d'exécuter les scripts :

- **Pour tous les utilisateurs (ordinateur)** : `C:\WINDOWS\system32\WindowsPowerShell\v1.0\Modules`
- **Pour un utilisateur spécifique** : `C:\Users\<UTILISATEUR>\Documents\WindowsPowerShell\Modules`

## 🔢 Choix de la Version

Avant l’installation, choisissez la derniere version du module, cependant, si vous aviez utilisé un script par le passé la liste des versions est disponble :

- **Version 1.0.0** : Version initiale du module.
- **Version 1.1.0** : Mise à jour mineure avec des améliorations et corrections de bugs.
- **Version 2.0.0** : Version majeure avec de nouvelles fonctionnalités et modifications importantes.

## 📥 Installation du Module

Pour installer le module, vous pouvez créer un lien symbolique vers le répertoire du module. Cette méthode assure que les fichiers du module sont correctement référencés sans avoir à les copier manuellement dans les répertoires de PowerShell. Ou bien, coller le repertoire directement.

### 👥 Lien Symbolique pour Tous les Utilisateurs

Si vous souhaitez que le module soit disponible pour tous les utilisateurs sur l’ordinateur, utilisez la commande suivante pour créer un lien symbolique :

```powershell
# Nouveau lien symbolique vers le module générique
New-Item -Path "C:\WINDOWS\system32\WindowsPowerShell\v1.0\Modules\ModuleGenerics" -ItemType SymbolicLink -Target "\\serveur.domain.adds\<Partage>\ModuleGenerics\"
# Ou, pour un chemin local
New-Item -Path "C:\WINDOWS\system32\WindowsPowerShell\v1.0\Modules\ModuleGenerics" -ItemType SymbolicLink -Target '\<Chemin Local>\ModuleGenerics\'
```
⚠️ **Attention** : Vous devez disposer de droits administratifs pour créer des **liens symboliques**, peut importe le repertoire.

### 👤 Lien Symbolique pour un Utilisateur Unique
Pour que le module soit disponible uniquement pour un utilisateur spécifique, utilisez la commande suivante :

```powershell
# Nouveau lien symbolique vers le module générique pour un utilisateur spécifique
New-Item -Path "C:\Users\<UTILISATEUR>\Documents\WindowsPowerShell\Modules\ModuleGenerics" -ItemType SymbolicLink -Target '<Chemin Local>\ModuleGenerics\'
```
Si vous ne disposez pas des droits administrateur. Il faudra coller le dossier directement, sans utiliser de **SymbolicLink**

## 📌 Remarques Importantes

- Remplacez `<UTILISATEUR>`, `<Partage>`, et `<Chemin Local>` par les valeurs appropriées pour votre environnement.


En suivant ces étapes, vous garantissez que le module générique est installé correctement et disponible pour vos scripts PowerShell. Cela simplifie la gestion des modules et assure une utilisation cohérente à travers vos projets.