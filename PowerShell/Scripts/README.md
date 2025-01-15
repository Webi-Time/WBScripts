
# Collection de scripts PowerShell
Ce document regroupe une collection de scripts classés par catégories pour faciliter la gestion, la configuration, la création et la maintenance des environnements informatiques.

# 🛠️ Création

# 📜 Configuration

# 🛡️ Maintenance et Contrôle Opérationnel (MCO/MCS)

## 🌐 Active Directory Domain Services

### 🔑 Gestion des Objets AD
| Script | Description 
| -- | -- | 


### 👤 Gestion des Comptes
| Script | Description 
| -- | -- | 
| **[Add-CompagnyUsers.ps1](/PowerShell/Scripts/Add-CompagnyUsers/Add-CompagnyUsers.ps1)** | Créer des utilisateurs dans Active Directory a l'aide d'un fichier CSV. [Read More](/PowerShell/Documentation/Add-CompagnyUsers/ReadMe.md) |
| **[Check-WBDisabledUsersTime.ps1](/PowerShell/Scripts/Check-WBDisabledUsersTime/Check-WBDisabledUsersTime.ps1)** | Ce script vérifie les utilisateurs désactivés dans Active Directory pour générer un rapport sur les utilisateurs désactivés depuis longtemps ou ceux sans informations de désactivation [Read More](/PowerShell/Documentation/Check-WBDisabledUsersTime/ReadMe.md)|
| **[Disable-WBInactiveUsers.ps1](/PowerShell/Scripts/Disable-WBInactiveUsers/Disable-WBInactiveUsers.ps1)** | Vérifie et désactive automatiquement les utilisateurs dans Active Directory en fonction de critères tels que l'expiration des mots de passe ou l'inactivité. [Read More](/PowerShell/Documentation/Disable-WBInactiveUsers/ReadMe.md) |

### 🔒 Sécurité
| Script | Description 
| -- | -- | 
| **[Repair-WBADObjectsOwner.ps1](/PowerShell/Scripts/Repair-WBADObjectsOwner/Repair-WBADObjectsOwner.ps1)** | Répare les propriétaires des objets Active Directory qui ont des configurations incorrectes. [Read More](/PowerShell/Documentation/Repair-WBADObjectsOwner/ReadMe.md) |
| **[Repair-WBADSysvolFilesOwner.ps1](/PowerShell/Scripts/Repair-WBADSysvolFilesOwner/Repair-WBADSysvolFilesOwner.ps1)** | Corrige les problèmes de permissions ou de propriétaires sur les fichiers SYSVOL. [Read More](/PowerShell/Documentation/Repair-WBADSysvolFilesOwner/ReadMe.md) |
| **[Run-WBPingCastle.ps1](/PowerShell/Scripts/Run-WBPingCastle/Run-WBPingCastle.ps1)** | Le script automatise l'exécution de l'outil PingCastle pour générer un rapport de vérification de l'état de Active Directory. [Read More](/PowerShell/Documentation/Run-WBPingCastle/ReadMe.md)|
| **[Check-WBBitLocker.ps1](/PowerShell/Scripts/Check-WBBitLocker/Check-WBBitLocker.ps1)** | Vérifie l'état de BitLocker des ordinateurs dans Active Directory et genere un rapport pour les clés de récupération manquantes. [Read More](/PowerShell/Documentation/Check-WBBitLocker/ReadMe.md)|


## ☁️ Azure

### 🛡️ Administration
| Script | Description 
| -- | -- | 
| **[Start-WBConnectTenant.ps1](/PowerShell/Scripts/Start-WBConnectTenant/Start-WBConnectTenant.ps1)** | Se connecte à un tenant de l'API Microsoft Graph et fournit une interface basée sur un menu pour interagir avec le tenant. Il est possible de rester connecté afin d'exécuter des commandes supplémentaires. [Read More](/PowerShell/Documentation/Start-WBConnectTenant/ReadMe.md)|
| **[Check-WBAzureAppsCredExpiration.ps1](/PowerShell/Scripts/Check-WBAzureAppsCredExpiration/Check-WBAzureAppsCredExpiration.ps1)** | Vérifie et rapporte l'état d'expiration des identifiants des applications Azure et envoie des alertes par e-mail pour les identifiants expirés ou arrivant à expiration. [Read More](/PowerShell/Documentation/Check-WBAzureAppsCredExpiration/ReadMe.md) |


### 🌐 Hybride
| Script | Description 
| -- | -- | 
| **[Check-WBAADLastSynchronisation.ps1](/PowerShell/Scripts/Check-WBAADLastSynchronisation/Check-WBAADLastSynchronisation.ps1)** | Vérifie l'état de synchronisation d'Azure AD et envoie des alertes en cas de rupture ou d'interruption. [Read More](/PowerShell/Documentation/Check-WBAADLastSynchronisation/ReadMe.md) |


### 💼 Office 365
| Script | Description 
| -- | -- | 
| **[Check-WBMailBoxSize.ps1](/PowerShell/Scripts/Check-WBMailBoxSize/Check-WBMailBoxSize.ps1)** | Vérifie la taille des boîtes aux lettres des utilisateurs et envoie des alertes par e-mail pour celles dépassant un seuil spécifié. [Read More](/PowerShell/Documentation/Check-WBMailBoxSize/ReadMe.md)| 


### 📂 Autres
| Script | Description 
| -- | -- | 
| **[.Template-MsGraph.ps1](/PowerShell/Scripts/.Template-MsGraph/.Template-MsGraph.ps1)** | Modèle de script pour interagir avec l'API Microsoft Graph. [Read More](/PowerShell/Documentation/.Template-MsGraph/ReadMe.md) |

---

Ce guide a pour objectif de centraliser et de simplifier l’accès aux scripts indispensables à l’administration moderne des environnements IT.







