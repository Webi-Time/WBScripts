# 📜 Scripts PowerShell de Webi-Time

Les scripts disponibles dans ce dépôt GitHub ont été développés dans le cadre de diverses missions professionnelles et sont continuellement améliorés en fonction des retours et des évolutions technologiques. Chaque script est conçu pour une tâche spécifique, mais des ajustements peuvent être nécessaires pour les utiliser dans d'autres environnements.

**⚠️ Responsabilité d'utilisation** : L'utilisateur est entièrement responsable de l'utilisation de ces scripts. Bien que je m'efforce d'assurer leur qualité et leur fiabilité, des erreurs peuvent persister.

## 📚 Documentation annexe

Il est important de noter que **tous les scripts nécessitent l'installation et l'utilisation du module générique** pour fonctionner correctement. Ce module permet d'assurer la compatibilité et d'offrir des fonctionnalités communes à tous les scripts. Avant d'exécuter un script, assurez-vous d'avoir suivi les étapes pour installer ce module. Vous trouverez plus d'informations dans la documentation ci-dessous :

- **[Configuration JSON](ReadMe-JSON-File.md)** : Guide sur les fichiers de configuration JSON utilisés par les scripts pour personnaliser leurs comportements.
- **[Installation du Module Générique](ReadMe-Modules-Installation.md)** : Instructions complètes pour installer le module générique indispensable à l'exécution des scripts et garantir la compatibilité avec votre environnement PowerShell.

## ⚙️ Liste des Scripts

Voici une vue d'ensemble des scripts disponibles dans ce dépôt. Chaque script est accompagné d'une documentation détaillée pour vous aider à comprendre et à utiliser les fonctionnalités spécifiques :

| Script | Description |
| --- | --- |
| [.Template-MsGraph.ps1](/PowerShell/Scripts/.Template-MsGraph/.Template-MsGraph.ps1) | Modèle de script pour interagir avec l'API Microsoft Graph. [Read More](/PowerShell/Documentation/.Template-MsGraph/Readme.md) |
| [Add-CompagnyUsers.ps1](/PowerShell/Scripts/Add-CompagnyUsers/Add-CompagnyUsers.ps1) | Créer des utilisateurs dans Active Directory a l'aide d'un fichier CSV. [Read More](/PowerShell/Documentation/Add-CompagnyUsers/Readme.md) |
| [Check-AADLastSynchronisation.ps1](/PowerShell/Scripts/Check-AADLastSynchronisation/Check-AADLastSynchronisation.ps1) | Vérifie la dernière synchronisation Azure AD. [Read More](/PowerShell/Documentation/Check-AADLastSynchronisation/Readme.md) |
| [Check-AzureAppsCredExpiration.ps1](/PowerShell/Scripts/Check-AzureAppsCredExpiration/Check-AzureAppsCredExpiration.ps1) | Vérifie les dates d'expiration des informations d'identification des applications Azure. [Read More](/PowerShell/Documentation/Check-AzureAppsCredExpiration/Readme.md) |
| [Check-BitLocker.ps1](/PowerShell/Scripts/Check-BitLocker/Check-BitLocker.ps1) | Vérifie l'état de BitLocker sur les ordinateurs. [Read More](/PowerShell/Documentation/Check-BitLocker/Readme.md) |
| [Check-MailBoxSize.ps1](/PowerShell/Scripts/Check-MailBoxSize/Check-MailBoxSize.ps1) | Vérifie la taille des boîtes aux lettres. [Read More](/PowerShell/Documentation/Check-MailBoxSize/Readme.md) |
| [Check-WBDisabledUsersTime.ps1](/PowerShell/Scripts/Check-WBDisabledUsersTime/Check-WBDisabledUsersTime.ps1) | Vérifie les utilisateurs désactivés dans AD et génère des rapports. [Read More](/PowerShell/Documentation/Check-WBDisabledUsersTime/Readme.md) |
| [Disable-WBInactiveUsers.ps1](/PowerShell/Scripts/Disable-WBInactiveUsers/Disable-WBInactiveUsers.ps1) | Désactive automatiquement les utilisateurs inactifs dans AD en fonction des critères définis. [Read More](/PowerShell/Documentation/Disable-WBInactiveUsers/Readme.md) |
| [Repair-WBADObjectsOwner.ps1](/PowerShell/Scripts/Repair-WBADObjectsOwner/Repair-WBADObjectsOwner.ps1) | Corrige les propriétaires incorrects des objets dans AD. [Read More](/PowerShell/Documentation/Repair-WBADObjectsOwner/Readme.md) |
| [Repair-WBADSysvolFilesOwner.ps1](/PowerShell/Scripts/Repair-WBADSysvolFilesOwner/Repair-WBADSysvolFilesOwner.ps1) | Répare les permissions et les propriétaires des fichiers dans le dossier SYSVOL. [Read More](/PowerShell/Documentation/Repair-WBADSysvolFilesOwner/Readme.md) |
| [Run-WBPingCastle.ps1](/PowerShell/Scripts/Run-WBPingCastle/Run-WBPingCastle.ps1) | Automatisation des analyses PingCastle pour détecter et corriger les vulnérabilités de sécurité dans Active Directory. [Read More](/PowerShell/Documentation/Run-WBPingCastle/Readme.md) |
| [Start-ConnectTenant.ps1](/PowerShell/Scripts/Start-ConnectTenant/Start-ConnectTenant.ps1) | Établit et gère la connexion au locataire Microsoft. [Read More](/PowerShell/Documentation/Start-ConnectTenant/Readme.md) |
|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
## ❓ Besoin d'aide ?

Si vous avez des questions concernant l'installation ou l'utilisation du module générique, ou si vous rencontrez des problèmes avec l'un des scripts, n'hésitez pas à me contacter. Je serai ravi de vous aider à tirer le meilleur parti de ces outils.

Merci d'utiliser mes scripts, et bonne automatisation ! 🚀